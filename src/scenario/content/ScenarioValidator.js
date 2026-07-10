import { HauntScenario } from "../HauntScenario.js";
import { VictoryCondition } from "../victory/VictoryCondition.js";
import { ValidationError, ValidationErrorCollection } from "./ValidationError.js";
import { ScenarioContract } from "./ScenarioContract.js";
import { ID_REGEX } from "./ScenarioSchema.js";

export class ScenarioValidator {

    validate(definition) {
        const errors = [];

        if (!definition || typeof definition !== "object") {
            errors.push(new ValidationError({
                code: "MISSING_METADATA",
                path: "metadata",
                message: "Definition must be an object"
            }));
            throw new ValidationErrorCollection(errors);
        }

        this.#validateMetadata(definition, errors);
        this.#validateTraitorRule(definition, errors);
        this.#validateRuntimeClass(definition, errors);
        this.#validateVictoryCondition(definition, errors);
        this.#validateSerialization(definition, errors);

        if (errors.length > 0) {
            throw new ValidationErrorCollection(errors);
        }
    }

    validateAll(definitions) {
        const allErrors = [];

        for (const def of definitions) {
            try {
                this.validate(def);
            } catch (e) {
                if (e instanceof ValidationErrorCollection) {
                    allErrors.push(...e.errors);
                } else {
                    throw e;
                }
            }
        }

        if (allErrors.length > 0) {
            throw new ValidationErrorCollection(allErrors);
        }
    }

    #validateMetadata(definition, errors) {
        const meta = definition.metadata;

        if (!meta || typeof meta !== "object") {
            errors.push(new ValidationError({
                code: "MISSING_METADATA",
                path: "metadata",
                message: "Scenario must have a metadata object"
            }));
            return;
        }

        if (!meta.id || typeof meta.id !== "string") {
            errors.push(new ValidationError({
                code: "INVALID_METADATA_ID",
                path: "metadata.id",
                message: "metadata.id must be a non-empty string"
            }));
        } else if (!ID_REGEX.test(meta.id)) {
            errors.push(new ValidationError({
                code: "INVALID_METADATA_ID",
                path: "metadata.id",
                message: `metadata.id must match ${ID_REGEX}`
            }));
        }

        if (!meta.title || typeof meta.title !== "string") {
            errors.push(new ValidationError({
                code: "INVALID_METADATA_TITLE",
                path: "metadata.title",
                message: "metadata.title must be a non-empty string"
            }));
        }
    }

    #validateTraitorRule(definition, errors) {
        const rule = definition.traitorRule;

        if (!rule) {
            errors.push(new ValidationError({
                code: "MISSING_TRAITOR_RULE",
                path: "traitorRule",
                message: "traitorRule is required"
            }));
            return;
        }

        if (!ScenarioContract.VALID_TRAITOR_RULES.includes(rule)) {
            errors.push(new ValidationError({
                code: "INVALID_TRAITOR_RULE",
                path: "traitorRule",
                message: `traitorRule must be one of: ${ScenarioContract.VALID_TRAITOR_RULES.join(", ")}`
            }));
        }
    }

    #validateRuntimeClass(definition, errors) {
        const rc = definition.runtimeClass;

        if (!rc) {
            errors.push(new ValidationError({
                code: "MISSING_RUNTIME_CLASS",
                path: "runtimeClass",
                message: "runtimeClass is required"
            }));
            return;
        }

        if (typeof rc !== "function" || !rc.prototype) {
            errors.push(new ValidationError({
                code: "INVALID_RUNTIME_CLASS",
                path: "runtimeClass",
                message: "runtimeClass must be a class"
            }));
            return;
        }

        if (!(rc.prototype instanceof HauntScenario)) {
            errors.push(new ValidationError({
                code: "INVALID_RUNTIME_CLASS",
                path: "runtimeClass",
                message: "runtimeClass must extend HauntScenario"
            }));
            return;
        }

        if (rc.prototype.start === HauntScenario.prototype.start) {
            errors.push(new ValidationError({
                code: "MISSING_START_HOOK",
                path: "runtimeClass.prototype.start",
                message: "Scenario must override start()"
            }));
        }
    }

    #validateVictoryCondition(definition, errors) {
        const vc = definition.victoryCondition;

        if (vc === undefined || vc === null) {
            return;
        }

        if (typeof vc !== "function" || !vc.prototype) {
            errors.push(new ValidationError({
                code: "INVALID_VICTORY_CONDITION_TYPE",
                path: "victoryCondition",
                message: "victoryCondition must be a class extending VictoryCondition, or null"
            }));
            return;
        }

        if (!(vc.prototype instanceof VictoryCondition)) {
            errors.push(new ValidationError({
                code: "INVALID_VICTORY_CONDITION_TYPE",
                path: "victoryCondition",
                message: "victoryCondition must extend VictoryCondition"
            }));
        }
    }

    #validateSerialization(definition, errors) {
        const data = {};

        const meta = definition.metadata;
        if (meta) {
            data.metadata = {};
            if (meta.id) data.metadata.id = meta.id;
            if (meta.title) data.metadata.title = meta.title;
            if (meta.description) data.metadata.description = meta.description;
            if (meta.version) data.metadata.version = meta.version;
            if (meta.difficulty) data.metadata.difficulty = meta.difficulty;
        }

        if (definition.traitorRule) {
            data.traitorRule = definition.traitorRule;
        }

        if (definition.objectives) {
            data.objectives = {};
            if (definition.objectives.heroes) {
                data.objectives.heroes = definition.objectives.heroes;
            }
            if (definition.objectives.traitor) {
                data.objectives.traitor = definition.objectives.traitor;
            }
        }

        try {
            structuredClone(data);
        } catch (e) {
            errors.push(new ValidationError({
                code: "SERIALIZATION_ERROR",
                path: "definition",
                message: "Definition data must be serializable"
            }));
        }
    }
}
