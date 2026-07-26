import { EventBus } from "../core/EventBus.js";
import { EventTypes } from "../core/EventTypes.js";
import { GameStateManager } from "../state/GameStateManager.js";
import { ActionType } from "../scenario/action/ActionType.js";
import { createLocalGameSession } from "../bootstrap/createLocalGameSession.js";
import { RoomDefinitions } from "../data/RoomDefinitions.js";
import { TileDeck } from "../model/TileDeck.js";

if (typeof document === "undefined") {
    const createElement = tag => {
        const listeners = {};
        const el = {
            tagName: tag.toUpperCase(),
            textContent: "",
            disabled: false,
            children: [],
            parentNode: null,
            appendChild(child) {
                child.parentNode = this;
                this.children.push(child);
                return child;
            },
            removeChild(child) {
                this.children = this.children.filter(c => c !== child);
                child.parentNode = null;
            },
            remove() {
                this.parentNode?.removeChild(this);
            },
            addEventListener(event, handler) {
                listeners[event] = handler;
            },
            removeEventListener(event, handler) {
                if (listeners[event] === handler) {
                    delete listeners[event];
                }
            },
            click() {
                if (!this.disabled) {
                    listeners.click?.();
                }
            }
        };
        return el;
    };

    global.document = { createElement };
}

function createContainers() {
    return {
        turn: document.createElement("pre"),
        character: document.createElement("pre"),
        action: document.createElement("div"),
        scenario: document.createElement("pre"),
        card: document.createElement("pre"),
        victory: document.createElement("pre"),
        status: document.createElement("pre")
    };
}

function findButton(container, label) {
    return container.children.find(child => child.textContent === label) || null;
}

function createOmenFirstTileDeck() {
    const omen = RoomDefinitions.find(room => room.triggerType === "omen");
    const remaining = RoomDefinitions.filter(room => room !== omen);
    return new TileDeck(
        [omen, ...remaining],
        { random: () => 0.999999 }
    );
}

export function runLocalPlayIntegrationTest() {
    console.log("\n===== Local Play Integration Test =====");
    let passed = 0;
    let failed = 0;

    const assert = (ok, label) => {
        if (ok) {
            passed++;
            console.log(`[PASS] ${label}`);
        } else {
            failed++;
            console.log(`[FAIL] ${label}`);
        }
    };

    try {
        let selectedCollectTarget = "relic_1";
        const containers = createContainers();
        const session = createLocalGameSession({
            containers,
            characterIds: ["brandon", "ox"],
            tileDeck: createOmenFirstTileDeck(),
            actionInputProvider: type => {
                if (type === ActionType.COLLECT) {
                    return { itemId: "relic", targetId: selectedCollectTarget };
                }
                if (type === ActionType.MOVE) {
                    return { destination: "exit" };
                }
                return {};
            }
        }).start();

        assert(session.getPlayerManager().getPlayerCount() === 2, "Case 1a: two local players created");
        assert(session.getPlayerManager().getAllPlayers()[0].character.id !== session.getPlayerManager().getAllPlayers()[1].character.id, "Case 1b: characters are unique");
        assert(session.getCurrentPlayer() !== null, "Case 1c: current player exists");
        assert(session.getGraph().getAllRooms().length === 1, "Case 1d: entrance hall exists");
        assert(containers.turn.textContent.length > 0, "Case 1e: turn panel rendered");
        assert(containers.character.textContent.includes("Current Character"), "Case 1f: character panel rendered");

        const moved = session.move("east");
        assert(moved === true, "Case 2a: exploration move succeeds");
        assert(session.getGraph().getAllRooms().length === 2, "Case 2b: room reveal adds room");
        assert(containers.card.textContent.includes("[Omen]"), "Case 3a: omen card displayed");
        assert(session.getRuntime()?.scenarioId === "relicEscape", "Case 4a: normal omen flow creates relicEscape runtime");
        assert(GameStateManager.isHaunt() === true, "Case 4b: game state enters haunt");
        assert(containers.scenario.textContent.includes("Relic Escape"), "Case 4c: scenario panel displays objective");

        for (const target of ["relic_1", "relic_2", "relic_3"]) {
            selectedCollectTarget = target;
            const collectButton = findButton(containers.action, "Collect");
            assert(collectButton !== null, `Case 5 ${target}: collect button exists`);
            collectButton.click();
        }
        assert(session.getRuntime().state.get("collectedRelicIds").length === 3, "Case 5a: PlayerAction pipeline collects three relics");

        const moveButton = findButton(containers.action, "Move");
        assert(moveButton !== null, "Case 7a: scenario move button exists");
        moveButton.click();
        assert(session.getLastVictoryResult()?.winner === "heroes", "Case 7b: existing VictoryCondition produces hero result");
        assert(containers.victory.textContent.includes("Heroes Win"), "Case 7c: VictoryPanel displays result");
        const disabledButtons = containers.action.children.every(button => button.disabled === true);
        assert(disabledButtons === true, "Case 7d: victory disables action input");
        session.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Local play main flow threw", e.message);
    }

    try {
        const originalRandom = Math.random;
        Math.random = () => 0.99;

        const containers = createContainers();
        const session = createLocalGameSession({
            containers,
            characterIds: ["brandon", "ox"]
        }).start();
        session.startScenario("maskedHost");

        assert(!containers.scenario.textContent.includes("Stay hidden"), "Case 9a: hero viewer does not see traitor objective");
        session.endTurn();
        assert(containers.scenario.textContent.includes("Stay hidden"), "Case 9b: traitor viewer sees private objective");
        session.endTurn();
        assert(!containers.scenario.textContent.includes("Stay hidden"), "Case 9c: private objective disappears after viewer switch");

        session.destroy();
        Math.random = originalRandom;
    } catch (e) {
        failed++;
        console.log("[FAIL] Local play visibility threw", e.message);
    }

    try {
        let selectedCollectTarget = "relic_1";
        const oldContainers = createContainers();
        const oldSession = createLocalGameSession({
            containers: oldContainers,
            actionInputProvider: () => ({ itemId: "relic", targetId: selectedCollectTarget })
        }).start();
        oldSession.startScenario("relicEscape");
        oldSession.destroy();

        EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, { scenarioId: "old" });
        assert(oldContainers.action.children.length === 0, "Case 8a: old panels stay clear after destroy");

        const newContainers = createContainers();
        const newSession = createLocalGameSession({
            containers: newContainers,
            actionInputProvider: () => ({ itemId: "relic", targetId: selectedCollectTarget })
        }).start();
        newSession.startScenario("relicEscape");
        const before = newSession.getDispatchCount();
        const collectButton = findButton(newContainers.action, "Collect");
        collectButton.click();
        assert(newSession.getDispatchCount() === before + 1, "Case 8b: one click produces one dispatch after restart");
        assert(newSession.getRuntime().state.get("collectedRelicIds").length === 1, "Case 10a: new runtime receives only new action");
        newSession.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Local play restart threw", e.message);
    }

    console.log(`===== Local Play Integration Test: ${passed} passed, ${failed} failed =====\n`);
}
