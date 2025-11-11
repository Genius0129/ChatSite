import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { RedisService } from '../redis/redis.service';
import { StatsService } from '../stats/stats.service';
import { createAdapter } from '@socket.io/redis-adapter';

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      // Allow all origins for development (restrict in production)
      const allowedPatterns = [
        /^http:\/\/localhost:3000$/,
        /^https:\/\/localhost:3000$/,
        /^http:\/\/127\.0\.0\.1:3000$/,
        /^https:\/\/127\.0\.0\.1:3000$/,
        /^http:\/\/192\.168\.\d+\.\d+:3000$/,
        /^https:\/\/192\.168\.\d+\.\d+:3000$/,
        /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,
        /^https:\/\/10\.\d+\.\d+\.\d+:3000$/,
        /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:3000$/,
        /^https:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:3000$/,
      ];
      
      if (!origin) {
        callback(null, true);
        return;
      }
      
      const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
      callback(null, isAllowed);
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private chatService: ChatService,
    private redisService: RedisService,
    private statsService: StatsService,
  ) {
    // Use Redis adapter for multi-server support (if Redis is available)
    try {
      const pubClient = this.redisService.getPubClient();
      const subClient = this.redisService.getSubClient();
      if (pubClient && subClient) {
        this.server.adapter(createAdapter(pubClient, subClient));
        console.log('✅ Redis adapter enabled for multi-server support');
      } else {
        console.warn('⚠️  Redis not available. Running in single-server mode.');
      }
    } catch (error) {
      console.warn('⚠️  Redis adapter failed. Running in single-server mode.', error.message);
    }
  }

  async onModuleInit() {
    // Start periodic cleanup of stale rooms (every 30 seconds)
    this.cleanupInterval = setInterval(async () => {
      await this.cleanupStaleRooms();
    }, 30000); // 30 seconds
    console.log('✅ Started periodic room cleanup (every 30 seconds)');
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clean up stale rooms where one or both sockets are no longer connected
   */
  private async cleanupStaleRooms() {
    if (!this.server) return;

    try {
      // Get all active rooms from stats service
      const activeRooms = this.statsService.getActiveRooms();
      if (!activeRooms || activeRooms.size === 0) return;

      let cleanedCount = 0;
      const connectedSockets = this.server.sockets.sockets;

      // Check each room
      for (const roomId of activeRooms.keys()) {
        const room = await this.redisService.getRoom(roomId);
        if (!room) {
          // Room doesn't exist in Redis but is tracked in stats - remove it
          console.log(`🧹 Cleaning up orphaned room from stats: ${roomId}`);
          this.statsService.removeFromRoom(roomId);
          cleanedCount++;
          continue;
        }

        // Check if both sockets are still connected
        const socket1Connected = connectedSockets.has(room.socketId1);
        const socket2Connected = connectedSockets.has(room.socketId2);

        // Check if sockets are still in this room
        const socket1Room = await this.redisService.getSocketRoom(room.socketId1);
        const socket2Room = await this.redisService.getSocketRoom(room.socketId2);

        const socket1InRoom = socket1Room === roomId;
        const socket2InRoom = socket2Room === roomId;

        // If both sockets are disconnected, or neither is in the room anymore, clean up
        if ((!socket1Connected && !socket2Connected) || (!socket1InRoom && !socket2InRoom)) {
          console.log(`🧹 Cleaning up stale room: ${roomId} (socket1: ${socket1Connected ? 'connected' : 'disconnected'}, socket2: ${socket2Connected ? 'connected' : 'disconnected'})`);
          
          // Notify any still-connected partner
          if (socket1Connected && socket1InRoom) {
            const socket1 = connectedSockets.get(room.socketId1);
            if (socket1) {
              socket1.emit('partner-disconnected');
            }
          }
          if (socket2Connected && socket2InRoom) {
            const socket2 = connectedSockets.get(room.socketId2);
            if (socket2) {
              socket2.emit('partner-disconnected');
            }
          }

          // Clean up room
          await this.redisService.deleteRoom(roomId);
          this.statsService.removeFromRoom(roomId);
          cleanedCount++;
        } else if (!socket1Connected && socket2Connected && socket2InRoom) {
          // Socket1 disconnected but socket2 is still connected - clean up
          console.log(`🧹 Cleaning up room with disconnected socket1: ${roomId}`);
          const socket2 = connectedSockets.get(room.socketId2);
          if (socket2) {
            socket2.emit('partner-disconnected');
          }
          await this.redisService.deleteRoom(roomId);
          this.statsService.removeFromRoom(roomId);
          cleanedCount++;
        } else if (!socket2Connected && socket1Connected && socket1InRoom) {
          // Socket2 disconnected but socket1 is still connected - clean up
          console.log(`🧹 Cleaning up room with disconnected socket2: ${roomId}`);
          const socket1 = connectedSockets.get(room.socketId1);
          if (socket1) {
            socket1.emit('partner-disconnected');
          }
          await this.redisService.deleteRoom(roomId);
          this.statsService.removeFromRoom(roomId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`✅ Cleaned up ${cleanedCount} stale room(s)`);
        await this.statsService.broadcastStats(this.server);
      }
    } catch (error) {
      console.error('❌ Error during stale room cleanup:', error);
    }
  }

  async handleConnection(client: Socket) {
    const ip = client.handshake.address;
    const totalConnections = this.server.sockets.sockets.size;
    console.log(`✅ Client connected: ${client.id} from ${ip} (Total: ${totalConnections} connections)`);

    // Check if IP is banned
    const isBanned = await this.redisService.isIPBanned(ip);
    if (isBanned) {
      client.emit('error', { message: 'Your IP has been banned' });
      client.disconnect();
      return;
    }

    // Track connected socket
    await this.redisService.addConnectedSocket(client.id);
    this.statsService.addConnectedSocket(client.id);
    await this.statsService.broadcastStats(this.server);

    // Send WebRTC configuration
    const stunServers = this.chatService.getSTUNServers();
    const turnConfig = this.chatService.getTURNConfig();
    
    client.emit('webrtc-config', {
      iceServers: [
        ...stunServers.map(url => ({ urls: url })),
        ...(turnConfig ? [turnConfig] : []),
      ],
    });
  }

  async handleDisconnect(client: Socket) {
    console.log(`❌ Client disconnected: ${client.id}`);

    // Remove from queue
    await this.redisService.removeFromQueue(client.id);
    this.statsService.removeFromWaitingQueue(client.id);

    // Get room and notify partner
    const roomId = await this.redisService.getSocketRoom(client.id);
    if (roomId) {
      const room = await this.redisService.getRoom(roomId);
      if (room) {
        const partnerId = room.socketId1 === client.id ? room.socketId2 : room.socketId1;
        const partnerSocket = this.server.sockets.sockets.get(partnerId);
        if (partnerSocket) {
          partnerSocket.emit('partner-disconnected');
        }
        await this.redisService.deleteRoom(roomId);
        this.statsService.removeFromRoom(roomId);
      }
    }

    // Remove from connected sockets
    await this.redisService.removeConnectedSocket(client.id);
    this.statsService.removeConnectedSocket(client.id);
    await this.statsService.broadcastStats(this.server);
  }

  @SubscribeMessage('find-match')
  async handleFindMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { interests?: string[] },
  ) {
    const interests = data.interests || [];
    console.log(`🔍 ${client.id} looking for match with interests:`, interests);

    // Add to queue
    await this.redisService.addToQueue(client.id, interests);
    this.statsService.addToWaitingQueue(client.id);

    // Try to find a match
    const matchId = await this.chatService.findMatch(client.id, interests);

    if (matchId) {
      // Remove both from queue
      await this.redisService.removeFromQueue(client.id);
      await this.redisService.removeFromQueue(matchId);
      this.statsService.removeFromWaitingQueue(client.id);
      this.statsService.removeFromWaitingQueue(matchId);

      // Create room
      const roomId = await this.chatService.createRoom(client.id, matchId);
      this.statsService.addToRoom(roomId, client.id, matchId);

      // Notify both users
      client.emit('match-found', { roomId, partnerId: matchId });
      
      const matchSocket = this.server.sockets.sockets.get(matchId);
      if (matchSocket) {
        matchSocket.emit('match-found', { roomId, partnerId: client.id });
      }

      await this.statsService.broadcastStats(this.server);
    } else {
      client.emit('waiting', { message: 'Looking for a match...' });
    }
  }

  @SubscribeMessage('next')
  async handleNext(@ConnectedSocket() client: Socket) {
    console.log(`⏭️ ${client.id} requested next`);
    
    // Get current room and remove it
    const roomId = await this.redisService.getSocketRoom(client.id);
    if (roomId) {
      const room = await this.redisService.getRoom(roomId);
      if (room) {
        const partnerId = room.socketId1 === client.id ? room.socketId2 : room.socketId1;
        const partnerSocket = this.server.sockets.sockets.get(partnerId);
        if (partnerSocket) {
          partnerSocket.emit('partner-disconnected');
        }
        await this.redisService.deleteRoom(roomId);
        this.statsService.removeFromRoom(roomId);
      }
    }
    
    // Remove from queue if already there
    await this.redisService.removeFromQueue(client.id);
    this.statsService.removeFromWaitingQueue(client.id);

    // Re-queue for new match
    const queueData = await this.redisService.getQueueUser(client.id);
    const interests = queueData?.interests || [];
    await this.handleFindMatch(client, { interests });
  }

  @SubscribeMessage('webrtc-offer')
  async handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { offer: RTCSessionDescriptionInit; roomId: string },
  ) {
    const roomId = await this.redisService.getSocketRoom(client.id);
    if (!roomId) return;

    const room = await this.redisService.getRoom(roomId);
    if (!room) return;

    const partnerId = room.socketId1 === client.id ? room.socketId2 : room.socketId1;
    const partnerSocket = this.server.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.emit('webrtc-offer', { offer: data.offer, from: client.id });
    }
  }

  @SubscribeMessage('webrtc-answer')
  async handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { answer: RTCSessionDescriptionInit; roomId: string },
  ) {
    const roomId = await this.redisService.getSocketRoom(client.id);
    if (!roomId) return;

    const room = await this.redisService.getRoom(roomId);
    if (!room) return;

    const partnerId = room.socketId1 === client.id ? room.socketId2 : room.socketId1;
    const partnerSocket = this.server.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.emit('webrtc-answer', { answer: data.answer, from: client.id });
    }
  }

  @SubscribeMessage('webrtc-ice-candidate')
  async handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { candidate: RTCIceCandidateInit; roomId: string },
  ) {
    const roomId = await this.redisService.getSocketRoom(client.id);
    if (!roomId) return;

    const room = await this.redisService.getRoom(roomId);
    if (!room) return;

    const partnerId = room.socketId1 === client.id ? room.socketId2 : room.socketId1;
    const partnerSocket = this.server.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      partnerSocket.emit('webrtc-ice-candidate', { candidate: data.candidate, from: client.id });
    }
  }

  @SubscribeMessage('send-message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { message: string; roomId: string },
  ) {
    const roomId = await this.redisService.getSocketRoom(client.id);
    if (!roomId) return;

    // Filter message
    const { filtered, blocked } = this.chatService.filterMessage(data.message);
    if (blocked) {
      client.emit('message-blocked', { message: 'Message blocked by filter' });
      return;
    }

    const room = await this.redisService.getRoom(roomId);
    if (!room) return;

    const partnerId = room.socketId1 === client.id ? room.socketId2 : room.socketId1;
    const partnerSocket = this.server.sockets.sockets.get(partnerId);
    if (partnerSocket) {
      // Only send to partner, not back to sender (prevents duplicates)
      partnerSocket.emit('new-message', { message: filtered, from: client.id });
    }
    // Don't emit back to sender - they already added it locally
  }

  @SubscribeMessage('report-user')
  async handleReport(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { reportedSocketId: string },
  ) {
    const { banned, reportCount } = await this.chatService.handleReport(
      client.id,
      data.reportedSocketId,
    );

    if (banned) {
      const reportedSocket = this.server.sockets.sockets.get(data.reportedSocketId);
      if (reportedSocket) {
        // Get IP and ban it
        const ip = reportedSocket.handshake.address;
        const banHours = parseInt(process.env.BAN_DURATION_HOURS || '24');
        await this.redisService.banIP(ip, banHours);
        
        reportedSocket.emit('error', { message: 'You have been banned due to multiple reports' });
        reportedSocket.disconnect();
      }
    }

    client.emit('report-confirmed', { reportCount, banned });
  }
}

