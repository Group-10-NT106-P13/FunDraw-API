import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { GameService } from './game.service';

@Injectable()
export class TurnService {
    private logger = new Logger(TurnService.name);

    constructor(private readonly roomService: GameService) {}

    startGame(roomId: string, server: Server) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        this.roomService.updateRoomState(roomId, 'playing');

        server.to(roomId).emit('gameStarted', {
            message: `Game started! Round ${room.currentRound}`,
        });

        this.startTurn(roomId, server);
    }

    startTurn(roomId: string, server: Server) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        const playerId = room.players[room.currentPlayerIndex];
        const turnDuration = room.turnDuration;

        server.to(roomId).emit('turnStart', {
            playerId: playerId,
            turnDuration: turnDuration,
        });

        room.turnTimer = setTimeout(() => {
            this.endTurn(roomId, server);
        }, turnDuration * 1000);

        this.logger.log(`Player ${playerId}'s turn started in room ${roomId}`);
    }

    endTurn(roomId: string, server: Server) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        const playerId = room.players[room.currentPlayerIndex];
        server.to(roomId).emit('turnEnd', { playerId: playerId });

        // Move to the next player
        room.currentPlayerIndex++;

        // Check if all players have played in the current round
        if (room.currentPlayerIndex >= room.players.length) {
            this.endRound(roomId, server);
        } else {
            // Start the next player's turn
            this.startTurn(roomId, server);
        }
    }

    endRound(roomId: string, server: Server) {
        const room = this.roomService.getRoom(roomId);
        if (!room) return;

        // Update state to "changing_round"
        this.roomService.updateRoomState(roomId, 'changing_round');

        server.to(roomId).emit('roundEnd', {
            message: `Round ${room.currentRound} ended.`,
        });

        // Reset player index and increment round
        room.currentPlayerIndex = 0;
        room.currentRound++;

        // Check if the game is over
        if (room.currentRound > room.totalRounds) {
            server.to(roomId).emit('gameOver', { message: 'Game over!' });
            this.roomService.deleteRoom(roomId);
        } else {
            // Wait a few seconds before starting the next round
            setTimeout(() => {
                this.roomService.updateRoomState(roomId, 'playing');
                server.to(roomId).emit('roundStart', {
                    message: `Round ${room.currentRound} started!`,
                });

                this.startTurn(roomId, server);
            }, 3000); // Change round delay (3 seconds)
        }
    }
}
