import { DocumentBuilder } from '@nestjs/swagger';
import { SwaggerTheme, SwaggerThemeNameEnum } from 'swagger-themes';

export const documentConfig = new DocumentBuilder()
    .setTitle('FunDraw')
    .setDescription('API cho FunDraw - Ứng dụng game vẽ và đoán hình')
    .setVersion('0.0.1')
    .build();

const theme = new SwaggerTheme();
export const documentOptions = {
    explorer: false,
    customCss: theme.getBuffer(SwaggerThemeNameEnum.NORD_DARK),
};
