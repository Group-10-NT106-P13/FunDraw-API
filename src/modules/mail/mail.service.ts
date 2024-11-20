import { RedisService } from '@liaoliaots/nestjs-redis';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private readonly redis: Redis | null;

    constructor(
        private readonly redisService: RedisService,
        private configService: ConfigService,
    ) {
        this.redis = this.redisService.getOrThrow();
    }

    async sendResetPasswordMail(email: string, user: string, token: string) {
        const resetPasswordLink =
            'https://' +
            this.configService.get('host') +
            '/users/reset-password?token=' +
            token;

        const transporter = nodemailer.createTransport({
            host: this.configService.get('MAIL_HOST'),
            port: 587,
            requireTLS: true,
            auth: {
                user: this.configService.get('MAIL_USER'),
                pass: this.configService.get('MAIL_PASS'),
            },
            logger: true,
        });

        await transporter.sendMail({
            from: `FunDraw <${this.configService.get('MAIL_SENDAS')}>`,
            to: email,
            subject: 'Đặt lại mật khẩu',
            text: 'Đặt lại mật khẩu',
            html: `<!DOCTYPE html><html lang="en"><head> <meta charset="UTF-8"> <meta name="viewport" content="width=device-width, initial-scale=1.0"> <title>FunDraw | Đặt lại mật khẩu</title> <style> body { font-family: Arial, sans-serif; background-color: #f4f4f9; margin: 0; padding: 0; } .email-container { max-width: 600px; margin: 50px auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); overflow: hidden; } .email-header { background: #1e2d3d; color: #ffffff; text-align: center; padding: 20px; } .email-header h1 { margin: 0; font-size: 24px; } .email-body { padding: 20px; color: #333333; line-height: 1.6; } .email-body p { margin: 0 0 15px; } .email-body .link { color: #ff6b6b; } .reset-button { display: inline-block; padding: 12px 20px; background: #ff6b6b; color: #ffffff; text-decoration: none; border-radius: 4px; font-size: 16px; margin-top: 10px; } .email-footer { text-align: center; padding: 15px; font-size: 12px; color: #777777; background: #f4f4f9; } .email-footer a { color: #b39ddb; text-decoration: none; } </style></head><body> <div class="email-container"> <div class="email-header"> <h1>Đặt lại mật khẩu - FunDraw</h1> </div> <div class="email-body"> <p>Xin chào, ${user}</p> <p>Để đặt lại mật khẩu của bạn, nhấp vào nút dưới đây:</p> <p style="text-align: center;"> <a href="${resetPasswordLink}" class="reset-button">Đặt lại mật khẩu</a> </p> <p>Không thể nhấp nút trên? Sao chép liên kết dưới đây:</p> <a class="link">${resetPasswordLink}</a> </div> <div class="email-footer"> <p>Ứng dụng game vẽ và đoán hình. Đồ án môn Lập trình mạng căn bản NT106.</p> <p>Làm bởi Group 10 - <a href="https://fundraw.lt.id.vn">GitHub</a> </div> </div></body></html>`,
        });

        return true;
    }
}
