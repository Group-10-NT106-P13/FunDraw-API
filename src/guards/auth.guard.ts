import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PUBLIC_KEY } from '../decorators/public.decorator';
import { UsersService } from '../modules/users/users.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class AuthGuard implements CanActivate {
    private readonly redis: Redis | null;

    constructor(
        private usersService: UsersService,
        private readonly redisService: RedisService,
        private reflector: Reflector,
    ) {
        this.redis = this.redisService.getOrThrow();
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const is_public = this.reflector.get<boolean>(
            PUBLIC_KEY,
            context.getHandler(),
        );

        if (is_public) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException();
        }

        const id = await this.redis?.get(`accessToken:${token}`);

        if (!id) {
            throw new UnauthorizedException('Invalid token!');
        }

        const user = await this.usersService.findById(id);

        if (!user) {
            throw new UnauthorizedException('Invalid token!');
        }

        request['user'] = user;

        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : type;
    }
}
