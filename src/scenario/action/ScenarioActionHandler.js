/**
 * PlayerAction is the only supported gameplay input.
 * See CONSTRAINT-034.
 */
import { ActionValidator } from "./ActionValidator.js";

export class ScenarioActionHandler {
    static dispatch(runtime, action) {
        const validation = ActionValidator.validate(action);
        if (!validation.valid) {
            return { success: false, error: validation.error };
        }

        runtime.handleAction(action);

        return { success: true };
    }
}
