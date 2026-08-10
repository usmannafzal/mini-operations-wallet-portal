import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation for every endpoint's DTOs:
  //  - whitelist: strip properties that aren't in the DTO
  //  - forbidNonWhitelisted: reject requests that send unknown properties (clear 400)
  //  - transform: instantiate DTO classes and run @Transform (e.g. currency -> upper case)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger / OpenAPI docs, served at /docs. Built from the @Api* decorators on the
  // controllers and DTOs, so the docs stay in sync with the code.
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mini Operations Wallet Portal')
    .setDescription('Users, wallets, transactions, and daily reporting API')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
