import { Injectable } from '@nestjs/common';

@Injectable()
export class GameService {
    private rooms: Map<
        string,
        {
            host: string;
            playersCount: number;
            players: string[];
            currentPlayerIndex: number;
            currentRound: number;
            totalRounds: number;
            wordsCount: number;
            hintsCount: number;
            turnTimer: NodeJS.Timeout | null;
            turnDuration: number;
            words: string[];
            currentWord: string | null;
            state: 'waiting' | 'playing' | 'changing_round' | 'end';
        }
    > = new Map();

    private testRooms: Map<string, { event: string }> = new Map();

    createTestRoom(roomId: string) {
        this.testRooms.set(roomId, { event: '' });
        return this.getTestRoom(roomId);
    }

    getTestRoom(roomId: string) {
        return this.testRooms.get(roomId);
    }

    updateTestEvent(roomId: string, event: string) {
        const room = this.testRooms.get(roomId);
        if (!room) return false;

        room.event = event;
        return true;
    }

    createRoom(host: string, roomId: string) {
        this.rooms.set(roomId, {
            host: host,
            playersCount: 8,
            players: [host],
            currentPlayerIndex: 0,
            currentRound: 1,
            totalRounds: 3,
            wordsCount: 3,
            hintsCount: 2,
            turnTimer: null,
            turnDuration: 120,
            words: [],
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
            customWords: string[];
        }>,
    ): boolean {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        if (changes.playersCount) room.playersCount = changes.playersCount;
        if (changes.totalRounds) room.totalRounds = changes.totalRounds;
        if (changes.turnDuration) room.turnDuration = changes.turnDuration;
        if (changes.customWords) room.words = changes.customWords;
        if (changes.wordsCount) room.wordsCount = changes.wordsCount;
        if (changes.hintsCount) room.hintsCount = changes.hintsCount;

        return true;
    }

    updatePlayerList(roomId: string, player: string) {
        const room = this.rooms.get(roomId);
        if (!room) return false;

        room.players.push(player);
        return true;
    }

    updateRoomState(
        roomId: string,
        newState: 'waiting' | 'playing' | 'changing_round' | 'end',
    ) {
        const room = this.rooms.get(roomId);
        if (room) {
            room.state = newState;
        }
    }

    deleteRoom(roomId: string) {
        const room = this.rooms.get(roomId);
        if (room?.turnTimer) {
            clearTimeout(room.turnTimer);
        }
        this.rooms.delete(roomId);
    }

    generateLobbyCode = () =>
        Array.from({ length: 8 }, () =>
            'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.charAt(
                Math.floor(Math.random() * 36),
            ),
        ).join('');
}
