import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto, RegisterResponseDto } from './dto/register.dto';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import { UsersService } from '../users/users.service';
import { CustomThrottlerGuard } from 'src/common/gurads/throttler.guard';
import { UserDto } from 'src/users/dto/user.dto';
import { Role } from '../common/enums/roles.enum';
import { Public } from 'src/common/decorators/public.decorator';

export interface AuthenticatedRequest extends Request {
  user: { id: string; username: string };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService
  ) { }

  @UseGuards(CustomThrottlerGuard)
  @Public()
  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponseDto> {
    const user = await this.authService.register(registerDto);
    return {
      ...user,
      role: user.role as Role,
      updatedAt: user.createdAt
    };
  }

  @UseGuards(CustomThrottlerGuard)
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: AuthenticatedRequest): Promise<UserDto> {
    const user = await this.usersService.findById(parseInt(req.user.id));
    return {
      ...user,
      role: user.role as Role,
      updatedAt: user.createdAt
    };
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  async refresh(@Body('refresh_token') token: string): Promise<LoginResponseDto> {
    const result = await this.authService.refreshToken(token);
    return {
      ...result,
      refresh_token: token
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: number) {
    await this.usersService.remove(id);
    return { message: 'User deleted successfully' };
  }
}
