import { RedisService } from "@liaoliaots/nestjs-redis";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { WsException } from "@nestjs/websockets";
import Redis from "ioredis";
import { JWTTokenService } from "src/modules/jwtToken/jwtToken.service";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { UsersService } from "src/modules/users/users.service";

@Injectable()
export class GameService {
    private readonly redis: Redis | null;

    constructor(
        private prisma: PrismaService,
        private jwtToken: JWTTokenService,
        private usersService: UsersService,
        private readonly redisService: RedisService,
    ) {
        this.redis = this.redisService.getOrThrow();
    }

    async createRoom(host: Player, setting: RoomSetting) {
        if (!setting) return null;
        const roomCode = this.generateRoomCode();
        setting.host = host;
        const room: Room = {
            state: 'waiting',
            setting,
            players: [ host ],
            round: -1,
            endRoundTime: -1,
            drawer: null,
            drawers: [],
            currentWord: null,
            hints: setting.hints,
            scores: [ { id: host.id, score: 0 }],
        }

        await this.redis?.set(`gameLobby:${roomCode}`, JSON.stringify(room));
        return roomCode;
    }

    async hostStartGame(host: Player, roomCode: string) {  
        const room = await this.redis?.get(`gameLobby:${roomCode}`);
        if (!room) {
            throw new WsException('Room not found');
        }
        const roomData = JSON.parse(room);

        if (roomData.setting.host.id !== host.id) {
            throw new WsException('Unauthorized');
        }

        roomData.state = 'changing_round';
        roomData.round = 1;
        roomData.endRoundTime = Date.now() + roomData.setting.rounds * roomData.setting.drawTime * 1000;
        roomData.drawer = roomData.players[0];
        roomData.currentWord = roomData.setting.words ? roomData.setting.words[0] : null;
        roomData.hints = roomData.setting.hints;
        roomData.scores = roomData.players.map((player: Player) => ({ id: player.id, score: 0 }));

        await this.redis?.set(`gameLobby:${roomCode}`, JSON.stringify(room));
        return room;
    }

    private generateRoomCode(): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        return Array.from({ length: 8 }, () => characters[Math.floor(Math.random() * characters.length)]).join('');
    }

    async userAuthorization(token: string) {
        const id = await this.redis?.get(`accessToken:${token}`);

        if (!id) {
            return "unauthorized";
        }

        const user = await this.usersService.findById(id);

        if (!user) {
            return "unauthorized";
        }

        return user;
    }
}