# FunDraw-API

API cho FunDraw - Ứng dụng game vẽ và đoán hình

## Cài đặt project

```sh
npm install
```

## Biên dịch và chạy project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

WebSocket Payload
HOST: <host>/game
@createTestRoom
@joinTestRoom { roomId: string }
@eventUpdateTest { roomId: string, event: string }

Server Events:
roomCreated
playerJoined
roomJoined
eventUpdated
error
