import { VictoryCondition }
    from "../victory/VictoryCondition.js";

import { VictoryResult }
    from "../victory/VictoryResult.js";

export class EscapeVictoryCondition
    extends VictoryCondition {

    evaluate(context, state) {

        const escaped =
            state.get("escapedPlayers")
            || [];

        if (escaped.length > 0) {

            return VictoryResult.heroes(
                "escapeTheHouse",
                "escaped"
            );

        }

        return null;

    }

}
