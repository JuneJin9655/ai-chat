export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || '000000',
    access: {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '30s',
      cookieMaxAge: parseInt(process.env.JWT_ACCESS_COOKIE_MAXAGE || '30000', 10) // 30秒
    },
    refresh: {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '1m',
      cookieMaxAge: parseInt(process.env.JWT_REFRESH_COOKIE_MAXAGE || '60000', 10) // 1分钟
    }
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  }
});
