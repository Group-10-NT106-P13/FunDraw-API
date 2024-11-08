import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@liaoliaots/nestjs-redis';

@Injectable()
export class AuthService {
    private readonly redis: Redis | null;

    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
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

        const isValidPassword = bcrypt.compare(password, user.password);

        if (!isValidPassword) throw new BadRequestException('Invalid password');

        delete (user as any).password;
        const accessToken = await this.jwtService.signAsync(
            { id: user.id },
            {
                secret: this.configService.get('accessTokenSecret'),
                expiresIn: '15m',
            },
        );
        const refreshToken = await this.jwtService.signAsync(
            { id: user.id },
            {
                secret: this.configService.get('refreshTokenSecret'),
                expiresIn: '7d',
            },
        );

        await this.redis?.set(`accessToken:${accessToken}`, user.id, 'EX', 900); // 15 minutes
        await this.redis?.set(
            `refreshToken:${refreshToken}`,
            user.id,
            'EX',
            604800,
        ); // 7 days

        return {
            user,
            accessToken,
            refreshToken,
        };
    }

    async validateAccessToken(token: string) {
        try {
            const { id } = await this.jwtService.verifyAsync<{ id: string }>(
                token.replace('Bearer ', ''),
                { secret: this.configService.get('refreshTokenSecret') },
            );

            const userId = await this.redis?.get(`accessToken:${token}`);
            const user = await this.prisma.users.findUnique({
                where: {
                    id,
                },
            });

            if (!user) {
                throw new BadRequestException('auth/invalid-token');
            }

            const accessToken = await this.jwtService.signAsync(
                { id: user.id },
                {
                    secret: this.configService.get('accessTokenSecret'),
                    expiresIn: this.configService.get('accessTokenExpiresIn'),
                },
            );
            const newRefreshToken = await this.jwtService.signAsync(
                { id: user.id },
                {
                    secret: this.configService.get('refreshTokenSecret'),
                    expiresIn: this.configService.get('refreshTokenExpiresIn'),
                },
            );

            return { accessToken, newRefreshToken };
        } catch (e) {
            throw new BadRequestException(e.message);
        }
    }
}
