import { ACTION_TYPE_VALUES } from "./ActionType.js";

export class ActionValidator {
    static validate(action) {
        if (!action) {
            return { valid: false, error: "Action is null or undefined" };
        }

        if (typeof action.id !== "string" || action.id.length === 0) {
            return { valid: false, error: "Action id must be a non-empty string" };
        }

        if (!ACTION_TYPE_VALUES.includes(action.type)) {
            return { valid: false, error: `Invalid action type: ${action.type}` };
        }

        if (typeof action.playerId !== "string" || action.playerId.length === 0) {
            return { valid: false, error: "Action playerId must be a non-empty string" };
        }

        if (action.payload !== undefined && action.payload !== null) {
            try {
                structuredClone(action.payload);
            } catch {
                return { valid: false, error: "Action payload must be serializable" };
            }
        }

        return { valid: true };
    }
}
