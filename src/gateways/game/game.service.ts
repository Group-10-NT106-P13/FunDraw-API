import { RedisService } from '@liaoliaots/nestjs-redis';
import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { Server, Socket } from 'socket.io';
import { GameState, wordsList } from './game.payload';

@Injectable()
export class GameService {
    private readonly redis: Redis | null;

    constructor(
        private readonly redisService: RedisService,
    ) {
        this.redis = this.redisService.getOrThrow();
    }

    private rooms: Map<
        string,
        {
            id: string;
            host: string;
            playersCount: number;
            players: {
                id: string;
                score: number;
            }[];
            currentRound: number;
            totalRounds: number;
            wordsCount: number;
            hintsCount: number;
            turnTimer: NodeJS.Timeout | null;
            turnDuration: number;
            words: string[];
            currentWord: string | null;
            state: GameState;
        }
    > = new Map();

    createRoom(host: Socket, roomId: string) {
        if (!host.id) return null;
        this.rooms.set(roomId, {
            id: roomId,
            host: host.id,
            playersCount: 8,
            players: [{ id: host.id, score: 0 }],
            currentRound: 0,
            totalRounds: 3,
            wordsCount: 3,
            hintsCount: 2,
            turnTimer: null,
            turnDuration: 120,
            words: wordsList,
            currentWord: null,
            state: 'waiting',
        });

        return this.getRoom(roomId);
    }

    getRoom(roomId: string) {
        return this.rooms.get(roomId);
    }

    modifyRoom(
        roomId: string,
        changes: Partial<{
            playersCount: number;
            totalRounds: number;
            turnDuration: number;
            wordsCount: number;
            hintsCount: number;
            // customWords: string[];
        }>,
    ): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        if (changes.playersCount) room.playersCount = changes.playersCount;
        if (changes.totalRounds) room.totalRounds = changes.totalRounds;
        if (changes.turnDuration) room.turnDuration = changes.turnDuration;
        // if (changes.customWords) room.words = changes.customWords;
        if (changes.wordsCount) room.wordsCount = changes.wordsCount;
        if (changes.hintsCount) room.hintsCount = changes.hintsCount;
        
        return true;
    }

    async addPlayer(roomId: string, player: string) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.players.push({ id: player, score: 0 });
        await this.redis?.set(`playerRoom:${player}`, roomId);
        return true;
    }

    async removePlayer(roomId: string, player: string) {
        const room = await this.rooms.get(roomId);
        if (!room) return false;

        room.players = room.players.filter((p) => p.id !== player);
        return true;
    }

    updateRoomState(
        roomId: string,
        newState: GameState,
    ) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.state = newState;
        }
    }

    updatePlayerList(roomId: string, server: Server) {
        const room = this.rooms.get(roomId);
        if (room) {
            server.to(roomId).emit('playerList', room.players);
        }
    }

    deleteRoom(roomId: string) {
        const room = this.rooms.get(roomId);
        if (room?.turnTimer) {
            clearTimeout(room.turnTimer);
        }
        this.rooms.delete(roomId);
    }

    async getPlayerRoomOnDisconnect(player: string) {
        const roomId = await this.redis?.get(`playerRoom:${player}`);
        if (!roomId) return null;
        const room = this.rooms.get(roomId);
        if (!room) return null;
        return room;
    }

    generateLobbyCode = () =>
        Array.from({ length: 8 }, () =>
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(
                Math.floor(Math.random() * 36),
            ),
        ).join('');
}
