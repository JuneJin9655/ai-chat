import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { Role } from 'src/common/enums/roles.enum';

@Injectable()
export class IsSelfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.params.id;
    const user = request.user as { userId: number; role: Role } | undefined;

    return (
      !!user && (user.userId === Number(userId) || user.role === Role.ADMIN)
    );
  }
}
