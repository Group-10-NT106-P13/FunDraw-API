import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JWTTokenService } from '../jwtToken/jwtToken.service';

@Module({
    controllers: [AuthController],
    providers: [AuthService, JWTTokenService],
    imports: [PrismaModule, JwtModule],
})
export class AuthModule {}
