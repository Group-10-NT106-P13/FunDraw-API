import { Body, Controller, Post, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('login')
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
}
