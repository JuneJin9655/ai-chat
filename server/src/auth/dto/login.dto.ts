import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class LoginDto {
    @ApiProperty({
        example: 'john_doe',
        description: 'Username, At least 3 characters',
        minLength: 3
    })
    @IsString()
    @IsNotEmpty()
    @MinLength(3, { message: 'Username must be at least 3 characters' })
    username: string;


    @ApiProperty({
        example: 'Password123!',
        description: 'Password, At least 6 characters',
        minLength: 6,
        format: 'password'
    })
    @IsNotEmpty()
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    password: string;
}

export class LoginResponseDto {
    @ApiProperty({
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        description: 'Access_token'
    })
    access_token: string;

    @ApiProperty({
        example: 'abc123xyz789',
        description: 'Refresh_token'
    })
    refresh_token: string;
}