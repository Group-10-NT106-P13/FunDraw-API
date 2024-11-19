import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JWTTokenService } from '../jwtToken/jwtToken.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private jwtToken: JWTTokenService,
    ) {}

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
        const refreshToken = await this.jwtToken.setRefreshToken(userId);

        return {
            accessToken,
            refreshToken,
        };
    }
}
