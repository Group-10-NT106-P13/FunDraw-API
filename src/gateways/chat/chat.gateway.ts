import {
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    transport: ['websocket'],
    namespace: 'chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('joinRoom')
    handleJoinRoom(client: Socket, room: string): void {
        client.join(room);
        console.log(`Client ${client.id} joined room: ${room}`);
        this.server
            .to(room)
            .emit('notification', `User ${client.id} has joined room: ${room}`);
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
}
