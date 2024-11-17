import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { RegisterDto } from './dto/register.dto';
import { JWTTokenService } from '../jwtToken/jwtToken.service';

@Injectable()
export class AuthService {
    private readonly redis: Redis | null;

    constructor(
        private prisma: PrismaService,
        private jwtToken: JWTTokenService,
        private readonly redisService: RedisService,
    ) {
        this.redis = this.redisService.getOrThrow();
    }

    async login(loginDto: LoginDto) {
        const { username, password } = loginDto;

        const user = await this.prisma.users.findUnique({
            where: {
                username,
            },
        });

        if (!user) throw new BadRequestException('Account does not exists');

        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) throw new BadRequestException('Invalid password');

        await this.jwtToken.clearOldTokens(user.id);

        delete (user as any).password;
        delete (user as any).accessToken;
        delete (user as any).refreshToken;

        const accessToken = await this.jwtToken.setAccessToken(user.id);
        const refreshToken = await this.jwtToken.setRefreshToken(user.id);

        return {
            user,
            accessToken,
            refreshToken,
        };
    }

    async register(registerDto: RegisterDto) {
        const { username, password, email } = registerDto;

        const userExists = await this.prisma.users.findUnique({
            where: {
                username,
            },
        });

        if (userExists) {
            throw new BadRequestException('Username already exists!');
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await this.prisma.users.create({
            data: {
                username,
                password: hashedPassword,
                email,
            },
        });

        delete (user as any).password;
        delete (user as any).accessToken;
        delete (user as any).refreshToken;

        const accessToken = await this.jwtToken.setAccessToken(user.id);
        const refreshToken = await this.jwtToken.setRefreshToken(user.id);

        return {
            user,
            accessToken,
            refreshToken,
        };
    }

    async refreshToken(token: string) {
        try {
            const id = await this.redis?.get(
                `refreshToken:${token.replace('Bearer ', '')}`,
            );

            if (!id) {
                throw new BadRequestException('Invalid Token');
            }

            const user = await this.prisma.users.findUnique({
                where: {
                    id,
                },
            });

            if (!user) {
                throw new BadRequestException('Invalid Token');
            }

            await this.jwtToken.clearOldTokens(user.id);

            const accessToken = await this.jwtToken.setAccessToken(user.id);
            const newRefreshToken = await this.jwtToken.setRefreshToken(
                user.id,
            );

            return { accessToken, newRefreshToken };
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }

    async logout(userId: string) {
        const user = await this.prisma.users.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) return false;

        await this.jwtToken.clearOldTokens(userId);
        await this.prisma.users.update({
            where: {
                id: userId,
            },
            data: {
                accessToken: null,
                refreshToken: null,
            },
        });

        return true;
    }
}
