import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { RedisService } from '../common/services/redis.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  providers: [UsersService, RedisService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
