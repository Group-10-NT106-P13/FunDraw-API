import { RedisService } from '@liaoliaots/nestjs-redis';
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import { PUBLIC_KEY } from 'src/decorators/public.decorator';
import { UsersService } from 'src/modules/users/users.service';

@Injectable()
export class WsAuthGuard implements CanActivate {
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

        const client = context.switchToWs().getClient();
        const token = client.handshake.query.token;

        if (!token) {
            client.emi('error', 'Unauthorized');
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

        client.user = user;

        return true;
    }
}