import { CharacterDefinitions }
from '../data/CharacterDefinitions.js';

import { Player }
from './Player.js';

export class CharacterFactory {

    static create(characterId) {

        const character =
            CharacterDefinitions.find(
                c => c.id === characterId
            );

        if (!character) {

            throw new Error(
                `Character not found: ${characterId}`
            );

        }

        return new Player(character);

    }

}