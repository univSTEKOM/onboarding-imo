import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { Notification } from './entities/notification.entity';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NotificationsGateway');

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const authHeader = client.handshake.headers.authorization;
      const token =
        (client.handshake.auth.token as string) || authHeader?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Connection attempt without token: ${client.id}`);
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      client.data.user = payload;

      const userId = payload.sub;
      void client.join(`user_${userId}`);

      if (payload.roles && Array.isArray(payload.roles)) {
        payload.roles.forEach((role) => {
          void client.join(`role_${role}`);
          this.logger.debug(`Client ${client.id} joined room: role_${role}`);
        });
      }

      this.logger.log(`Client connected: ${client.id} (User: ${userId})`);
    } catch (e: unknown) {
      const error = e as Error;
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  async sendNotification(notification: Notification) {
    const excludeUserId = notification.actorId;

    if (notification.userId) {
      if (notification.userId === excludeUserId) return;
      this.server
        .to(`user_${notification.userId}`)
        .emit('new_notification', notification);
    }

    if (notification.targetRole) {
      const room = `role_${notification.targetRole}`;
      if (excludeUserId) {
        const sockets = await this.server.in(room).fetchSockets();
        for (const socket of sockets) {
          const user = (socket.data as { user?: JwtPayload }).user;
          if (user?.sub !== excludeUserId) {
            socket.emit('new_notification', notification);
          }
        }
      } else {
        this.server.to(room).emit('new_notification', notification);
      }
    }
  }
}
