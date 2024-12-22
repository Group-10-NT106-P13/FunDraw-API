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
import { PayloadEvent } from './game.payload';

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

    async handleDisconnect(client: Socket) {
        const room = await this.gameService.getPlayerRoomOnDisconnect(
            client.id,
        );
        if (room) {
            await this.gameService.removePlayer(room.id, client.id);
            this.server.to(room.id).emit('playerList', room.players.join(','));
        }
        console.log(`Client ${client.id} disconnected`);
    }

    @SubscribeMessage('createRoom')
    handleCreateRoom(client: Socket) {
        const roomId: string = this.gameService.generateLobbyCode();
        const room = this.gameService.createRoom(client, roomId);
        client.join(roomId);
        client.emit('roomCreated', JSON.stringify(room));
        console.log('Room Created:', roomId);
    }

    @SubscribeMessage('startGame')
    handleStartGame(
        client: Socket,
        {
            roomId,
            playersCount,
            drawTime,
            roundsCount,
            wordsCount,
            hintsCount,
        }: {
            roomId: string;
            playersCount: number;
            drawTime: number;
            roundsCount: number;
            wordsCount: number;
            hintsCount: number;
        },
    ) {
        const room = this.gameService.getRoom(roomId);
        if (!room) {
            client.emit('startGame', { error: 'Room not found!' });
            return;
        }

        if (room.state !== 'waiting') {
            client.emit('startGame', { error: 'Room not found!' });
            return;
        }

        this.gameService.modifyRoom(roomId, {
            playersCount,
            totalRounds: roundsCount,
            turnDuration: drawTime,
            wordsCount,
            hintsCount,
        });

        this.server
            .to(roomId)
            .emit('startGame', JSON.stringify({ status: 'changing_round' }));

        console.log('Game started:', roomId);

        setTimeout(() => {
            this.turnService.startRound(roomId, this.server);
        }, 1000);
    }

    @SubscribeMessage('chooseWord')
    handleChooseWord(
        client: Socket,
        { roomId, word }: { roomId: string; word: string },
    ) {
        const room = this.gameService.getRoom(roomId);
        if (!room) {
            client.emit('chooseWord', { error: 'Room not found!' });
            return;
        }
        if (room.state !== 'changing_round') {
            client.emit('chooseWord', { error: 'Not selecting word!' });
            return;
        }
        if (!this.turnService.awaitSelectWords.includes(word)) {
            client.emit('chooseWord', { error: 'Not in word selection list!' });
            return;
        }

        room.currentWord = word;
        this.server.to(client.id).emit('chooseWord', 'word_selected');
        this.turnService.startTurn(roomId, this.server);
    }

    @SubscribeMessage('roomInfo')
    handleRoomInfo(client: Socket, { roomId }: { roomId: string }) {
        const room = this.gameService.getRoom(roomId);
        if (!room) {
            client.emit(
                'roomInfo',
                JSON.stringify({ error: 'Room not found!' }),
            );
            return;
        }

        client.emit('roomInfo', JSON.stringify(room));
    }

    @SubscribeMessage('joinRoom')
    async handleJoinRoom(client: Socket, { roomId }: { roomId: string }) {
        const room = this.gameService.getRoom(roomId);
        if (!room) {
            client.emit(
                'joinRoom',
                JSON.stringify({ error: 'Room not found!' }),
            );
            console.log(`Room not found: ${roomId}`);
            return;
        }

        await this.gameService.addPlayer(roomId, client.id);

        client.join(roomId);
        client.emit('joinRoom', JSON.stringify(room));
        this.server.to(roomId).emit('playerList', room.players.join(','));
    }

    @SubscribeMessage('drawEvent')
    handleDrawData(
        client: Socket,
        { roomId, payload }: { roomId: string; payload: PayloadEvent },
    ) {
        const room = this.gameService.getRoom(roomId);
        if (!room) {
            client.emit(
                'drawEvent',
                JSON.stringify({ error: 'Room not found!' }),
            );
            return;
        }

        if (room.state !== 'playing') {
            client.emit('drawEvent', JSON.stringify({ error: 'Not drawing!' }));
            return;
        }

        console.log(roomId, 'draw event', payload);
        this.server.to(roomId).emit('drawEvent', JSON.stringify(payload));
    }

    @SubscribeMessage('playerList')
    handlePlayerList(client: Socket, { roomId }: { roomId: string }) {
        const room = this.gameService.getRoom(roomId);
        if (!room) {
            client.emit(
                'playerList',
                JSON.stringify({ error: 'Room not found!' }),
            );
            console.log(`Room not found: ${roomId}`);
            return;
        }

        client.emit('playerList', room.players.join(','));
    }

    @SubscribeMessage('playerScore')
    handlePlayerScore(client: Socket, { roomId }: { roomId: string }) {
        const room = this.gameService.getRoom(roomId);
        if (!room) {
            client.emit(
                'playerList',
                JSON.stringify({ error: 'Room not found!' }),
            );
            console.log(`Room not found: ${roomId}`);
            return;
        }

        client.emit('playerScore', room.players.join(','));
    }
}
