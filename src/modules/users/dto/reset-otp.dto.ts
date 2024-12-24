import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ResetOTPDto {
    @IsString()
    @ApiProperty()
    email: string;

    @IsString()
    @ApiProperty()
    otp: string;

    @IsString()
    @ApiProperty()
    password: string;

    @IsString()
    @ApiProperty()
    confirm_password: string;
}
