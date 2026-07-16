import { VictoryCondition } from "../../../victory/VictoryCondition.js";
import { VictoryResult } from "../../../victory/VictoryResult.js";

export class MaskedHostVictoryCondition extends VictoryCondition {
    evaluate(context, state) {
        const destroyedMasks = state.get("destroyedCursedMaskIds") || [];

        if (
            state.get("traitorRevealed") === true
            && destroyedMasks.length >= 2
        ) {
            return VictoryResult.heroes("maskedHost", "host_unmasked");
        }

        if ((state.get("turnsElapsed") || 0) >= 9) {
            return VictoryResult.traitor("maskedHost", "masquerade_complete");
        }

        return null;
    }
}
