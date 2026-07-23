// src/model/Player.js

import { PlayerStats } from './PlayerStats.js';
import { createRuntimeId } from '../core/RuntimeId.js';

export class Player {

    constructor(character) {

        this.id = createRuntimeId();

        this.character = character;

        this.stats =
            new PlayerStats(
                character.stats
            );

        this.currentRoom = null;

        this.items = [];

        this.omens = [];

        this.isAlive = true;

    }

    getCurrentRoom() {

        return this.currentRoom;

    }

    getPosition() {

        if (!this.currentRoom) {

            return null;

        }

        return {

            x: this.currentRoom.x,
            y: this.currentRoom.y

        };

    }

}
