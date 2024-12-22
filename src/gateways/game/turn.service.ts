import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
@Injectable()
export class TurnService {
    private logger = new Logger(TurnService.name);

    constructor(private readonly roomService: GameService) {}

    private turns: Map<string, string[]> = new Map();
    public awaitSelectWords: string[] = [];
    private awaitSelectTime: Map<string, NodeJS.Timeout> = new Map();
    private playerScores: Map<string, Map<string, number>> = new Map();
    private drawSteps: Map<string, string[]> = new Map();

    startRound(roomId: string, server: Server) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        this.turns.set(roomId, room.players);

        this.roomService.updateRoomState(roomId, 'changing_round');
        delete (room as any).currentWord;

        server.to(roomId).emit('gameInfo', JSON.stringify(room));

        this.chooseWord(roomId, server);
    }

    chooseWord(roomId: string, server: Server) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        const drawer = <string>this.turns.get(roomId)?.shift();
        const words = this.getRandomWords(room.words, room.wordsCount);
        this.awaitSelectWords = words;
        server.to(drawer).emit('chooseWord', words.join(','));

        console.log(roomId, 'choosing a word...');

        this.awaitSelectTime.set(
            roomId,
            setTimeout(() => {
                if (!room.currentWord) {
                    room.currentWord = this.getRandomWords(words, 1)[0];
                    server
                        .to(drawer)
                        .emit(
                            'chooseWord',
                            JSON.stringify({
                                message:
                                    "You didn't choose the word. Chose you a word.",
                                word: room.currentWord,
                            }),
                        );
                }
            }, 15 * 1000),
        );
    }

    startTurn(roomId: string, server: Server) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        clearTimeout(this.awaitSelectTime.get(roomId));
        this.awaitSelectTime.delete(roomId);

        room.state = 'playing';
        delete (room as any).currentWord;
        delete (room as any).words;
        server.to(roomId).emit('gameInfo', JSON.stringify(room));

        room.turnTimer = setTimeout(() => {
            console.log('turn end!');
        }, room.turnDuration * 1000);
    }

    endTurn(roomId: string, server: Server) {}

    getRandomWords(arr: string[], count: number) {
        const unique = [...new Set(arr)];
        if (unique.length < count) return [];
        return unique.sort(() => Math.random() - 0.5).slice(0, count);
    }

    endRound(roomId: string, server: Server) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        // Update state to "changing_round"
        // this.roomService.updateRoomState(roomId, 'changing_round');

        // server.to(roomId).emit('roundEnd', {
        //     message: `Round ${room.currentRound} ended.`,
        // });

        // // Reset player index and increment round
        // room.currentPlayerIndex = 0;
        // room.currentRound++;

        // // Check if the game is over
        // if (room.currentRound > room.totalRounds) {
        //     server.to(roomId).emit('gameOver', { message: 'Game over!' });
        //     this.roomService.deleteRoom(roomId);
        // } else {
        //     // Wait a few seconds before starting the next round
        //     setTimeout(() => {
        //         this.roomService.updateRoomState(roomId, 'playing');
        //         server.to(roomId).emit('roundStart', {
        //             message: `Round ${room.currentRound} started!`,
        //         });

        //         this.startTurn(roomId, server);
        //     }, 3000); // Change round delay (3 seconds)
        // }
    }
}
