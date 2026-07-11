import { CardPresentationModel } from "../model/CardPresentationModel.js";
import { InformationScope } from "../../scenario/information/InformationScope.js";

const EMPTY_MODEL = new CardPresentationModel({
    cards: [],
    title: "Cards",
    emptyMessage: "No cards drawn."
});

export class CardPresentationQuery {

    buildModel(runtime) {
        if (!runtime) {
            return EMPTY_MODEL;
        }

        const router = runtime.router;
        const playerId = null;
        const visiblePackets = router.getVisiblePackets(playerId, null);

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
