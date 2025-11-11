import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private pubClient: RedisClientType;
  private subClient: RedisClientType;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      const redisUrl = this.configService.get('REDIS_URL') || 'redis://localhost:6379';
      
      this.client = createClient({ url: redisUrl });
      this.pubClient = createClient({ url: redisUrl });
      this.subClient = this.pubClient.duplicate();

      // Handle connection errors (don't log repeatedly, just set flag)
      let connectionFailed = false;
      
      this.client.on('error', (err) => {
        if (!connectionFailed) {
          connectionFailed = true;
          console.warn('⚠️  Redis not available. Running in single-server mode.');
          this.client = null;
          this.pubClient = null;
          this.subClient = null;
        }
      });
      
      this.pubClient.on('error', () => {
        // Errors already handled by main client
      });
      
      this.subClient.on('error', () => {
        // Errors already handled by main client
      });

      // Try to connect with timeout
      const connectPromise = Promise.all([
        this.client.connect().catch(() => { this.client = null; }),
        this.pubClient.connect().catch(() => { this.pubClient = null; }),
        this.subClient.connect().catch(() => { this.subClient = null; }),
      ]);

      // Set a timeout for connection
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => {
          if (!this.client) {
            resolve(null);
          }
        }, 2000); // 2 second timeout
      });

      await Promise.race([connectPromise, timeoutPromise]);

      if (this.client) {
        console.log('✅ Connected to Redis');
      } else {
        console.warn('⚠️  Redis not available. Running in single-server mode.');
        this.client = null;
        this.pubClient = null;
        this.subClient = null;
      }
    } catch (error) {
      console.warn('⚠️  Redis not available. Running in single-server mode.');
      // Set clients to null so we can check later
      this.client = null;
      this.pubClient = null;
      this.subClient = null;
    }
  }

  async onModuleDestroy() {
    await Promise.all([
      this.client?.quit(),
      this.pubClient?.quit(),
      this.subClient?.quit(),
    ]);
  }

  getClient(): RedisClientType | null {
    return this.client;
  }

  getPubClient(): RedisClientType | null {
    return this.pubClient;
  }

  getSubClient(): RedisClientType | null {
    return this.subClient;
  }

  private checkRedis(): boolean {
    if (!this.client) {
      return false;
    }
    return true;
  }

  // Queue operations
  async addToQueue(socketId: string, interests: string[] = []): Promise<void> {
    if (!this.checkRedis()) return;
    const key = `queue:${socketId}`;
    await this.client.setEx(key, 300, JSON.stringify({ socketId, interests, timestamp: Date.now() }));
    await this.client.sAdd('waiting_queue', socketId);
  }

  async removeFromQueue(socketId: string): Promise<void> {
    if (!this.checkRedis()) return;
    await this.client.sRem('waiting_queue', socketId);
    await this.client.del(`queue:${socketId}`);
  }

  async getQueueMembers(): Promise<string[]> {
    if (!this.checkRedis()) return [];
    return await this.client.sMembers('waiting_queue');
  }

  async getQueueUser(socketId: string): Promise<{ socketId: string; interests: string[] } | null> {
    if (!this.checkRedis()) return null;
    const data = await this.client.get(`queue:${socketId}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  // Room operations
  async createRoom(roomId: string, socketId1: string, socketId2: string): Promise<void> {
    if (!this.checkRedis()) return;
    await this.client.setEx(`room:${roomId}`, 3600, JSON.stringify({ socketId1, socketId2 }));
    await this.client.set(`socket:${socketId1}:room`, roomId);
    await this.client.set(`socket:${socketId2}:room`, roomId);
  }

  async getRoom(roomId: string): Promise<{ socketId1: string; socketId2: string } | null> {
    if (!this.checkRedis()) return null;
    const data = await this.client.get(`room:${roomId}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  async getSocketRoom(socketId: string): Promise<string | null> {
    if (!this.checkRedis()) return null;
    return await this.client.get(`socket:${socketId}:room`);
  }

  async deleteRoom(roomId: string): Promise<void> {
    if (!this.checkRedis()) return;
    const room = await this.getRoom(roomId);
    if (room) {
      await this.client.del(`socket:${room.socketId1}:room`);
      await this.client.del(`socket:${room.socketId2}:room`);
    }
    await this.client.del(`room:${roomId}`);
  }

  // Connected sockets tracking
  async addConnectedSocket(socketId: string): Promise<void> {
    if (!this.checkRedis()) return;
    await this.client.sAdd('connected_sockets', socketId);
  }

  async removeConnectedSocket(socketId: string): Promise<void> {
    if (!this.checkRedis()) return;
    await this.client.sRem('connected_sockets', socketId);
  }

  async getConnectedCount(): Promise<number> {
    if (!this.checkRedis()) return 0;
    return await this.client.sCard('connected_sockets');
  }

  // Banned IPs
  async banIP(ip: string, hours: number = 24): Promise<void> {
    if (!this.checkRedis()) return;
    const seconds = hours * 3600;
    await this.client.setEx(`banned:${ip}`, seconds, '1');
  }

  async isIPBanned(ip: string): Promise<boolean> {
    if (!this.checkRedis()) return false;
    const result = await this.client.get(`banned:${ip}`);
    return result !== null;
  }

  // Reports
  async reportUser(socketId: string): Promise<number> {
    if (!this.checkRedis()) return 0;
    const count = await this.client.incr(`reports:${socketId}`);
    return count;
  }

  async getUserReports(socketId: string): Promise<number> {
    if (!this.checkRedis()) return 0;
    const count = await this.client.get(`reports:${socketId}`);
    return count ? parseInt(count) : 0;
  }

  // User management
  async saveUser(user: any): Promise<void> {
    if (!this.checkRedis()) return;
    await this.client.set(`user:${user.id}`, JSON.stringify(user));
    await this.client.set(`user:email:${user.email}`, user.id);
  }

  async getUserById(userId: string): Promise<any | null> {
    if (!this.checkRedis()) return null;
    const data = await this.client.get(`user:${userId}`);
    if (!data) return null;
    return JSON.parse(data);
  }

  async getUserByEmail(email: string): Promise<any | null> {
    if (!this.checkRedis()) return null;
    const userId = await this.client.get(`user:email:${email}`);
    if (!userId) return null;
    return await this.getUserById(userId);
  }
}

