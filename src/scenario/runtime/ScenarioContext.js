/**
 * ScenarioContext
 *
 * Read-Only Gateway
 *
 * 提供 Scenario 存取遊戲世界的唯讀介面。
 * 禁止透過此 Gateway 修改遊戲狀態。
 * 所有狀態修改應透過 ScenarioState 或 ScenarioController。
 *
 * Context 提供查詢能力
 * 不提供狀態修改責任
 */
export class ScenarioContext {
    #players;
    #gameState;
    #graphMap;
    #cardManager;

    constructor({ players, gameState, graphMap, cardManager }) {
        this.#players = players;
        this.#gameState = gameState;
        this.#graphMap = graphMap;
        this.#cardManager = cardManager;
    }

    get players() {
        return this.#players;
    }

    get gameState() {
        return this.#gameState;
    }

    get graphMap() {
        return this.#graphMap;
    }

    get cardManager() {
        return this.#cardManager;
    }
}
