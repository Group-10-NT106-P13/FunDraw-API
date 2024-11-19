import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Post,
    Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('profile')
    async profile(@Req() req: any) {
        const userId = req['user']?.id;

        const user = await this.usersService.profile(userId);

        return {
            statusCode: 200,
            data: user,
        };
    }

    @Post('change-password')
    @ApiOperation({
        summary: 'Change user password',
    })
    @ApiHeader({
        name: 'Authorization',
        description: 'Bearer <token>',
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully changed user password.',
        content: {
            'application/json': {
                example: {
                    statusCode: 200,
                    message: 'Password change successful',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Bad Request',
        content: {
            'application/json': {
                example: {
                    message: 'Invalid Token!',
                    error: 'Bad Request',
                    statusCode: 400,
                },
            },
        },
    })
    async changePassword(
        @Req() req: any,
        @Body() changePasswordDto: ChangePasswordDto,
    ) {
        const { password, confirm_password } = changePasswordDto;

        if (password !== confirm_password) {
            throw new BadRequestException('Password not match');
        }

        const userId = req['user']?.id;

        const { accessToken, refreshToken } =
            await this.usersService.changePassword(userId, password);

        return {
            statusCode: 200,
            message: 'Password change successful',
            data: {
                accessToken,
                refreshToken,
            },
        };
    }
}
