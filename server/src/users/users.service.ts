import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { PaginationDto } from './dto/pagination.dto';
import { Role } from 'src/common/enums/roles.enum';
import { Cache } from 'cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { createClient } from 'redis'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) { }

  async create(createUserDto: CreateUserDto, role: Role = Role.USER, creatorRole?: Role): Promise<Omit<User, 'password'>> {
    const { username, password, email } = createUserDto;
    if (role === Role.ADMIN && creatorRole !== Role.ADMIN) {
      throw new Error('Only the Admin can create new admin');
    }

    const existingUser = await this.userRepository.findOne({ where: { username } });
    if (existingUser) {
      throw new ConflictException('The username already exists');
    }

    if (createUserDto.email) {
      const existingEmail = await this.userRepository.findOne({ where: { email } });
      if (existingEmail) {
        throw new ConflictException('The email already exists');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = this.userRepository.create({ username, password: hashedPassword, email });
    const saveUser = await this.userRepository.save(newUser);
    const { password: _, ...result } = saveUser;
    return result;
  }

  async findAll(paginationDto: PaginationDto): Promise<{ users: User[], total: number }> {
    const { page = 1, limit = 10 } = paginationDto;
    const cacheKey = `users_page_${page}_limit_${limit}`;

    const cachedResult = await this.cacheManager.get<{ users: User[]; total: number }>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const skip = Math.max((page - 1) * limit, 0);
    const take = Math.max(limit, 1);
    const [users, total] = await this.userRepository.findAndCount({
      skip,
      take,
      order: { createdAt: 'DESC' }
    });
    const result = { users, total };

    await this.cacheManager.set(cacheKey, result, 300);
    return result;
  }

  async findById(id: number): Promise<User> {
    const cacheKey = `user_${id}`
    const cachedUser = await this.cacheManager.get<User>(cacheKey)
    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('user not found by id');
    }

    await this.cacheManager.set(cacheKey, user, 300);
    return user;
  }

  async findByUsername(username: string): Promise<User> {
    const cacheKey = `username_${username}`
    const cachedUser = await this.cacheManager.get<User>(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }


    const user = await this.userRepository.findOne({ where: { username } });
    if (!user) {
      throw new NotFoundException('User not Found by username');
    }

    await this.cacheManager.set(cacheKey, user, 300);
    return user;
  }

  async update(id: number, updateData: Partial<User>): Promise<User> {
    await this.findById(id);
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    await this.userRepository.update(id, updateData);

    const redisClient = this.cacheManager as unknown as ReturnType<typeof createClient>;
    const keys = await redisClient.keys('users_page_*');
    if (keys.length) {
      for (const key of keys) {
        await this.cacheManager.del(key);
      }
    }
    return this.findById(id);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.delete(id);

    await this.cacheManager.del(`user_${id}`);
    await this.cacheManager.del(`username_${user.username}`);

    const redisClient = this.cacheManager as unknown as ReturnType<typeof createClient>;
    const keys = await redisClient.keys('users_page_*');
    if (keys.length) {
      for (const key of keys) {
        await this.cacheManager.del(key);
      }
    }
  }
}
