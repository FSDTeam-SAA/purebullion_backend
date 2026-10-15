import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/alerts',
})
export class AlertsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AlertsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Alerts & Notifications WebSocket Gateway initialized on /alerts');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '') ||
        (client.handshake.query?.token as string);

      if (token) {
        const secret =
          this.configService.get<string>('auth.accessTokenSecret') ||
          this.configService.get<string>('ACCESS_TOKEN_SECRET') ||
          'jishad-backend-access-secret-change-in-prod';

        const payload = this.jwtService.verify(token, { secret });
        if (payload?.sub || payload?.id) {
          const userId = (payload.sub || payload.id).toString();
          client.data.userId = userId;
          await client.join(`user:${userId}`);
          this.logger.debug(`Socket ${client.id} joined personal room user:${userId}`);
        }
      }

      // All connected clients join global broadcast room for platform announcements and public signals
      await client.join('broadcast');
      this.logger.debug(`Socket client connected: ${client.id}`);
    } catch {
      // Guest/unauthenticated socket still allowed to join public broadcast room
      await client.join('broadcast');
      this.logger.debug(`Unauthenticated socket ${client.id} joined broadcast room`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket client disconnected: ${client.id}`);
  }

  // ─── Broadcast Alert to all connected users ────────────────────────
  broadcastAlert(alert: any) {
    if (this.server) {
      this.server.to('broadcast').emit('alert:new', alert);
      this.logger.debug(`Broadcasted new alert: ${alert.title}`);
    }
  }

  // ─── Targeted Alert to specific user room ──────────────────────────
  sendUserAlert(userId: string, alert: any) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('alert:new', alert);
      this.logger.debug(`Sent targeted alert to user:${userId}: ${alert.title}`);
    }
  }

  // ─── Broadcast Admin Announcement ──────────────────────────────────
  broadcastAnnouncement(announcement: any) {
    if (this.server) {
      this.server.to('broadcast').emit('announcement:new', announcement);
      this.logger.debug(`Broadcasted new announcement: ${announcement.title}`);
    }
  }

  // ─── Send updated unread counter to user ───────────────────────────
  sendUnreadCount(userId: string, count: number) {
    if (this.server) {
      this.server.to(`user:${userId}`).emit('alert:unread_count', { unreadCount: count });
    }
  }

  // ─── Client ping/pong heartbeat ────────────────────────────────────
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): string {
    return 'pong';
  }
}

