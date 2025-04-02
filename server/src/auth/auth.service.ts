import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from './entities/refresh-token.entity';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { Role } from '../common/enums/roles.enum';
import { RedisService } from '../common/services/redis.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly redisService: RedisService,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private configService: ConfigService,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) { }

  async generateRefreshToken(user: User): Promise<RefreshToken> {
    const refreshMaxAge =
      this.configService.get<number>('jwt.refresh.cookieMaxAge') || 60000;
    const refreshToken = this.refreshTokenRepository.create({
      user,
      userId: user.id,
      token: uuidv4(),
      expiresAt: new Date(Date.now() + refreshMaxAge),
    });
    return this.refreshTokenRepository.save(refreshToken);
  }

  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    return this.usersService.create(registerDto, Role.USER);
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    try {
      const failedAttemptsKey = `login_failed_${username}`;
      const failedAttemptsData =
        await this.redisService.redis.get(failedAttemptsKey);
      const failedAttempts = failedAttemptsData
        ? parseInt(failedAttemptsData, 10)
        : 0;

      if (failedAttempts && failedAttempts >= 5) {
        throw new UnauthorizedException(
          'Too many failed attempts. Try again later.',
        );
      }
      this.logger.log(
        `Current failed attempts for ${username}: ${failedAttempts}`,
      );

      const user = await this.userRepository.findOne({ where: { username } });
      if (!user) {
        this.logger.warn(
          `Failed login attempt for non-existent user: ${username}`,
        );
        throw new UnauthorizedException('username or password is wrong!!!');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        this.logger.warn(`Failed login attempt for user: ${username}`);
        throw new UnauthorizedException('username or password is wrong!!!');
      }

      this.logger.log(`Successful login for user:${username}`);

      const refreshToken = await this.generateRefreshToken(user);
      const payload = {
        username: user.username,
        sub: user.id,
        role: user.role,
      };
      const accessExpiresIn = this.configService.get<string>(
        'jwt.access.expiresIn',
      );
      const token = this.jwtService.sign(payload, {
        expiresIn: accessExpiresIn,
      });

      // 缓存访问令牌
      await this.redisService.redis.setex(`auth_token_${user.id}`, 3600, token);
      // 清除失败尝试计数
      await this.redisService.redis.del(failedAttemptsKey);

      return {
        access_token: token,
        refresh_token: refreshToken.token,
      };
    } catch (error: unknown) {
      const failedAttemptsKey = `login_failed_${username}`;
      const failedAttemptsData =
        await this.redisService.redis.get(failedAttemptsKey);
      const attempts = failedAttemptsData
        ? parseInt(failedAttemptsData, 10)
        : 0;

      // 设置失败尝试计数，5分钟过期
      await this.redisService.redis.setex(
        failedAttemptsKey,
        300,
        (attempts + 1).toString(),
      );

      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof Error) {
        this.logger.error(`Login error: ${error.message}`);
      } else {
        this.logger.error('Login error: Unknown error');
      }
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async refreshToken(
    token: string,
  ): Promise<{ access_token: string; refresh_token: string }> {
    console.log('Received refresh_token:', token);
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    console.log('Matched token from DB:', refreshToken);
    if (
      !refreshToken ||
      refreshToken.isRevoked ||
      new Date() > refreshToken.expiresAt
    ) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload = {
      username: refreshToken.user.username,
      sub: refreshToken.user.id,
    };
    const access_token = this.jwtService.sign(payload);

    // 生成新的刷新令牌
    const newRefreshToken = await this.generateRefreshToken(refreshToken.user);

    // 将旧令牌标记为已撤销
    refreshToken.isRevoked = true;
    await this.refreshTokenRepository.save(refreshToken);

    return {
      access_token,
      refresh_token: newRefreshToken.token,
    };
  }
}
