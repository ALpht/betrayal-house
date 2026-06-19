import { TraitorAssignmentRule }
    from "./TraitorAssignmentRule.js";

export class RandomTraitorRule
    extends TraitorAssignmentRule {

    assign({ players }) {

        if (
            !players
            || players.length === 0
        ) {

            throw new Error(
                "No players available for traitor assignment"
            );

        }

        const index =
            Math.floor(
                Math.random()
                * players.length
            );

        return {
            traitorPlayerId:
                players[index].id
        };

    }

}
