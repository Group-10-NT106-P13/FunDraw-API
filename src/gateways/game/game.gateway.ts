import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
    WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    transport: ['websocket'],
    namespace: 'game',
})
export class GameGateway {
    @WebSocketServer()
    server: Server;

    constructor(private readonly gameService: GameService) {}

    @SubscribeMessage('createRoom')
    async handleCreateRoom(
        client: Socket, 
        payload: RoomSetting
    ) {
        // Authorization
        const token = <string>client.handshake.query.token;
        const player = await this.userAuthorization(token);
        if (!player) {
            client.emit('message', 'Unauthorized');
            client.disconnect();
            return;
        }

        // Create room
        const roomCode = await this.gameService.createRoom(player, payload);
        if (!roomCode) {
            client.emit('message', 'No setting provided');
            client.disconnect();
            return;
        }
        client.join(roomCode);
        console.log(player.username + ' created room: ' + roomCode);
    }

    @SubscribeMessage('hostStartGame')
    async handleHostStartGame(
        client: Socket,
        roomCode: string
    ) {
        // Authorization
        const token = <string>client.handshake.query.token;
        const player = await this.userAuthorization(token);
        if (!player) {
            client.emit('message', 'Unauthorized');
            client.disconnect();
            return;
        }

        // Start game
        const result = await this.gameService.hostStartGame(player, roomCode);
        if (!result) {
            client.emit('message', 'Room not found');
            client.disconnect();
            return;
        }
        console.log(player.username + ' started game in room: ' + roomCode);
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(client: Socket, room: string): void {
        
    }

    @SubscribeMessage('leaveRoom')
    handleLeaveRoom(client: Socket, room: string): void {
        client.leave(room);
        console.log(`Client ${client.id} left room: ${room}`);
        this.server
            .to(room)
            .emit('notification', `User ${client.id} has left room: ${room}`);
    }

    @SubscribeMessage('message')
    handleMessage(
        client: Socket,
        payload: { room: string; sender: string; message: string },
    ): void {
        console.log(
            `Message from ${payload.sender} in room ${payload.room}: ${payload.message}`,
        );
        this.server.to(payload.room).emit('message', {
            sender: payload.sender,
            message: payload.message,
        });
    }

    async userAuthorization(token: string): Promise<Player | null> {
        const result = await this.gameService.userAuthorization(token);
        if (result == "unauthorized") 
            return null;
        const { id, username, avatar } = result;
        return { id, username, avatar };
    }
}
