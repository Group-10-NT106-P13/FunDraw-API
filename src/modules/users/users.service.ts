import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) {}

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
}
