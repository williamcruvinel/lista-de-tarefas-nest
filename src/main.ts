import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
  - 'src/app.module.ts' : Módulo principal do aplicativo.
  - 'src/app.controller.ts' : Define as rotas e lida com as requisições.
  - 'src/app.service.ts' : Contém a lógica de negócio, separado do controlador.
 */

// Arquivo que inicia o nosso projeto;
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove as chaves que não estão no DTO
    }),
  );

  const configSwagguer = new DocumentBuilder()
    .setTitle('Lista da Tarefas')
    .setDescription('API Lista da Tarefas')
    .addBearerAuth()
    .setVersion('1.0')
    .build();

  const documentFactory = () =>
    SwaggerModule.createDocument(app, configSwagguer);

  SwaggerModule.setup('docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
