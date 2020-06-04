import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema"

export enum GamePhase {
    waiting = 'waiting',
    place = 'place',
    battle = 'battle',
    result = 'result'
}

export class Player extends Schema {
    @type('int16')
    seat: number;

    @type('string')
    sessionId: string;

    @type('boolean')
    connected: boolean;
}

export class GameRoomState extends Schema {
    @type({ map: Player })
    players: MapSchema<Player> = new MapSchema<Player>();

    @type('string')
    phase: string = GamePhase.waiting;

    @type('int16')
    playerTurn: number = 1;

    @type('int16')
    winningPlayer: number = -1;

    @type(['int16'])
    player1Shots: ArraySchema<number> = new ArraySchema<number>();

    @type(['int16'])
    player2Shots: ArraySchema<number> = new ArraySchema<number>();
}