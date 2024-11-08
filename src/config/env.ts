export default () => ({
    accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || 'access token secret',
    refreshTokenSecret:
        process.env.REFRESH_TOKEN_SECRET || 'refresh token secret',
});
