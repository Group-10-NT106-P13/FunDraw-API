import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './modules/users/users.service';
import { AuthGuard } from './guards/auth.guard';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { SwaggerModule } from '@nestjs/swagger';
import { documentConfig, documentOptions } from './config/document';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    const usersService = app.get(UsersService);
    const redisService = app.get(RedisService);
    const reflector = app.get(Reflector);

    app.enableCors({
        origin: true,
        credentials: true,
    });

    app.useGlobalPipes(new ValidationPipe({ stopAtFirstError: true }));
    app.useGlobalGuards(new AuthGuard(usersService, redisService, reflector));

    const document = SwaggerModule.createDocument(app, documentConfig, {
        operationIdFactory: (_: string, methodKey: string) => methodKey,
    });
    SwaggerModule.setup('docs', app, document, documentOptions);

    await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
