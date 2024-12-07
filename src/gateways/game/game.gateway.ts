import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
import { TurnService } from './turn.service';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    transport: ['websocket'],
    namespace: 'game',
})
// @UseGuards(WsAuthGuard)
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    constructor(
        private readonly gameService: GameService,
        private readonly turnService: TurnService,
    ) {}

    handleConnection(client: Socket) {
        console.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('createTestRoom')
    handleCreateTestRoom(client: Socket) {
        const roomId: string = this.gameService.generateLobbyCode();
        this.gameService.createTestRoom(roomId);
        client.join(roomId);
        client.emit('roomCreated', roomId);
        console.log('Test Room Created: ', roomId);
    }

    @SubscribeMessage('joinTestRoom')
    handleJoinTestRoom(client: Socket, { roomId }: { roomId: string }) {
        const room = this.gameService.getTestRoom(roomId);
        if (!room) {
            client.emit('error', { message: 'Room not found!' });
            return;
        }

        client.join(roomId);
        client.emit('roomJoined', roomId);
        this.server.to(roomId).emit('playerJoined', client.id);
    }

    @SubscribeMessage('eventUpdateTest')
    handleEventUpdateTest(
        client: Socket,
        { roomId, event }: { roomId: string; event: string },
    ) {
        const room = this.gameService.getTestRoom(roomId);
        if (!room) {
            client.emit('error', { message: 'Room not found!' });
            return;
        }
        this.gameService.updateTestEvent(roomId, event);
        this.server.to(roomId).emit('eventUpdated', event);
    }

    // @SubscribeMessage('createRoom')
    handleCreateRoom(client: Socket) {
        const roomId: string = this.gameService.generateLobbyCode();
        const room = this.gameService.createRoom(client.id, roomId);
        client.join(roomId);
        client.emit('roomCreated', JSON.stringify({ roomId, room }));
        console.log('Room Created:', roomId);
    }

    // @SubscribeMessage('modifyRoom')
    handleModifyRoom(
        client: Socket,
        {
            roomId,
            playersCount,
            drawTime,
            roundsCount,
            wordsCount,
            hintsCount,
            customWords,
        }: {
            roomId: string;
            playersCount: number;
            drawTime: number;
            roundsCount: number;
            wordsCount: number;
            hintsCount: number;
            customWords: string[];
        },
    ) {
        const modify = this.gameService.modifyRoom(roomId, {
            playersCount,
            totalRounds: roundsCount,
            turnDuration: drawTime,
            wordsCount,
            hintsCount,
            customWords,
        });

        if (!modify) {
            client.emit('error', { message: 'Room not found!' });
            return;
        }

        client.emit('roomModifed', { roomId });
    }

    // @SubscribeMessage('startGame')
    handleStartGame(client: Socket, { roomId }: { roomId: string }) {
        const room = this.gameService.getRoom(roomId);
        if (!room) return;

        if (room.state !== 'waiting') {
            client.emit('error', { message: 'Game already started!' });
            return;
        }

        this.turnService.startGame(roomId, this.server);
    }

    // @SubscribeMessage('joinRoom')
    handleJoinRoom(client: Socket, { roomId }: { roomId: string }) {
        const room = this.gameService.getRoom(roomId);
        if (!room) {
            client.emit('error', { message: 'Room not found!' });
            return;
        }

        this.gameService.updatePlayerList(roomId, client.id);

        client.join(roomId);
        client.emit('roomJoined', JSON.stringify({ roomId, room }));
        this.server.to(roomId).emit('playerJoined', client.id);
    }
}
