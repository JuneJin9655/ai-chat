import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { Cache } from "cache-manager";
import { Observable } from "rxjs";

@Injectable()
export class LoginLimiterGuard implements CanActivate {
    private readonly MAX_ATTEMPTS = 5;
    private readonly LOCK_DURATION = 1800;

    constructor(
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const username = request.body.username;

        if (!username) return true;

        const key = `login_failed_${username}`;
        const failedAttempts = await this.cacheManager.get<number>(key);

        if (failedAttempts && failedAttempts >= this.MAX_ATTEMPTS) {
            throw new UnauthorizedException('The account has been locked, please try again after 5 minutes');
        }
        return true;
    }
}