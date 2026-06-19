import { NotesModule } from './notes/notes.module';
import { randomUUID } from 'crypto';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import pino from 'pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { InvitationsModule } from './invitations/invitations.module';
import { AuthModule } from './auth/auth.module';
import { SsoModule } from './sso/sso.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { MediaModule } from './media/media.module';
import { SeederModule } from './database/seeder/seeder.module';
import { CacheModule as AppCacheModule } from './common/cache/cache.module';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationsModule } from './notifications/notifications.module';
import { MailModule } from './mail/mail.module';
import { HealthModule } from './health/health.module';

const initLogger = pino({ name: 'AppModule' });

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        autoLogging: true,
        genReqId: (req) =>
          (req.headers['x-request-id'] as string) || randomUUID(),
        customProps: (req) => ({ requestId: req.id }),
        transport:
          process.env.NODE_ENV !== 'production'
            ? {
                target: 'pino-pretty',
                options: { colorize: true, singleLine: true },
              }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
      },
    }),
    EventEmitterModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          name: 'default',
          ttl: configService.get<number>('THROTTLE_TTL') ?? 60_000,
          limit: configService.get<number>('THROTTLE_LIMIT') ?? 100,
        },
      ],
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT') || 6379;
        const redisTtl = configService.get<number>('REDIS_TTL') || 3600;
        const redisUsername = configService.get<string>('REDIS_USERNAME');
        const redisPassword = configService.get<string>('REDIS_PASSWORD');

        if (!redisHost) {
          initLogger.info('Redis not configured, using in-memory cache');
          return { ttl: redisTtl * 1000 };
        }

        try {
          const store = await redisStore({
            socket: {
              host: redisHost,
              port: redisPort,
              connectTimeout: 5000,
            },
            username: redisUsername,
            password: redisPassword,
            ttl: redisTtl * 1000,
          });

          store.client.on('error', (err: Error) => {
            initLogger.error({ err }, 'Redis connection error');
          });

          initLogger.info('Redis cache connected');
          return { store };
        } catch (error) {
          initLogger.warn(
            { err: error },
            'Redis unavailable, falling back to in-memory cache',
          );
          return { ttl: redisTtl * 1000 };
        }
      },
      inject: [ConfigService],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const synchronize = configService.get('DB_SYNCHRONIZE')
          ? configService.get('DB_SYNCHRONIZE') === 'true'
          : configService.get('NODE_ENV') !== 'production';
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
          synchronize,
          // When synchronize is off (prod), apply pending migrations on boot.
          migrationsRun: !synchronize,
        };
      },
      inject: [ConfigService],
    }),
    UsersModule,
    InvitationsModule,
    AuthModule,
    SsoModule,
    RolesModule,
    PermissionsModule,
    MediaModule,
    SeederModule,
    AppCacheModule,
    NotificationsModule,
    MailModule,
    HealthModule,
    NotesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
