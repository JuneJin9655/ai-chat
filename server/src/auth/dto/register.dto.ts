import { CreateUserDto } from "../../users/dto/create-user.dto";
import { BaseUserResponseDto } from "../../users/dto/user.dto";

export class RegisterDto extends CreateUserDto {
    // 已经从 CreateUserDto 继承了所有必要的字段和验证
}

// 继承基础用户响应DTO
export class RegisterResponseDto extends BaseUserResponseDto { }