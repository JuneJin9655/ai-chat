import { CreateUserDto } from '../../users/dto/create-user.dto';
import { BaseUserResponseDto } from '../../users/dto/user.dto';

export class RegisterDto extends CreateUserDto {}

export class RegisterResponseDto extends BaseUserResponseDto {}
