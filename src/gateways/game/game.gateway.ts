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
            if (room.state == "waiting" && room.host == client.id) {
                console.log(room.id, 'was deleted because host left the room');
                this.server.to(room.id).emit('roomClosed', "Host left the room");
                this.gameService.deleteRoom(room.id);
                return;
            };
            await this.gameService.removePlayer(room.id, client.id);
            this.server.to(room.id).emit('playerList', room.players);
        }
        console.log(`Client ${client.id} disconnected`);
    }

    @SubscribeMessage('createRoom')
    async handleCreateRoom(client: Socket) {
        const roomId: string = this.gameService.generateLobbyCode();
        const room = this.gameService.createRoom(client, roomId);      
        await this.gameService.addPlayer(roomId, client.id);
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
        if (room.state !== 'changing_turn') {
            client.emit('chooseWord', { error: 'Not selecting word!' });
            return;
        }
        if (!this.turnService.awaitSelectWords.includes(word)) {
            client.emit('chooseWord', { error: 'Not in word selection list!' });
            return;
        }
        if (this.turnService.currentDrawer.get(roomId) !== client.id) {
            client.emit('chooseWord', { error: 'You are not the drawer!' });
            return;
        }

        room.currentWord = word;
        console.log(roomId, 'word selected:', room.currentWord);
        this.server.to(client.id).emit('chooseWord', { state: 'you-selected' });
        room.players.forEach((player) => {
            if (player.id === client.id) return;
            this.server.to(player.id).emit('chooseWord', { state: 'selected' });
        });

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
        this.server.to(roomId).emit('playerList', room.players);
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

        client.emit('playerList', room.players);
    }

    @SubscribeMessage('chatMessage')
    handleChatMessage(client: Socket, { roomId, message }: { roomId: string; message: string }) {
        const room = this.gameService.getRoom(roomId);
        if (!room) {
            client.emit('chatMessage', JSON.stringify({ error: 'Room not found!' }));
            return;
        }

        if (room.state == 'playing') {
            const guessedPlayer = this.turnService.guessedPlayer.get(roomId);
            if (guessedPlayer?.includes(client.id)) {        
                guessedPlayer.forEach(player => {
                    this.server.to(player).emit('chatGuessed', JSON.stringify({ message, sender: client.id }))
                });
                return;
            }
            if (this.turnService.answerHandler(roomId, this.server, client.id, message)) {        
                this.server.to(roomId).emit('chatGuessed', JSON.stringify({ message: "guessed", sender: client.id }));
                return;
            }
        }

        this.server.to(roomId).emit('chatMessage', JSON.stringify({ message, sender: client.id }));
    }
}
