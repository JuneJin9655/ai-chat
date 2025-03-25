import { NextRequest, NextResponse } from "next/server";

// 定义公开路径
const PUBLIC_PATHS = ['/'];

export function middleware(request: NextRequest) {
    const token = request.cookies.get('access_token')?.value;
    const path = request.nextUrl.pathname;

    // 检查路径是否需要认证（不是公开路径）
    const requiresAuth = !PUBLIC_PATHS.some(publicPath =>
        path === publicPath || path.startsWith('/api/public')
    );

    // 未登录用户尝试访问需要认证的路径
    if (!token && requiresAuth) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/chat/:path*', '/']
};