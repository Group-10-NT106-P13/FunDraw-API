import {
    BadRequestException,
    Body,
    Controller,
    HttpCode,
    Post,
    Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Request } from 'express';
import { Public } from 'src/decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import {
    ApiBody,
    ApiHeader,
    ApiOperation,
    ApiParam,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @Public()
    @ApiOperation({
        summary: 'Authenticate user',
    })
    @ApiBody({ type: LoginDto })
    @ApiResponse({
        status: 200,
        description: 'Successfully authenticated.',
        content: {
            'application/json': {
                example: {
                    statusCode: 200,
                    message: 'Login successful',
                    data: {
                        user: {
                            id: '8bf7b1b4-7b7b-4b7b-8b7b-7b7b7b7b7b7b',
                            username: 'user',
                            email: 'user@lt.id.vn',
                            createdAt: '2024-11-17T13:41:39.712Z',
                            avatar: null,
                        },
                        accessToken:
                            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijhi...',
                        refreshToken:
                            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhiZj...',
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
                    message: 'Account does not exists',
                    error: 'Bad Request',
                    statusCode: 400,
                },
            },
        },
    })
    async login(@Body() loginDto: LoginDto) {
        const { user, accessToken, refreshToken } =
            await this.authService.login(loginDto);

        return {
            statusCode: 200,
            message: 'Login successful',
            data: {
                user,
                accessToken,
                refreshToken,
            },
        };
    }

    @Post('register')
    @Public()
    @ApiOperation({
        summary: 'Register user',
    })
    @ApiBody({ type: RegisterDto })
    @ApiResponse({
        status: 201,
        description: 'Successfully registered.',
        content: {
            'application/json': {
                example: {
                    statusCode: 201,
                    message: 'Register successful',
                    data: {
                        user: {
                            id: '8bf7b1b4-7b7b-4b7b-8b7b-7b7b7b7b7b7b',
                            username: 'user',
                            email: 'user@lt.id.vn',
                            createdAt: '2024-11-17T13:41:39.712Z',
                            avatar: null,
                        },
                        accessToken:
                            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijhi...',
                        refreshToken:
                            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhiZj...',
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
                    message: 'Username already exists!',
                    error: 'Bad Request',
                    statusCode: 400,
                },
            },
        },
    })
    async register(@Body() registerDto: RegisterDto) {
        const { user, accessToken, refreshToken } =
            await this.authService.register(registerDto);

        return {
            statusCode: 201,
            message: 'Register successful',
            data: {
                user,
                accessToken,
                refreshToken,
            },
        };
    }

    @Post('refresh-token')
    @Public()
    @ApiOperation({
        summary: 'Refresh token',
    })
    @ApiParam({
        name: 'refreshToken',
        required: true,
        type: 'string',
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully refreshed tokens.',
        content: {
            'application/json': {
                example: {
                    statusCode: 200,
                    message: 'Token refreshed',
                    data: {
                        accessToken:
                            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijhi...',
                        refreshToken:
                            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjhiZj...',
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
                    message: 'Invalid Token',
                    error: 'Bad Request',
                    statusCode: 400,
                },
            },
        },
    })
    async refreshToken(@Req() req: Request) {
        const refreshToken = req.query['refreshToken'] as string;

        const { accessToken, newRefreshToken } =
            await this.authService.refreshToken(refreshToken);

        return {
            statusCode: 200,
            message: 'Token refreshed',
            data: {
                accessToken,
                refreshToken: newRefreshToken,
            },
        };
    }

    @Post('logout')
    @ApiOperation({
        summary: 'Unauthenticate user',
    })
    @ApiHeader({
        name: 'Authorization',
        description: 'Bearer <token>',
    })
    @ApiResponse({
        status: 200,
        description: 'Successfully unauthenticate user.',
        content: {
            'application/json': {
                example: {
                    statusCode: 200,
                    message: 'Logout successful',
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
    @HttpCode(200)
    async logout(@Req() req: any) {
        const userId = req['user']?.id;

        await this.authService.logout(userId);

        return {
            statusCode: 200,
            message: 'Logout successful',
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
            await this.authService.changePassword(userId, password);

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
