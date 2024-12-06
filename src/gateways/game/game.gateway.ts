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

@WebSocketGateway()
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

    @SubscribeMessage('createRoom')
    handleCreateRoom(client: Socket) {
        const roomId: string = this.gameService.generateLobbyCode();
        const room = this.gameService.createRoom(client.id, roomId);
        client.join(roomId);
        client.emit('roomCreated', { roomId, room });
    }

    @SubscribeMessage('modifyRoom')
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

    @SubscribeMessage('startGame')
    handleStartGame(client: Socket, { roomId }: { roomId: string }) {
        const room = this.gameService.getRoom(roomId);
        if (!room) return;

        if (room.state !== 'waiting') {
            client.emit('error', { message: 'Game already started!' });
            return;
        }

        this.turnService.startGame(roomId, this.server);
    }
}
