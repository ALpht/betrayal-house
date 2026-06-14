// src/model/Player.js

import { PlayerStats } from './PlayerStats.js';

export class Player {

    constructor(character) {

        this.id = crypto.randomUUID();

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

}