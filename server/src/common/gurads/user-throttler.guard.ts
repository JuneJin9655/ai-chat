import { Inject, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type {
  ThrottlerModuleOptions,
  ThrottlerRequest,
  ThrottlerStorage,
} from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

/**
 * 扩展Record接口，定义包含用户信息的请求对象类型
 */
interface RequestWithUser extends Record<string, unknown> {
  user?: {
    id?: string | number;
  };
  route?: {
    path?: string;
  };
  url?: string;
}

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  constructor(
    @Inject('THROTTLER_OPTIONS')
    protected readonly options: ThrottlerModuleOptions,
    protected readonly storageService: ThrottlerStorage,
    protected readonly reflector: Reflector,
  ) {
    super(options, storageService, reflector);
  }

  /**
   * 生成基于用户ID的限流跟踪键
   * @param req 包含用户信息的请求对象
   * @returns 用于限流的跟踪键
   */
  protected async getTracker(req: RequestWithUser): Promise<string> {
    const userId: string = req.user?.id ? String(req.user.id) : 'anonymous';
    // 使用请求路径作为端点标识
    const path: string =
      req.route?.path || (typeof req.url === 'string' ? req.url : 'unknown');

    // 返回字符串，但用Promise包装以匹配基类返回类型
    return Promise.resolve(`throttle:user:${userId}:${path}`);
  }

  /**
   * 处理限流请求，使用自定义的用户追踪器
   * @param requestProps 限流请求属性对象
   * @returns 请求是否被允许通过
   */
  protected async handleRequest(
    requestProps: ThrottlerRequest,
  ): Promise<boolean> {
    // 简化实现，调用父类方法但使用我们自定义的 tracker
    const httpContext = requestProps.context.switchToHttp();

    // 由于NestJS类型系统限制，这里需要忽略一些类型安全检查
    // 实际上，这段代码在运行时是安全的，因为我们只获取必要的属性
    /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
    const rawRequest = httpContext.getRequest();
    const req: RequestWithUser = {
      user: rawRequest.user || { id: 'anonymous' },
      url: typeof rawRequest.url === 'string' ? rawRequest.url : 'unknown',
      route: rawRequest.route || {},
    };
    /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */

    // 保存原始的 getTracker 方法
    const originalGetTracker = requestProps.getTracker;

    // 替换为我们的自定义方法，匹配原始参数签名
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    requestProps.getTracker = async (..._args: unknown[]): Promise<string> =>
      this.getTracker(req);

    try {
      // 调用父类方法处理请求
      return await super.handleRequest(requestProps);
    } finally {
      // 恢复原始方法
      requestProps.getTracker = originalGetTracker;
    }
  }
}
