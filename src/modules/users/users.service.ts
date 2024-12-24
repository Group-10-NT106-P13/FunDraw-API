import {
    BadRequestException,
    HttpException,
    HttpStatus,
    Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JWTTokenService } from '../jwtToken/jwtToken.service';
import * as bcrypt from 'bcrypt';
import { MailService } from '../mail/mail.service';
import { RedisService } from '@liaoliaots/nestjs-redis';
import Redis from 'ioredis';

@Injectable()
export class UsersService {
    private readonly redis: Redis | null;

    constructor(
        private readonly redisService: RedisService,
        private prisma: PrismaService,
        private jwtToken: JWTTokenService,
        private mailService: MailService,
    ) {
        this.redis = this.redisService.getOrThrow();
    }

    async profile(userId: string) {
        const user = await this.prisma.users.findUnique({
            where: {
                id: userId,
            },
        });

        if (!user) {
            throw new BadRequestException();
        }

        delete (user as any).password;
        delete (user as any).accessToken;
        delete (user as any).refreshToken;

        return user;
    }

    async findById(id: string) {
        const user = await this.prisma.users.findUnique({
            where: {
                id,
            },
        });

        if (!user) {
            throw new BadRequestException('User not found!');
        }

        delete (user as any).password;

        return user;
    }

    async changePassword(userId: string, password: string) {
        const hashed_password = await bcrypt.hash(password, 10);

        await this.prisma.users.update({
            where: {
                id: userId,
            },
            data: {
                password: hashed_password,
            },
        });

        await this.jwtToken.clearOldTokens(userId);
        const accessToken = await this.jwtToken.setAccessToken(userId);

        return {
            accessToken,
        };
    }

    async resetPassword(email: string) {
        const user = await this.prisma.users.findUnique({
            where: {
                email,
            },
        });

        if (!user) {
            throw new BadRequestException('User not found!');
        }

        if (await this.redis?.get('resetPassword:' + email)) {
            const ttl = await this.redis?.ttl('resetPasswordEmail:' + email);
            throw new HttpException(
                `You can only send another reset password request after ${ttl} seconds`,
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }

        const otp = Array.from({ length: 6 }, () =>
            Math.floor(Math.random() * 10),
        ).join('');

        await this.mailService.sendResetPasswordMail(email, user.username, otp);
        await this.redis?.set(`resetPassword:${email}`, user.id, 'EX', 900);
        await this.redis?.set(
            `resetPassword:${email}:${otp}`,
            user.id,
            'EX',
            900,
        );

        return true;
    }

    async resetOTP(email: string, otp: string, password: string) {
        const userId = await this.redis?.get(`resetPassword:${email}:${otp}`);

        if (!userId) {
            throw new BadRequestException('Invalid OTP');
        }

        const hashed_password = await bcrypt.hash(password, 10);

        await this.prisma.users.update({
            where: {
                id: userId,
            },
            data: {
                password: hashed_password,
            },
        });

        return true;
    }
}
