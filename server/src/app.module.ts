import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import configuration from './config/configuration';
import { AppService } from './app.service';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler';
import { ChatModule } from './chat/chat.module';
import { RedisModule } from '@nestjs-modules/ioredis';
import { UserThrottlerStorageService } from './common/services/user-throttler-storage.servervice';
import { UserThrottlerGuard } from './common/gurads/user-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: `redis://${configService.get<string>('redis.host') || 'localhost'}:${configService.get<number>('redis.port') || 6379}`,
        password: configService.get<string>('redis.password'),
        db:
          process.env.NODE_ENV !== 'production'
            ? configService.get<number>('redis.db') || 0
            : 1,
      }),
    }),
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [{ ttl: 60, limit: 30 }],
      }),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([User]),
    AuthModule,
    UsersModule,
    ChatModule,
  ],
  providers: [
    AppService,
    UserThrottlerStorageService,
    {
      provide: ThrottlerStorage,
      useClass: UserThrottlerStorageService,
    },
    {
      provide: APP_GUARD,
      useClass: UserThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: 'THROTTLER_OPTIONS',
      useFactory: () => ({
        throttlers: [{ ttl: 60, limit: 30 }],
      }),
    },
  ],
})
export class AppModule {}
