import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Role } from "src/common/enums/roles.enum";

@Injectable()
export class IsSelfGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const userId = request.params.id;
        const user = request.user;

        return user && (user.userId === Number(userId) || user.role === Role.ADMIN);
    }
}