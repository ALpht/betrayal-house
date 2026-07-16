import { ScenarioPresentationModel } from "../model/ScenarioPresentationModel.js";

export class ScenarioPresentationQuery {
    #viewerProvider;
    #traitorProvider;

    constructor({ viewerProvider = () => null, traitorProvider = () => null } = {}) {
        this.#viewerProvider = viewerProvider;
        this.#traitorProvider = traitorProvider;
    }

    buildModel(runtime) {
        const metadata = runtime.getScenarioMetadata();
        const router = runtime.router;

        const playerId = this.#viewerProvider();
        const traitorPlayerId = this.#traitorProvider();
        const visiblePackets = router.getVisiblePackets(playerId, traitorPlayerId);

        const objectivePackets = visiblePackets.filter(
            p => p.scope === "objective"
        );

        const objectiveText = objectivePackets.length > 0
            ? objectivePackets[0].payload?.text
            : metadata.objectives?.heroes || null;

        const visibleInfo = visiblePackets.map(p => ({
            id: p.id,
            scope: p.scope,
            payload: p.payload
        }));

        return new ScenarioPresentationModel({
            scenarioName: metadata.title,
            objectiveText,
            visibleInfo
        });
    }
}
