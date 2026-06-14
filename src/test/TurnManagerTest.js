import { TurnManager }
    from '../state/TurnManager.js';

export function runTurnManagerTest() {

    console.log(
        '===== TurnManager Test ====='
    );

    const turnManager =
        new TurnManager();

    console.log(
        'TurnManager Created:',
        turnManager
    );

}