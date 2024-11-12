import { RedisService } from '@liaoliaots/nestjs-redis';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import Redis from 'ioredis';

@Injectable()
export class JWTTokenService {
    private readonly redis: Redis | null;

    constructor(
        private readonly redisService: RedisService,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) {
        this.redis = this.redisService.getOrThrow();
    }

    async setAccessToken(userId: string) {
        const accessToken = await this.jwtService.signAsync(
            { id: userId },
            {
                secret: this.configService.get('accessTokenSecret'),
                expiresIn: '15m',
            },
        );
        await this.redis?.set(`accessToken:${accessToken}`, userId, 'EX', 900);
        return accessToken;
    }

    async setRefreshToken(userId: string) {
        const refreshToken = await this.jwtService.signAsync(
            { id: userId },
            {
                secret: this.configService.get('refreshTokenSecret'),
                expiresIn: '7d',
            },
        );
        await this.redis?.set(
            `refreshToken:${refreshToken}`,
            userId,
            'EX',
            604800,
        );
        return refreshToken;
    }
}
