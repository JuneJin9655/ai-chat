import { NextRequest, NextResponse } from "next/server";

// 定义公开路径
const PUBLIC_PATHS = ['/', '/about', '/login', '/register', '/contact'];

const API_PATH_PREFIX = '/api';

const EXCLUDED_PATHS = ['/favicon.ico', '/_next', '/images', '/fonts'];

export function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname;

    if (EXCLUDED_PATHS.some(excludedPath => path.startsWith(excludedPath))) {
        return NextResponse.next();
    }

    if (path.startsWith(API_PATH_PREFIX)) {
        return NextResponse.next();
    }

    const token = request.cookies.get('access_token')?.value;

    // 检查路径是否需要认证（不是公开路径）
    const requiresAuth = !PUBLIC_PATHS.some(publicPath =>
        path === publicPath || path.startsWith(`${publicPath}/`)
    );

    // 未登录用户尝试访问需要认证的路径
    if (!token && requiresAuth) {
        const loginUrl = new URL('/', request.url);
        loginUrl.searchParams.set('showLogin', 'true');
        loginUrl.searchParams.set('redirect', path); // 保存用户想要访问的路径

        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/|images/|favicon.ico).*)'
    ]
};