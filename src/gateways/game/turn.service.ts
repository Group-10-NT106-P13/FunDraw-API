import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { GameService } from './game.service';
@Injectable()
export class TurnService {
    constructor(private readonly roomService: GameService) {}

    private turns: Map<string, string[]> = new Map();

    public awaitSelectWords: string[] = [];
    private awaitSelectTime: Map<string, NodeJS.Timeout> = new Map();

    private nextTurnTime: Map<string, number> = new Map();

    public currentDrawer: Map<string, string> = new Map();
    public guessedPlayer: Map<string, string[]> = new Map();

    async startRound(roomId: string, server: Server) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        room.currentRound++;

        if (room.currentRound > room.totalRounds) {
            this.endGame(roomId, server);
            return;
        }
        
        this.roomService.updateRoomState(roomId, 'changing_turn');

        const playerTurns = room.players.map((player) => player.id);
        this.turns.set(roomId, playerTurns);
        this.guessedPlayer.set(roomId, []);

        server.to(roomId).emit('gameState', room.state);

        this.changeTurn(roomId, server);
    }

    changeTurn(roomId: string, server: Server) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        if (this.turns.get(roomId)?.length == 0) {
            this.startRound(roomId, server);
            return;
        }

        room.state = 'changing_turn';

        this.currentDrawer.set(roomId, "");
        this.guessedPlayer.set(roomId, []);

        this.chooseWord(roomId, server);
    }

    chooseWord(roomId: string, server: Server) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        const drawer = <string>this.turns.get(roomId)?.shift();
        this.currentDrawer.set(roomId, drawer);
        this.guessedPlayer.get(roomId)?.push(drawer);

        const words = this.getRandomWords(room.words, room.wordsCount);
        this.awaitSelectWords = words;

        server.to(drawer).emit('chooseWord', { drawer: '#you', words, timeLeft: Date.now() + 15 * 1000 });

        room.players.forEach((player) => {
            if (player.id == drawer) return;
            server.to(player.id).emit('chooseWord', { drawer, timeLeft: Date.now() + 15 * 1000 });
        });

        console.log(roomId, drawer, 'choosing a word...');

        this.awaitSelectTime.set(
            roomId,
            setTimeout(() => {
                if (!room.currentWord) {
                    room.currentWord = this.getRandomWords(words, 1)[0];
                    server.to(drawer).emit('chooseWord', { state: 'you-selected' });
                }
                this.startTurn(roomId, server);
            }, 15 * 1000),
        );
    }

    startTurn(roomId: string, server: Server) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        clearTimeout(this.awaitSelectTime.get(roomId));
        this.awaitSelectTime.delete(roomId);

        room.state = 'playing';
        this.nextTurnTime.set(roomId, Date.now() + (room.turnDuration + 2) * 1000);

        let word = Array(room.currentWord?.length).fill('_');
        let _reveal = [...Array(room.currentWord?.length).keys()];
        room.turnTimer = setInterval(() => {
            const timeLeft = Math.floor(((this.nextTurnTime.get(roomId)??Date.now()) - Date.now()) / 1000);
            if (timeLeft <= 0) {
                if (room.turnTimer) {
                    clearInterval(room.turnTimer);
                }
                this.endTurn(roomId, server);
                return;
            }

            if (timeLeft == room.turnDuration * 3 / 4) {
                const randomIndex = Math.floor(Math.random() * _reveal.length);
                const indexToReveal = _reveal[randomIndex];

                word[indexToReveal] = room.currentWord ? room.currentWord[indexToReveal] : '';
                _reveal.splice(randomIndex, 1);
            }

            room.players.forEach((player) => {
                if (this.guessedPlayer.get(roomId)?.includes(player.id)) return;
                server.to(player.id).emit('gameProgress', { state: 'playing', timeLeft: timeLeft, word: word.join('  ') });
            });
            this.guessedPlayer.get(roomId)?.forEach((player) => {
                server.to(player).emit('gameProgress', { state: 'playing', timeLeft: timeLeft, word: room.currentWord?.split("").join("  ") });
            });
            
            console.log(roomId,'time left', timeLeft);
        }, 1000);
    }

    answerHandler(roomId: string, server: Server, playerId: string, word: string) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;
        if (word == room.currentWord) {
            this.guessedPlayer.get(roomId)?.push(playerId);
            this.calculateScores(roomId, server, playerId);
            return true;
        }
        return false;
    }

    endTurn(roomId: string, server: Server) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        room.state = 'end_turn';

        server.to(roomId).emit('gameProgress', { state: room.state, word: room.currentWord });
        console.log("end turn!");

        setTimeout(() => {
            if (room.turnTimer) {
                clearInterval(room.turnTimer);
            }
            this.changeTurn(roomId, server);
        }, 5000);
    }

    endGame(roomId: string, server: Server) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        room.state = 'ending';
        server.to(roomId).emit('gameProgress', { state: room.state, players: room.players.sort((a, b) => b.score - a.score) });

        setTimeout(() => {
            room.state = 'end';
            server.to(roomId).emit('gameProgress', { state: room.state });
            this.roomService.deleteRoom(roomId);
        }, 15 * 1000)
    }

    calculateScores(roomId: string, server: Server, player: string) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        const timeLeft = Math.floor(((this.nextTurnTime.get(roomId)??Date.now()) - Date.now()) / 1000);
        const guesserScore = timeLeft;
        const drawerScore = Math.floor(guesserScore / 2);

        room.players.forEach((p) => {
            if (p.id == this.currentDrawer.get(roomId)) p.score += drawerScore;
            if (p.id == player) p.score += guesserScore;
        })

        this.roomService.updatePlayerList(roomId, server);
    }

    getRandomWords(arr: string[], count: number) {
        const unique = [...new Set(arr)];
        if (unique.length < count) return [];
        return unique.sort(() => Math.random() - 0.5).slice(0, count);
    }
}
