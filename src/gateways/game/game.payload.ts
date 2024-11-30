type RoomSetting = {
    host: Player
    playerCounts: number
    drawTime: number
    rounds: number
    wordCounts: number
    hints: number
    words: string[] | null
}

type Room = {
    state: 'waiting' | 'changing_round' | 'playing' | 'end'
    setting: RoomSetting
    players: Player[]
    round: number
    endRoundTime: number
    drawer: Player | null
    drawers: Player[]
    currentWord: string | null
    hints: number
    scores: PlayerScore[]
}

type Player = {
    id: string
    username: string
    avatar: string | null
}

type PlayerScore = {
    id: string
    score: number
}