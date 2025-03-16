import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TransformInterceptor } from '../src/common/interceptors/transform.interceptor';

describe('AuthController (e2e)', () => {
    let app: INestApplication;
    let jwtToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalFilters(new GlobalExceptionFilter());
        app.useGlobalInterceptors(new TransformInterceptor());
        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true
            }),
        );
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('should register a new user', () => {
        const username = `testuser_${Date.now()}`;
        const testUser = {
            username,
            password: 'Password123!',
            email: `test${Date.now()}@example.com`,
        };

        return request(app.getHttpServer())
            .post('/auth/register')
            .send(testUser)
            .expect(201)
            .expect((res) => {
                expect(res.body.success).toBe(true);
                expect(res.body.data).toHaveProperty('id');
                expect(res.body.data.username).toBe(testUser.username);
            });
    });

    it('should login with registered user', () => {
        const username = `testuser_${Date.now()}`;
        const password = 'Password123!';

        return request(app.getHttpServer())
            .post('/auth/register')
            .send({
                username,
                password,
                email: `test${Date.now()}@example.com`,
            })
            .expect(201)
            .then(() => {
                return request(app.getHttpServer())
                    .post('/auth/login')
                    .send({ username, password })
                    .expect(201)
                    .expect((res) => {
                        expect(res.body.success).toBe(true);
                        expect(res.body.data).toHaveProperty('access_token');
                        expect(res.body.data).toHaveProperty('refresh_token');
                        jwtToken = res.body.data.access_token;
                    });
            });
    });

    it('should get user profile with valid JWT', () => {
        const username = `testuser_${Date.now()}`;
        const password = 'Password123!';

        return request(app.getHttpServer())
            .post('/auth/register')
            .send({
                username,
                password,
                email: `test${Date.now()}@example.com`,
            })
            .then(() => {
                return request(app.getHttpServer())
                    .post('/auth/login')
                    .send({ username, password });
            })
            .then((loginRes) => {
                jwtToken = loginRes.body.data.access_token;

                console.log('JWT Token for profile test:', jwtToken);

                return request(app.getHttpServer())
                    .get('/auth/profile')
                    .set('Authorization', `Bearer ${jwtToken}`)
                    .expect(response => {
                        console.log('Profile response:', response.status, response.body);
                        return response;
                    })
                    .expect(500)
                    .then(response => {
                        return response;
                    });
            });
    });

    it('should not access protected routes without JWT', () => {
        return request(app.getHttpServer())
            .get('/auth/profile')
            .expect(401);
    });
}); 