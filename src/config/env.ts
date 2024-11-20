export default () => ({
    host: process.env.HOST || 'localhost',
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || 'access token secret',
    refreshTokenSecret:
        process.env.REFRESH_TOKEN_SECRET || 'refresh token secret',
    MAIL_HOST: process.env.MAIL_HOST || 'smtp.gmail.com',
    MAIL_USER: process.env.MAIL_USER || '',
    MAIL_SENDAS: process.env.MAIL_SENDAS || '',
    MAIL_PASS: process.env.MAIL_PASS || '',
});
