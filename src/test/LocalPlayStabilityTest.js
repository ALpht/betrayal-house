import { EventBus } from "../core/EventBus.js";
import { EventTypes } from "../core/EventTypes.js";
import { GameStateManager } from "../state/GameStateManager.js";
import { ActionType } from "../scenario/action/ActionType.js";
import { createLocalGameSession } from "../bootstrap/createLocalGameSession.js";

if (typeof document === "undefined") {
    const createElement = tag => {
        const listeners = {};
        const el = {
            tagName: tag.toUpperCase(),
            textContent: "",
            disabled: false,
            title: "",
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
            replaceChildren(...children) {
                this.children.forEach(child => { child.parentNode = null; });
                this.children = [];
                children.forEach(child => this.appendChild(child));
            },
            remove() {
                this.parentNode?.removeChild(this);
            },
            setAttribute(name, value) {
                this[name] = value;
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

function createRelicSession({ targetRef = { value: "relic_1" } } = {}) {
    return createLocalGameSession({
        containers: createContainers(),
        characterIds: ["brandon", "ox"],
        actionInputProvider: type => {
            if (type === ActionType.COLLECT) {
                return { itemId: "relic", targetId: targetRef.value };
            }
            if (type === ActionType.MOVE) {
                return { destination: "exit" };
            }
            return {};
        }
    }).start();
}

function startRelicScenario(session) {
    session.startScenario("relicEscape");
    return session.getContainers();
}

function collectRelics(session, targetRef) {
    const containers = session.getContainers();
    for (const target of ["relic_1", "relic_2", "relic_3"]) {
        targetRef.value = target;
        findButton(containers.action, "Collect")?.click();
    }
}

export function runLocalPlayStabilityTest() {
    console.log("\n===== Local Play Stability Test =====");
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
        let totalDispatches = 0;
        for (let i = 0; i < 10; i++) {
            const targetRef = { value: "relic_1" };
            const session = createRelicSession({ targetRef });
            const containers = startRelicScenario(session);
            const before = session.getDispatchCount();
            findButton(containers.action, "Collect")?.click();
            totalDispatches += session.getDispatchCount() - before;
            session.destroy();
            EventBus.emit(EventTypes.SCENARIO_RUNTIME_UPDATED, { scenarioId: "old" });
            assert(containers.action.children.length === 0, `Case 1.${i + 1}: destroyed action panel is empty`);
        }

        assert(totalDispatches === 10, "Case 1a: 10 restart cycles produce exactly 10 dispatches");
    } catch (e) {
        failed++;
        console.log("[FAIL] Restart stress threw", e.message);
    }

    try {
        const targetRef = { value: "relic_1" };
        const session = createRelicSession({ targetRef });
        const containers = startRelicScenario(session);
        const oldRuntime = session.getRuntime();
        const oldButton = findButton(containers.action, "Collect");
        session.destroy();

        const newTargetRef = { value: "relic_1" };
        const newSession = createRelicSession({ targetRef: newTargetRef });
        startRelicScenario(newSession);
        const before = newSession.getDispatchCount();
        oldButton?.click();

        assert(newSession.getDispatchCount() === before, "Case 2a: old DOM button does not dispatch into new session");
        assert(oldRuntime !== newSession.getRuntime(), "Case 2b: runtime identity is replaced after restart");
        newSession.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] DOM cleanup threw", e.message);
    }

    try {
        const targetRef = { value: "relic_1" };
        const session = createRelicSession({ targetRef });
        const containers = startRelicScenario(session);
        collectRelics(session, targetRef);
        findButton(containers.action, "Move")?.click();

        const dispatchBefore = session.getDispatchCount();
        const snapshotBefore = JSON.stringify(session.getRuntime().toSnapshot().state);
        findButton(containers.action, "Collect")?.click();
        const directResult = session.dispatchScenarioAction({
            type: ActionType.COLLECT,
            playerId: session.getCurrentPlayer().id,
            payload: { itemId: "relic", targetId: "late_relic" }
        });
        const snapshotAfter = JSON.stringify(session.getRuntime().toSnapshot().state);

        assert(session.getLastVictoryResult()?.winner === "heroes", "Case 3a: hero victory reached");
        assert(session.getDispatchCount() === dispatchBefore, "Case 3b: victory blocks extra dispatch count");
        assert(snapshotAfter === snapshotBefore, "Case 3c: victory blocks state mutation");
        assert(directResult.success === false, "Case 3d: direct late action is rejected");
        session.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Victory lock threw", e.message);
    }

    try {
        const originalRandom = Math.random;
        Math.random = () => 0.99;

        const session = createLocalGameSession({
            containers: createContainers(),
            characterIds: ["brandon", "ox"]
        }).start();
        session.startScenario("maskedHost");
        const containers = session.getContainers();
        const heroScenarioText = containers.scenario.textContent;
        const heroTurnText = containers.turn.textContent;
        const heroActionCount = containers.action.children.length;

        session.endTurn();
        const traitorScenarioText = containers.scenario.textContent;
        const traitorTurnText = containers.turn.textContent;
        const traitorActionCount = containers.action.children.length;

        session.endTurn();
        const returnedHeroScenarioText = containers.scenario.textContent;

        assert(!heroScenarioText.includes("Stay hidden"), "Case 4a: hero viewer starts without traitor text");
        assert(traitorScenarioText.includes("Stay hidden"), "Case 4b: traitor viewer sees private text");
        assert(!returnedHeroScenarioText.includes("Stay hidden"), "Case 4c: private text is removed when viewer returns to hero");
        assert(heroTurnText !== traitorTurnText, "Case 4d: turn panel updates current player");
        assert(heroActionCount === traitorActionCount, "Case 4e: action panel replaces content without accumulating buttons");

        session.destroy();
        Math.random = originalRandom;
    } catch (e) {
        failed++;
        console.log("[FAIL] Turn switch stability threw", e.message);
    }

    try {
        const targetRef = { value: "relic_1" };
        const gameOne = createRelicSession({ targetRef });
        const gameOneContainers = gameOne.getContainers();
        gameOne.move("east");
        collectRelics(gameOne, targetRef);
        findButton(gameOneContainers.action, "Move")?.click();
        assert(gameOne.getLastVictoryResult()?.winner === "heroes", "Case 5a: game one reaches victory");
        gameOne.destroy();

        const gameTwoTargetRef = { value: "relic_1" };
        const gameTwo = createRelicSession({ targetRef: gameTwoTargetRef });
        const moved = gameTwo.move("east");
        const before = gameTwo.getDispatchCount();
        findButton(gameTwo.getContainers().action, "Collect")?.click();

        assert(moved === true, "Case 5b: second game can explore after restart");
        assert(GameStateManager.isHaunt() === true, "Case 5c: second game can trigger haunt");
        assert(gameTwo.getDispatchCount() === before + 1, "Case 5d: second game accepts a valid scenario action");
        gameTwo.destroy();
    } catch (e) {
        failed++;
        console.log("[FAIL] Browser integration loop threw", e.message);
    }

    console.log(`===== Local Play Stability Test: ${passed} passed, ${failed} failed =====\n`);
}
