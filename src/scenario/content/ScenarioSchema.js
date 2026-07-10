import { ScenarioContract } from "./ScenarioContract.js";

export const ID_REGEX = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export const SCHEMA = {
    metadata: { required: true, type: "object" },
    "metadata.id": { required: true, type: "string", pattern: ID_REGEX },
    "metadata.title": { required: true, type: "string", minLength: 1 },
    "metadata.description": { required: false, type: "string" },
    "metadata.difficulty": { required: false, type: "number" },
    "metadata.version": { required: false, type: "string" },
    traitorRule: { required: true, type: "string", enum: ScenarioContract.VALID_TRAITOR_RULES },
    runtimeClass: { required: true, type: "function" },
    objectives: { required: false, type: "object" },
    "objectives.heroes": { required: false, type: "string" },
    "objectives.traitor": { required: false, type: "string" },
    victoryCondition: { required: false, type: "function" }
};
