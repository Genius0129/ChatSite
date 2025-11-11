import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class StatsService {
  private server: Server;
  private connectedSockets: Set<string> = new Set();
  private waitingSockets: Set<string> = new Set();
  private activeRooms: Map<string, Set<string>> = new Map(); // roomId -> Set of socketIds

  constructor(private redisService: RedisService) {}

  setServer(server: Server) {
    this.server = server;
  }

  addConnectedSocket(socketId: string) {
    this.connectedSockets.add(socketId);
  }

  removeConnectedSocket(socketId: string) {
    this.connectedSockets.delete(socketId);
    this.waitingSockets.delete(socketId);
    // Remove from all rooms
    for (const [roomId, sockets] of this.activeRooms.entries()) {
      sockets.delete(socketId);
      if (sockets.size === 0) {
        this.activeRooms.delete(roomId);
      }
    }
  }

  addToWaitingQueue(socketId: string) {
    this.waitingSockets.add(socketId);
  }

  removeFromWaitingQueue(socketId: string) {
    this.waitingSockets.delete(socketId);
  }

  addToRoom(roomId: string, socketId1: string, socketId2: string) {
    if (!this.activeRooms.has(roomId)) {
      this.activeRooms.set(roomId, new Set());
    }
    this.activeRooms.get(roomId).add(socketId1);
    this.activeRooms.get(roomId).add(socketId2);
    // Remove from waiting queue
    this.waitingSockets.delete(socketId1);
    this.waitingSockets.delete(socketId2);
  }

  removeFromRoom(roomId: string) {
    this.activeRooms.delete(roomId);
  }

  getActiveRooms(): Map<string, Set<string>> {
    return this.activeRooms;
  }

  async getStats() {
    // Use in-memory tracking if available, otherwise fall back to Redis
    let connectedCount: number;
    let queueCount: number;
    let activeChatsCount: number;

    if (this.server) {
      // Use actual Socket.io server count (most accurate)
      // This counts connections, not unique users (each tab = 1 connection)
      connectedCount = this.server.sockets.sockets.size;
      queueCount = this.waitingSockets.size;
      activeChatsCount = this.activeRooms.size;
      
      // Debug: Log connection details
      if (connectedCount > 0) {
        const socketIds = Array.from(this.server.sockets.sockets.keys());
        console.log(`📊 Stats: ${connectedCount} connections (sockets: ${socketIds.slice(0, 5).join(', ')}${socketIds.length > 5 ? '...' : ''})`);
      }
    } else {
      // Fallback to Redis if available
      connectedCount = await this.redisService.getConnectedCount();
      const queueMembers = await this.redisService.getQueueMembers();
      queueCount = queueMembers.length;
      
      // Calculate active rooms (approximate)
      const activeRooms = Math.floor(connectedCount / 2) - queueCount;
      activeChatsCount = Math.max(0, activeRooms);
    }

    return {
      onlineUsers: connectedCount,
      waitingUsers: queueCount,
      activeChats: activeChatsCount,
      timestamp: Date.now(),
    };
  }

  async broadcastStats(server: Server) {
    if (!this.server) {
      this.setServer(server);
    }
    const stats = await this.getStats();
    server.emit('stats-update', stats);
  }
}

