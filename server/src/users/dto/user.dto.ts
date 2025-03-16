import { Role } from 'src/common/enums/roles.enum';

export class BaseUserResponseDto {
    id: number;
    username: string;
    email?: string;
    role: Role;
    createdAt: Date;
    updatedAt: Date;
}

export class UserDto extends BaseUserResponseDto { }

export class PaginatedUsersResponseDto {
    users: UserDto[];
    total: number;
}