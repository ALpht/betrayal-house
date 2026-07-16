import { VictoryCondition } from "../../../victory/VictoryCondition.js";
import { VictoryResult } from "../../../victory/VictoryResult.js";

export class SealedGalleryVictoryCondition extends VictoryCondition {
    evaluate(context, state) {
        if ((state.get("mistakes") || 0) >= 3) {
            return VictoryResult.traitor("sealedGallery", "too_many_mistakes");
        }

        if ((state.get("sequenceIndex") || 0) >= 3) {
            return VictoryResult.heroes("sealedGallery", "gallery_unsealed");
        }

        if ((state.get("turnsElapsed") || 0) >= 10) {
            return VictoryResult.traitor("sealedGallery", "gallery_sealed");
        }

        return null;
    }
}
