import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  Response,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { UserDto } from 'src/users/dto/user.dto';
import { Role } from '../common/enums/roles.enum';
import { Public } from 'src/common/decorators/public.decorator';
import type { Response as ExpressResponse } from 'express';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';

export interface AuthenticatedRequest extends Request {
  user: { id: string; username: string };
  cookies: { refresh_token?: string };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 3, ttl: 3600 } })
  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
  ): Promise<RegisterResponseDto> {
    const user = await this.authService.register(registerDto);
    return {
      ...user,
      role: user.role as Role,
      updatedAt: user.createdAt,
    };
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Response({ passthrough: true }) response: ExpressResponse,
  ): Promise<LoginResponseDto> {
    const result = await this.authService.login(
      loginDto.username,
      loginDto.password,
    );

    const accessMaxAge = this.configService.get<number>(
      'jwt.access.cookieMaxAge',
    );
    const refreshMaxAge = this.configService.get<number>(
      'jwt.refresh.cookieMaxAge',
    );

    response.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODR_ENV === 'production',
      sameSite: 'lax',
      maxAge: accessMaxAge,
      path: '/',
    });

    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: refreshMaxAge,
      path: '/auth/refresh',
    });

    return result;
  }

  @Get('profile')
  @Throttle({ default: { limit: 60, ttl: 60 } })
  async getProfile(@Request() req: AuthenticatedRequest): Promise<UserDto> {
    const userId = parseInt(req.user.id);
    if (isNaN(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.usersService.findById(parseInt(req.user.id));
    return {
      ...user,
      role: user.role as Role,
      updatedAt: user.createdAt,
    };
  }

  @Post('refresh')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 30 } })
  async refresh(
    @Body('refresh_token') bodyToken: string,
    @Request() req: AuthenticatedRequest,
    @Response({ passthrough: true }) response: ExpressResponse,
  ): Promise<LoginResponseDto> {
    const token = req.cookies.refresh_token || bodyToken;
    if (!token) {
      throw new BadRequestException('Refresh token is required');
    }
    const result = await this.authService.refreshToken(token);

    response.cookie('access_token', result.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0.5 * 60 * 1000,
      path: '/',
    });

    response.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
      path: '/', // ✅ 改成统一的路径
    });

    return {
      ...result,
      refresh_token: token,
    };
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }

  @Post('logout')
  logout(@Response({ passthrough: true }) response: ExpressResponse) {
    response.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return { message: 'Logged out successfully' };
  }
}
