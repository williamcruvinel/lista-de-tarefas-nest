import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { TasksModule } from 'src/tasks/tasks.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';
import { AuthModule } from 'src/auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { PrismaService } from 'src/prisma/prisma.service';
import * as dotenv from 'dotenv';
import { execSync } from 'node:child_process';

dotenv.config({ path: '.env.test' });

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  beforeAll(() => {
    execSync('npx prisma migrate deploy');
  });

  beforeEach(async () => {
    execSync(
      'cross-env DATABASE_URL=postgresql://postgres:99751915@localhost:5432/aula-Nest-test?schema=public npx prisma migrate deploy',
    );

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
        TasksModule,
        UsersModule,
        AuthModule,
        ServeStaticModule.forRoot({
          rootPath: join(__dirname, '..', '..', 'files'),
          serveRoot: '/files',
        }),
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );
    prismaService = module.get<PrismaService>(PrismaService);

    await app.init();
  });

  afterEach(async () => {
    await prismaService.user.deleteMany();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/users', () => {
    it('/users (POST) - createUsers', async () => {
      const createUsersDto = {
        name: 'William',
        email: 'william@teste.com',
        password: '123456',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUsersDto)
        .expect(201);

      expect(response.body).toEqual({
        id: response.body.id,
        name: 'William',
        email: 'william@teste.com',
      });
    });

    it('/users (POST) - weak password', async () => {
      const createUserDto = {
        name: 'William',
        email: 'teste@teste.com',
        password: '123',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(400);
    });

    it('/users (PATCH) - update user', async () => {
      const createUserDto = {
        name: 'Thaynara Alves',
        email: 'thaynara@teste.com',
        password: '123123',
      };

      const updateUserDto = {
        name: 'Thaynara A. Cruvinel',
      };

      const user = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      const auth = await request(app.getHttpServer()).post('/auth').send({
        email: createUserDto.email,
        password: createUserDto.password,
      });

      expect(auth.body.token).toEqual(auth.body.token);

      const response = await request(app.getHttpServer())
        .patch(`/users/${auth.body.id}`)
        .set('Authorization', `Bearer ${auth.body.token}`)
        .send(updateUserDto);

      expect(response.body).toEqual({
        id: auth.body.id,
        name: updateUserDto.name,
        email: createUserDto.email,
      });
    });

    it('/users (DELETE) - delete a user', async () => {
      const createUserDto = {
        name: 'Davi',
        email: 'davi@teste.com',
        password: '123123',
      };

      const user = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(201);

      const auth = await request(app.getHttpServer()).post('/auth').send({
        email: createUserDto.email,
        password: createUserDto.password,
      });

      const response = await request(app.getHttpServer())
        .delete(`/users/${user.body.id}`)
        .set('Authorization', `Bearer ${auth.body.token}`);

      expect(response.body).toEqual({
        id: response.body.id,
        name: 'Davi',
        email: 'davi@teste.com',
      });
    });
  });
});
