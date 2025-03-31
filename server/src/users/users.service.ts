import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { PaginationDto } from './dto/pagination.dto';
import { Role } from 'src/common/enums/roles.enum';
import { RedisService } from '../common/services/redis.service';

// 定义返回类型接口
interface UsersResult {
  users: User[];
  total: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
    role: Role = Role.USER,
    creatorRole?: Role,
  ): Promise<Omit<User, 'password'>> {
    const { username, password, email } = createUserDto;
    if (role === Role.ADMIN && creatorRole !== Role.ADMIN) {
      throw new Error('Only the Admin can create new admin');
    }

    const existingUser = await this.userRepository.findOne({
      where: { username },
    });
    if (existingUser) {
      throw new ConflictException('The username already exists');
    }

    if (createUserDto.email) {
      const existingEmail = await this.userRepository.findOne({
        where: { email },
      });
      if (existingEmail) {
        throw new ConflictException('The email already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = this.userRepository.create({
      username,
      password: hashedPassword,
      email,
    });
    const saveUser: User = await this.userRepository.save(newUser);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = saveUser;
    return result as Omit<User, 'password'>;
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<{ users: User[]; total: number }> {
    const { page = 1, limit = 10 } = paginationDto;
    const cacheKey = `users_page_${page}_limit_${limit}`;

    // 首先尝试从缓存获取
    try {
      const cachedData = await this.redisService.redis.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData) as UsersResult;
      }
    } catch {
      // 如果缓存读取失败，直接继续获取数据库数据
    }

    // 从数据库获取数据
    const skip = Math.max((page - 1) * limit, 0);
    const take = Math.max(limit, 1);
    const [users, total] = await this.userRepository.findAndCount({
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
    const result = { users, total };

    // 尝试缓存结果，但忽略可能的错误
    try {
      await this.redisService.redis.setex(
        cacheKey,
        300,
        JSON.stringify(result),
      );
    } catch {
      // 缓存写入失败可以忽略
    }

    return result;
  }

  async findById(id: number): Promise<User> {
    const cacheKey = `user_${id}`;

    try {
      // 尝试从缓存获取
      const cachedData = await this.redisService.redis.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData) as User;
      }

      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException('user not found by id');
      }

      // 缓存结果
      await this.redisService.redis.setex(cacheKey, 300, JSON.stringify(user));
      return user;
    } catch (error) {
      // 如果是 NotFoundException，重新抛出
      if (error instanceof NotFoundException) {
        throw error;
      }

      // 缓存失败时直接查询数据库
      const user = await this.userRepository.findOne({ where: { id } });
      if (!user) {
        throw new NotFoundException('user not found by id');
      }
      return user;
    }
  }

  async findByUsername(username: string): Promise<User> {
    const cacheKey = `username_${username}`;

    try {
      // 尝试从缓存获取
      const cachedData = await this.redisService.redis.get(cacheKey);
      if (cachedData) {
        return JSON.parse(cachedData) as User;
      }

      const user = await this.userRepository.findOne({ where: { username } });
      if (!user) {
        throw new NotFoundException('User not Found by username');
      }

      // 缓存结果
      await this.redisService.redis.setex(cacheKey, 300, JSON.stringify(user));
      return user;
    } catch (error) {
      // 如果是 NotFoundException，重新抛出
      if (error instanceof NotFoundException) {
        throw error;
      }

      // 缓存失败时直接查询数据库
      const user = await this.userRepository.findOne({ where: { username } });
      if (!user) {
        throw new NotFoundException('User not Found by username');
      }
      return user;
    }
  }

  async update(id: number, updateData: Partial<User>): Promise<User> {
    await this.findById(id);
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    await this.userRepository.update(id, updateData);

    // 尝试清理缓存，但忽略可能的错误
    try {
      // 删除特定用户的缓存
      await this.redisService.redis.del(`user_${id}`);

      // 删除与用户列表相关的所有缓存
      const keys = await this.redisService.redis.keys('users_page_*');
      if (keys.length) {
        await this.redisService.redis.del(keys);
      }
    } catch {
      // 缓存清理失败不影响主功能
      console.error('Failed to invalidate cache');
    }

    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.delete(id);

    // 尝试清理缓存，但忽略可能的错误
    try {
      // 删除与该用户相关的所有缓存
      await this.redisService.redis.del(`user_${id}`);
      await this.redisService.redis.del(`username_${user.username}`);

      // 删除与用户列表相关的所有缓存
      const keys = await this.redisService.redis.keys('users_page_*');
      if (keys.length) {
        await this.redisService.redis.del(keys);
      }
    } catch {
      // 缓存清理失败不影响主功能
      console.error('Failed to invalidate cache');
    }
  }
}
