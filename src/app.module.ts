import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthService } from './modules/auth/auth.service';
import { AuthController } from './modules/auth/auth.controller';
import { AuthModule } from './modules/auth/auth.module';
import { PrismaService } from './modules/prisma/prisma.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import envConfig from './config/env';
import { RedisModule } from '@liaoliaots/nestjs-redis';
import { UsersService } from './modules/users/users.service';
import { JWTTokenService } from './modules/jwtToken/jwtToken.service';
import { UsersController } from './modules/users/users.controller';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            load: [envConfig],
        }),
        RedisModule.forRoot({
            config: {
                url: process.env.REDIS_URL,
            },
        }),
        AuthModule,
        PrismaModule,
    ],
    controllers: [AppController, AuthController, UsersController],
    providers: [
        AppService,
        AuthService,
        PrismaService,
        JwtService,
        UsersService,
        JWTTokenService,
    ],
})
export class AppModule {}
