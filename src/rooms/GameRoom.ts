import { Room, Client } from "colyseus";
import { GameRoomState, Player, GamePhase } from './schema/GameRoomState';

export class GameRoom extends Room<GameRoomState> {
    maxClients = 2;

    gridSize: number = 10;
    startingFleetHealth: number = 2 + 3 + 3 + 4 + 5;
    placements: Array<Array<number>>;
    playerHealth: Array<number>;
    playersPlaced: number = 0;
    playerCount: number = 0;

    onCreate(option: any) {
        console.log("room", this.roomId, "create!");
        this.setState(new GameRoomState());

        this.onMessage("place", (client, message) => {
            console.log('place', message);

            if (!message) return;

            let player: Player = this.state.players.get(client.sessionId);

            if (!player) return;

            console.log(`player ${player.seat} placed ships`);

            this.placements[player.seat - 1] = message['placement'];
            this.playersPlaced++;

            if (this.playersPlaced == 2) {
                this.state.phase = GamePhase.battle;
            }

        });

        this.onMessage("turn", (client, message) => {
            console.log('turn', message);

            if (!message) return;

            let player: Player = this.state.players.get(client.sessionId);

            if (!player) return;

            if (this.state.playerTurn != player.seat) return;

            let targetIndex: number = message['targetIndex'];
            let shots = player.seat == 1 ? this.state.player1Shots : this.state.player2Shots;
            let targetPlayerIndex: number = player.seat == 1 ? 1 : 0;
            let targetedPlacement = this.placements[targetPlayerIndex];

            if (targetedPlacement[targetIndex] > 0 && shots[targetIndex] == 0) {
                shots[targetIndex] = 1; //hit
                this.playerHealth[targetPlayerIndex]--;
            } else if (targetedPlacement[targetIndex] == 0 && shots[targetIndex] == 0) {
                shots[targetIndex] = 2; //miss
            }

            if (this.playerHealth[targetPlayerIndex] <= 0) {
                this.state.winningPlayer = player.seat;
                this.state.phase = GamePhase.result;
            } else {
                this.state.playerTurn = this.state.playerTurn == 1 ? 2 : 1;
            }

        });

        this.reset();
    }

    onJoin(client: Client, options: any) {
        console.log(client.sessionId, "joined!");

        let player: Player = new Player();
        player.sessionId = client.sessionId;
        player.seat = this.playerCount + 1;
        player.connected = true;

        this.state.players.set(client.sessionId, player);
        this.playerCount++;

        if (this.playerCount == 2) {
            this.lock();
            this.clock.setTimeout(() => {
                this.state.phase = GamePhase.place;
            }, 1000);
        }
    }

    async onLeave(client: Client, consented: boolean) {
        console.log(client.sessionId, "left!", consented);

        // flag client as inactive for other users
        this.state.players.get(client.sessionId).connected = false;
        try {
            if (consented) {
                throw new Error("consented leave");
            }

            // get reconnection token
            const reconnection = this.allowReconnection(client);

            this.clock.setTimeout(() => {
                if (this.state.phase == GamePhase.waiting) {
                    // manually reject the client reconnection
                    reconnection.reject();
                    this.clock.clear();
                }
            }, 20000);

            // allow disconnected client to reconnect
            await reconnection;

            // client returned! let's re-activate it.
            this.state.players.get(client.sessionId).connected = true;

        } catch (e) {

            // 20 seconds expired. let's remove the client.
            this.state.players.delete(client.sessionId);
            this.playerCount--;
            this.state.phase = GamePhase.waiting;
        }
    }

    onDispose() {
        console.log("room", this.roomId, "disposing...");
    }

    reset() {
        this.playerHealth = new Array<number>();
        this.playerHealth[0] = this.startingFleetHealth;
        this.playerHealth[1] = this.startingFleetHealth;

        this.placements = new Array<Array<number>>();
        this.placements[0] = new Array<number>();
        this.placements[1] = new Array<number>();

        let cellCount = this.gridSize * this.gridSize;
        let state = new GameRoomState();

        state.phase = GamePhase.waiting;
        state.playerTurn = 1;
        state.winningPlayer = -1;

        for (var i = 0; i < cellCount; i++) {
            this.placements[0][i] = 0;
            this.placements[1][i] = 0;

            state.player1Shots[i] = 0;
            state.player2Shots[i] = 0;
        }

        this.setState(state);
        this.playersPlaced = 0;
    }
}