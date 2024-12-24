import {
    BadRequestException,
    Body,
    Controller,
    Get,
    Post,
    Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiBody, ApiHeader, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from 'src/decorators/public.decorator';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('profile')
    @ApiOperation({
        summary: 'Get user profile',
    })
    @ApiHeader({
        name: 'Authorization',
        description: 'Bearer <token>',
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully fetch user profile.',
        content: {
            'application/json': {
                example: {
                    statusCode: 200,
                    data: {
                        id: '8bf7b1b4-7b7b-4b7b-8b7b-7b7b7b7b7b7b',
                        username: 'user',
                        email: 'user@lt.id.vn',
                        createdAt: '2024-11-17T13:41:39.712Z',
                        avatar: null,
                    },
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

        const { accessToken } = await this.usersService.changePassword(
            userId,
            password,
        );

        return {
            statusCode: 200,
            message: 'Password change successful',
            data: {
                accessToken,
            },
        };
    }

    @Post('reset-password')
    @ApiOperation({
        summary: 'Reset user password',
    })
    @ApiBody({ type: ResetPasswordDto })
    @ApiResponse({
        status: 200,
        description: 'Successfully sent an email to reset user password.',
        content: {
            'application/json': {
                example: {
                    statusCode: 200,
                    message:
                        'Successfully sent reset password link, please check your email',
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
                    message: 'User not found!',
                    error: 'Bad Request',
                    statusCode: 400,
                },
            },
        },
    })
    @Public()
    async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
        const { email } = resetPasswordDto;

        await this.usersService.resetPassword(email);

        return {
            statusCode: 200,
            message:
                'Successfully sent reset password link, please check your email',
        };
    }
}
