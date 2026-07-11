import { VictoryPresentationModel, VictoryState } from "../model/VictoryPresentationModel.js";
import { WINNER } from "../../scenario/victory/VictoryTypes.js";

export class VictoryPresentationQuery {

    buildModel(runtime) {
        const result = runtime.getVictoryResult();

        if (!result) {
            return new VictoryPresentationModel({
                victoryState: VictoryState.IN_PROGRESS,
                winner: null,
                scenarioId: null
            });
        }

        const victoryState = result.winner === WINNER.HEROES
            ? VictoryState.HEROES_WIN
            : VictoryState.TRAITOR_WIN;

        return new VictoryPresentationModel({
            victoryState,
            winner: result.winner,
            scenarioId: result.scenarioId
        });
    }
}
