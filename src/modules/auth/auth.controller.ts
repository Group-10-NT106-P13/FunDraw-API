import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from 'src/decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import {
    ApiBody,
    ApiHeader,
    ApiOperation,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';

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
        const { user, accessToken } = await this.authService.login(loginDto);

        return {
            statusCode: 200,
            message: 'Login successful',
            data: {
                user,
                accessToken,
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
        const { user, accessToken } =
            await this.authService.register(registerDto);

        return {
            statusCode: 201,
            message: 'Register successful',
            data: {
                user,
                accessToken,
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
}
