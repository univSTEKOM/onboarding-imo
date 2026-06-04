import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { BaseService } from '../common/services/base.service';

@Injectable()
export class NotificationsService extends BaseService<Notification> {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {
    super(notificationRepository, 'Notification', ['title', 'message']);
  }

  async findAllForUser(
    userId: number,
    roles: string[],
    page: number = 1,
    limit: number = 10,
  ) {
    const currentPage = Math.max(1, page);
    const skip = (currentPage - 1) * limit;

    const query = this.notificationRepository
      .createQueryBuilder('n')
      .where('n.userId = :userId', { userId })
      .orWhere(
        '(n.targetRole IN (:...roles) AND (n.actorId IS NULL OR n.actorId != :userId))',
        {
          roles: roles.length > 0 ? roles : ['__none__'],
          userId,
        },
      )
      .orderBy('n.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page: +currentPage,
        last_page: Math.ceil(total / limit),
      },
    };
  }

  async markAllAsRead(userId: number, roles: string[]) {
    const query = this.notificationRepository
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('isRead = false')
      .andWhere(
        '(userId = :userId OR (targetRole IN (:...roles) AND (actorId IS NULL OR actorId != :userId)))',
        {
          userId,
          roles: roles.length > 0 ? roles : ['__none__'],
        },
      );

    return query.execute();
  }

  async getUnreadCount(userId: number, roles: string[]) {
    const query = this.notificationRepository
      .createQueryBuilder('n')
      .where('n.isRead = false')
      .andWhere(
        '(n.userId = :userId OR (n.targetRole IN (:...roles) AND (n.actorId IS NULL OR n.actorId != :userId)))',
        {
          userId,
          roles: roles.length > 0 ? roles : ['__none__'],
        },
      );

    return query.getCount();
  }
}
