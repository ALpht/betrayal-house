import { ScenarioContract } from "./ScenarioContract.js";

export class ScenarioLint {

    lint(definition) {
        const warnings = [];

        this.#lintMetadata(definition, warnings);
        this.#lintObjectives(definition, warnings);
        this.#lintVictoryCondition(definition, warnings);
        this.#lintLifecycle(definition, warnings);

        return warnings;
    }

    #lintMetadata(definition, warnings) {
        const meta = definition?.metadata;
        if (!meta) return;

        if (!meta.description) {
            warnings.push({
                code: "MISSING_DESCRIPTION",
                path: "metadata.description",
                message: "Scenario should have a description",
                severity: "warning"
            });
        }

        if (!meta.version) {
            warnings.push({
                code: "MISSING_VERSION",
                path: "metadata.version",
                message: "Scenario should have a version string",
                severity: "warning"
            });
        }
    }

    #lintObjectives(definition, warnings) {
        const obj = definition?.objectives;
        if (!obj) return;

        if (!obj.heroes) {
            warnings.push({
                code: "MISSING_HERO_OBJECTIVE",
                path: "objectives.heroes",
                message: "Scenario should define a hero objective",
                severity: "warning"
            });
        }

        if (!obj.traitor) {
            warnings.push({
                code: "MISSING_TRAITOR_OBJECTIVE",
                path: "objectives.traitor",
                message: "Scenario should define a traitor objective",
                severity: "warning"
            });
        }
    }

    #lintVictoryCondition(definition, warnings) {
        if (!definition?.victoryCondition) {
            warnings.push({
                code: "MISSING_VICTORY_CONDITION",
                path: "victoryCondition",
                message: "Scenario should define a victory condition",
                severity: "warning"
            });
        }
    }

    #lintLifecycle(definition, warnings) {
        const proto = definition?.runtimeClass?.prototype;
        if (!proto) return;

        for (const hook of ScenarioContract.DEPRECATED_LIFECYCLE_HOOKS) {
            if (typeof proto[hook] === "function") {
                warnings.push({
                    code: "DEPRECATED_LIFECYCLE_HOOK",
                    path: `runtimeClass.prototype.${hook}`,
                    message: `${hook} is deprecated, use the standard lifecycle hooks instead`,
                    severity: "warning"
                });
            }
        }
    }
}
