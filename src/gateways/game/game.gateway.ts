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
import { UseGuards } from '@nestjs/common';
import { WsAuthGuard } from 'src/guards/wsauth.guard';
import Redis from 'ioredis';
import { RedisService } from '@liaoliaots/nestjs-redis';
import { UsersService } from 'src/modules/users/users.service';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
    transport: ['websocket'],
    namespace: 'game',
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly redis: Redis | null;

    constructor(
        private readonly gameService: GameService,
        private readonly turnService: TurnService,
        private readonly redisService: RedisService,
        private usersService: UsersService,
    ) {
        this.redis = this.redisService.getOrThrow();
    }

    async handleConnection(client: Socket) {
        const token = client.handshake.query.token;
        if (!token) {
            client.emit('error', {
                error: 'Unauthorized',
                message: 'Unauthorized!',
            });
            client.disconnect();
            return;
        }

        const id = await this.redis?.get(`accessToken:${token}`);
        if (!id) {
            client.emit('error', {
                error: 'Unauthorized',
                message: 'Invalid token!',
            });
            return;
        }
        const user = await this.usersService.findById(id);
        if (!user) {
            client.emit('error', {
                error: 'Unauthorized',
                message: 'Invalid token!',
            });
            return;
        }

        this.gameService.connectedClients.set(client.id, user.username);

        console.log(`Client connected: ${user.username} (${client.id})`);
        client.emit('ping', 'pong');
    }

    async handleDisconnect(client: Socket) {
        const room = await this.gameService.getPlayerRoomOnDisconnect(
            client.id,
        );
        if (room) {
            if (room.state == 'waiting' && room.host == client.id) {
                console.log(
                    'Room ID:',
                    room.id,
                    'was deleted because host left the room',
                );
                this.server
                    .to(room.id)
                    .emit('roomClosed', 'Host left the room');
                this.gameService.deleteRoom(room.id);
                return;
            }
            await this.gameService.removePlayer(room.id, client.id);
            this.server.to(room.id).emit('playerList', room.players);
        }
        console.log(
            `Client disconnected: ${this.gameService.connectedClients.get(client.id)} (${client.id})`,
        );
        this.gameService.connectedClients.delete(client.id);
    }

    @UseGuards(WsAuthGuard)
    @SubscribeMessage('createRoom')
    async handleCreateRoom(client: Socket) {
        const roomId: string = this.gameService.generateLobbyCode();
        const room = this.gameService.createRoom(client, roomId);
        await this.gameService.addPlayer(roomId, client.id);
        client.join(roomId);
        client.emit('roomCreated', JSON.stringify(room));
        console.log('Room Created:', roomId);
    }

    @UseGuards(WsAuthGuard)
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
            client.emit(
                'startGame',
                JSON.stringify({ error: 'Room not found!' }),
            );
            return;
        }

        if (room.state !== 'waiting') {
            client.emit(
                'startGame',
                JSON.stringify({ error: 'Room not found!' }),
            );
            return;
        }

        this.gameService.modifyRoom(roomId, {
            playersCount,
            totalRounds: roundsCount,
            turnDuration: drawTime,
            wordsCount,
            hintsCount,
        });

        if (room.players.length < 2) {
            client.emit(
                'startGame',
                JSON.stringify({
                    error: 'At least 2 players is required to start the game!',
                }),
            );
            return;
        }

        this.server
            .to(roomId)
            .emit('startGame', JSON.stringify({ status: 'changing_round' }));

        console.log('Game started:', roomId);

        setTimeout(() => {
            this.turnService.startRound(roomId, this.server);
        }, 1000);
    }

    @UseGuards(WsAuthGuard)
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

    @UseGuards(WsAuthGuard)
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

    @UseGuards(WsAuthGuard)
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

    @UseGuards(WsAuthGuard)
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

    @UseGuards(WsAuthGuard)
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

    @UseGuards(WsAuthGuard)
    @SubscribeMessage('chatMessage')
    handleChatMessage(
        client: Socket,
        { roomId, message }: { roomId: string; message: string },
    ) {
        const room = this.gameService.getRoom(roomId);
        if (!room) {
            client.emit(
                'chatMessage',
                JSON.stringify({ error: 'Room not found!' }),
            );
            return;
        }

        if (room.state == 'playing') {
            const guessedPlayer = this.turnService.guessedPlayer.get(roomId);
            if (guessedPlayer?.includes(client.id)) {
                guessedPlayer.forEach((player) => {
                    this.server.to(player).emit(
                        'chatGuessed',
                        JSON.stringify({
                            message,
                            sender: this.gameService.connectedClients.get(
                                client.id,
                            ),
                        }),
                    );
                });
                return;
            }
            if (
                this.turnService.answerHandler(
                    roomId,
                    this.server,
                    client.id,
                    message,
                )
            ) {
                this.server.to(roomId).emit(
                    'chatGuessed',
                    JSON.stringify({
                        message: 'guessed',
                        sender: this.gameService.connectedClients.get(
                            client.id,
                        ),
                    }),
                );
                return;
            }
        }

        this.server.to(roomId).emit(
            'chatMessage',
            JSON.stringify({
                message,
                sender: this.gameService.connectedClients.get(client.id),
            }),
        );
    }
}
