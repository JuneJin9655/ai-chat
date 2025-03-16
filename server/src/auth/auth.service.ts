import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { RefreshToken } from './entities/refresh-token.entity';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid'
import { UsersService } from 'src/users/users.service';
import { RegisterDto } from './dto/register.dto';
import { Role } from 'src/common/enums/roles.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private configService: ConfigService,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) { }

  async generateRefreshToken(user: User): Promise<RefreshToken> {
    const refreshToken = await this.refreshTokenRepository.create({
      user,
      userId: user.id,
      token: uuidv4(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    return this.refreshTokenRepository.save(refreshToken);
  }

  async register(registerDto: RegisterDto): Promise<Omit<User, 'password'>> {
    return this.usersService.create(registerDto, Role.USER);
  }

  async login(
    username: string,
    password: string,
  ): Promise<{ access_token: string, refresh_token: string }> {
    try {
      const failedAttempts = await this.cacheManager.get<number>(`login_failed_${username}`);
      if (failedAttempts && failedAttempts >= 5) {
        throw new UnauthorizedException('Too many failed attempts. Try again later.');
      }
      this.logger.log(`Current failed attempts for ${username}: ${failedAttempts}`);

      const user = await this.userRepository.findOne({ where: { username } });
      if (!user) {
        this.logger.warn(`Failed login attempt for non-existent user: ${username}`)
        throw new UnauthorizedException('username or password is wrong!!!');
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        this.logger.warn(`Failed login attempt for user: ${username}`);
        throw new UnauthorizedException('username or password is wrong!!!');
      }

      this.logger.log(`Successful login for user:${username}`);

      const refreshToken = await this.generateRefreshToken(user);
      const payload = { username: user.username, sub: user.id, role: user.role };
      const token = this.jwtService.sign(payload);

      await this.cacheManager.set(`auth_token_${user.id}`, token, 3600);
      await this.cacheManager.del(`login_failed_${username}`);

      return {
        access_token: token,
        refresh_token: refreshToken.token,
      };
    } catch (error) {
      const attempts = (await this.cacheManager.get<number>(`login_failed_${username}`)) || 0;
      await this.cacheManager.set(`login_failed_${username}`, attempts + 1, 300); // 30分钟过期
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.error(`Login error: ${error.message}`);
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  async refreshToken(token: string): Promise<{ access_token }> {
    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['user']
    });
    if (!refreshToken || refreshToken.isRevoked || new Date() > refreshToken.expiresAt) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const payload = { username: refreshToken.user.username, sub: refreshToken.user.id };
    const access_token = this.jwtService.sign(payload);

    return { access_token };
  }
}
