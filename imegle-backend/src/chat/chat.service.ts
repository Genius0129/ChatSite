import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ChatService {
  private readonly keywordFilterEnabled: boolean;
  private readonly maxReportsBeforeBan: number;

  constructor(
    private redisService: RedisService,
    private configService: ConfigService,
  ) {
    this.keywordFilterEnabled = this.configService.get('KEYWORD_FILTER_ENABLED') === 'true';
    this.maxReportsBeforeBan = parseInt(this.configService.get('MAX_REPORTS_BEFORE_BAN') || '3');
  }

  // Interest-based matching algorithm
  async findMatch(currentSocketId: string, currentInterests: string[]): Promise<string | null> {
    const queueMembers = await this.redisService.getQueueMembers();
    
    // Remove current user from queue
    const otherUsers = queueMembers.filter(id => id !== currentSocketId);
    
    if (otherUsers.length === 0) {
      return null;
    }

    // If no interests, match with first available user
    if (currentInterests.length === 0) {
      const randomUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
      return randomUser;
    }

    // Find best match based on interests
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const userId of otherUsers) {
      const userData = await this.redisService.getQueueUser(userId);
      if (!userData) continue;

      const userInterests = userData.interests || [];
      
      // Calculate interest overlap score
      const commonInterests = currentInterests.filter(interest => 
        userInterests.includes(interest)
      );
      const score = commonInterests.length;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = userId;
      }
    }

    // If no interest match found, match randomly
    if (!bestMatch && otherUsers.length > 0) {
      bestMatch = otherUsers[Math.floor(Math.random() * otherUsers.length)];
    }

    return bestMatch;
  }

  async createRoom(socketId1: string, socketId2: string): Promise<string> {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.redisService.createRoom(roomId, socketId1, socketId2);
    return roomId;
  }

  filterMessage(message: string): { filtered: string; blocked: boolean } {
    if (!this.keywordFilterEnabled) {
      return { filtered: message, blocked: false };
    }

    // Simple keyword filter (can be enhanced)
    const blockedKeywords = [
      'spam', 'advertisement', 'promo', 'buy now', 'click here',
      // Add more as needed
    ];

    const lowerMessage = message.toLowerCase();
    for (const keyword of blockedKeywords) {
      if (lowerMessage.includes(keyword)) {
        return { filtered: message, blocked: true };
      }
    }

    return { filtered: message, blocked: false };
  }

  async handleReport(socketId: string, reportedSocketId: string): Promise<{ banned: boolean; reportCount: number }> {
    const reportCount = await this.redisService.reportUser(reportedSocketId);
    
    let banned = false;
    if (reportCount >= this.maxReportsBeforeBan) {
      // Get IP from socket (would need to be stored)
      // For now, we'll just track by socketId
      banned = true;
    }

    return { banned, reportCount };
  }

  getSTUNServers(): string[] {
    const stunServers = this.configService.get('STUN_SERVERS') || 
      'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302';
    return stunServers.split(',').map(s => s.trim());
  }

  getTURNConfig(): { urls: string; username?: string; credential?: string } | null {
    const turnUrl = this.configService.get('TURN_SERVER_URL');
    if (!turnUrl) return null;

    return {
      urls: turnUrl,
      username: this.configService.get('TURN_USERNAME'),
      credential: this.configService.get('TURN_CREDENTIAL'),
    };
  }
}

