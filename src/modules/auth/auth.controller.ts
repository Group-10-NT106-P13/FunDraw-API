import {
    Body,
    Controller,
    HttpCode,
    Post,
    Req,
    Res,
    UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Request } from 'express';
import { Public } from 'src/decorators/public.decorator';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from 'src/guards/auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
    @Public()
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
