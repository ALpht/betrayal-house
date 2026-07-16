import { CardPresentationModel } from "../model/CardPresentationModel.js";
import { InformationScope } from "../../scenario/information/InformationScope.js";

const EMPTY_MODEL = new CardPresentationModel({
    cards: [],
    title: "Cards",
    emptyMessage: "No cards drawn."
});

export class CardPresentationQuery {
    #routerProvider;
    #viewerProvider;
    #traitorProvider;

    constructor({
        routerProvider = null,
        viewerProvider = () => null,
        traitorProvider = () => null
    } = {}) {
        this.#routerProvider = routerProvider;
        this.#viewerProvider = viewerProvider;
        this.#traitorProvider = traitorProvider;
    }

    buildModel(runtime) {
        const router = this.#routerProvider
            ? this.#routerProvider()
            : runtime?.router;

        if (!router) {
            return EMPTY_MODEL;
        }

        const playerId = this.#viewerProvider();
        const traitorPlayerId = this.#traitorProvider();
        const visiblePackets = router.getVisiblePackets(playerId, traitorPlayerId);

        const cardPackets = visiblePackets.filter(
            p => p.scope === InformationScope.CARD
        );

        const cards = cardPackets.map(p => ({
            id: p.payload.cardId,
            name: p.payload.name,
            type: p.payload.type,
            description: p.payload.description,
            triggerType: p.payload.triggerType
        }));

        return new CardPresentationModel({
            cards,
            title: "Cards",
            emptyMessage: "No cards drawn."
        });
    }

}
