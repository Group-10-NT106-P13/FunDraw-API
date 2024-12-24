import { RedisService } from '@liaoliaots/nestjs-redis';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JWTTokenService {
    private readonly redis: Redis | null;

    constructor(
        private readonly redisService: RedisService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private prisma: PrismaService,
    ) {
        this.redis = this.redisService.getOrThrow();
    }

    async setAccessToken(userId: string) {
        const accessToken = await this.jwtService.signAsync(
            { id: userId },
            {
                secret: this.configService.get('accessTokenSecret'),
                expiresIn: '3d',
            },
        );
        await this.prisma.users.update({
            where: {
                id: userId,
            },
            data: {
                accessToken,
            },
        });
        await this.redis?.set(`accessToken:${accessToken}`, userId, 'EX', 900);
        return accessToken;
    }

    async clearOldTokens(userId: string) {
        const user = await this.prisma.users.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) return false;

        await this.redis?.del(`accessToken:${user.accessToken}`);

        return true;
    }
}
