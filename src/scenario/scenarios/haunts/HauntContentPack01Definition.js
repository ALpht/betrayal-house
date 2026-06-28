import { ScenarioDefinition } from "../../definition/ScenarioDefinition.js";
import { PuppetMasterScenario } from "./PuppetMasterScenario.js";
import { PuppetMasterVictoryCondition } from "./PuppetMasterVictoryCondition.js";
import { HungryHouseScenario } from "./HungryHouseScenario.js";
import { HungryHouseVictoryCondition } from "./HungryHouseVictoryCondition.js";
import { BoundSpiritsScenario } from "./BoundSpiritsScenario.js";
import { BoundSpiritsVictoryCondition } from "./BoundSpiritsVictoryCondition.js";
import { ClockTowerScenario } from "./ClockTowerScenario.js";
import { ClockTowerVictoryCondition } from "./ClockTowerVictoryCondition.js";
import { RitualOfShadowsScenario } from "./RitualOfShadowsScenario.js";
import { RitualVictoryCondition } from "./RitualVictoryCondition.js";

export const HAUNT_DEFINITIONS = {
    puppetMaster: new ScenarioDefinition({
        metadata: {
            id: "puppetMaster",
            title: "The Puppet Master",
            description: "Destroy 3 possessed dolls to banish the Puppet Master.",
            difficulty: 2,
            version: "1.0.0"
        },
        objectives: {
            heroes: "Destroy 3 possessed dolls.",
            traitor: "Protect the dolls. Kill all heroes."
        },
        traitorRule: "random",
        runtimeClass: PuppetMasterScenario,
        victoryCondition: PuppetMasterVictoryCondition
    }),

    hungryHouse: new ScenarioDefinition({
        metadata: {
            id: "hungryHouse",
            title: "The Hungry House",
            description: "Reach the safe room before the house collapses.",
            difficulty: 3,
            version: "1.0.0"
        },
        objectives: {
            heroes: "Reach the safe room within 8 turns.",
            traitor: "Survive until the house collapses."
        },
        traitorRule: "random",
        runtimeClass: HungryHouseScenario,
        victoryCondition: HungryHouseVictoryCondition
    }),

    boundSpirits: new ScenarioDefinition({
        metadata: {
            id: "boundSpirits",
            title: "Bound Spirits",
            description: "Escort the spirit to safety before it is destroyed.",
            difficulty: 2,
            version: "1.0.0"
        },
        objectives: {
            heroes: "Escort the spirit to safety.",
            traitor: "Destroy the bound spirit."
        },
        traitorRule: "random",
        runtimeClass: BoundSpiritsScenario,
        victoryCondition: BoundSpiritsVictoryCondition
    }),

    clockTower: new ScenarioDefinition({
        metadata: {
            id: "clockTower",
            title: "The Clock Tower",
            description: "Defeat the Clockwork Golem before it destroys everything.",
            difficulty: 4,
            version: "1.0.0"
        },
        objectives: {
            heroes: "Reduce the Clockwork Golem HP to 0.",
            traitor: "Protect the golem. Kill all heroes."
        },
        traitorRule: "random",
        runtimeClass: ClockTowerScenario,
        victoryCondition: ClockTowerVictoryCondition
    }),

    ritualOfShadows: new ScenarioDefinition({
        metadata: {
            id: "ritualOfShadows",
            title: "Ritual of Shadows",
            description: "Activate 3 altars to complete the ritual.",
            difficulty: 3,
            version: "1.0.0"
        },
        objectives: {
            heroes: "Activate all 3 altars to complete the ritual.",
            traitor: "Stop the ritual. Kill all heroes."
        },
        traitorRule: "random",
        runtimeClass: RitualOfShadowsScenario,
        victoryCondition: RitualVictoryCondition
    })
};

export const HAUNT_DEFINITIONS_LIST = Object.values(HAUNT_DEFINITIONS);
