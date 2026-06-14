import { TurnManager }
    from '../state/TurnManager.js';

import { Player }
    from '../model/Player.js';

import { EventBus }
    from '../core/EventBus.js';

import { EventTypes }
    from '../core/EventTypes.js';

export function runTurnManagerTest() {

    EventBus.clear();

    console.log(
        '===== TurnManager Test ====='
    );

    EventBus.on(

        EventTypes.TURN_CHANGED,

        payload => {

            console.log(
                'TURN_CHANGED',
                payload
            );

        }

    );

    const turnManager =
        new TurnManager();

    const mockCharacter = {

        id: 'test',

        name: 'Test Hero',

        stats: {

            speed: 4,
            might: 4,
            sanity: 4,
            knowledge: 4

        }

    };

    const player1 =
        new Player(mockCharacter);

    const player2 =
        new Player(mockCharacter);

    turnManager.start([
        player1,
        player2
    ]);

    console.log(
        'Case 1 - Started:',
        turnManager.hasStarted()
    );

    console.log(
        'Case 2 - Current Player:',
        turnManager
            .getCurrentPlayer()
            .id === player1.id
    );

    console.log(
        'Case 3 - Current Index:',
        turnManager
            .getCurrentPlayerIndex()
    );

    const idleTurnManager =
        new TurnManager();

    console.log(
        'Case 4 - Current Before Start:',
        idleTurnManager
            .getCurrentPlayer()
    );

    console.log(
        'Case 5 - Index Before Start:',
        idleTurnManager
            .getCurrentPlayerIndex()
    );

    try {

        const emptyTurnManager =
            new TurnManager();

        emptyTurnManager.start([]);

    }
    catch (error) {

        console.log(
            'Case 6 - Empty Player Test:',
            error.message
        );

    }

    turnManager.nextTurn();

    console.log(
        'Case 7 - After Next Turn Index:',
        turnManager
            .getCurrentPlayerIndex()
    );

    console.log(
        'Case 8 - Current Player Is Player2:',
        turnManager
            .getCurrentPlayer()
            .id === player2.id
    );

    turnManager.nextTurn();

    console.log(
        'Case 9 - Loop Back Index:',
        turnManager
            .getCurrentPlayerIndex()
    );

    console.log(
        'Case 10 - Current Player Is Player1:',
        turnManager
            .getCurrentPlayer()
            .id === player1.id
    );

    console.log(
        'Case 11 - isCurrentPlayer(player1):',
        turnManager
            .isCurrentPlayer(
                player1
            )
    );

    console.log(
        'Case 12 - isCurrentPlayer(player2):',
        turnManager
            .isCurrentPlayer(
                player2
            )
    );

}