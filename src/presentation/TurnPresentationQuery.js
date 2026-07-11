import { TurnPresentationModel } from "./TurnPresentationModel.js";

export class TurnPresentationQuery {
    #turnManager;

    constructor({ turnManager }) {
        this.#turnManager = turnManager;
    }

    buildModel(_runtime) {
        const player = this.#turnManager.getCurrentPlayer();
        return new TurnPresentationModel({
            currentPlayerName: player?.name ?? "—"
        });
    }
}
