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

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private usersService: UsersService,
        private reflector: Reflector,
    ) {}

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
            throw new UnauthorizedException('auth/invalid-token');
        }

        try {
            const { id } = await this.jwtService.verifyAsync<{ id: string }>(
                token,
                {
                    secret: process.env.ACCESS_TOKEN_SECRET,
                },
            );

            const user = await this.usersService.findById(id);

            if (!user) {
                throw new UnauthorizedException('auth/invalid-token');
            }

            request['user'] = user;
        } catch (e) {
            throw new UnauthorizedException(
                'auth/' + e.message.replaceAll(' ', '-'),
                e.message,
            );
        }
        return true;
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : type;
    }
}
