import { ExplorationRule } from "../gameplay/exploration/ExplorationRule.js";

const DELTA_TO_DIRECTION = Object.freeze({
    "0,-1": "north",
    "1,0": "east",
    "0,1": "south",
    "-1,0": "west"
});

export class ExplorationLoopController {
    constructor(
        graph,
        exploreController,
        turnManager,
        explorationRule = null
    ) {
        this.graph = graph;
        this.exploreController = exploreController;
        this.turnManager = turnManager;
        this.explorationRule = explorationRule || new ExplorationRule({
            graph,
            exploreController,
            turnManager
        });
    }

    moveOrExplore(player, dx, dy) {
        const direction = DELTA_TO_DIRECTION[`${dx},${dy}`];
        if (!direction) {
            return false;
        }

        return this.explorationRule.executeMove(player, direction).accepted;
    }

    moveOrExploreDirection(player, direction) {
        return this.explorationRule.executeMove(player, direction);
    }

    endTurn() {
        this.turnManager.nextTurn();
    }
}
