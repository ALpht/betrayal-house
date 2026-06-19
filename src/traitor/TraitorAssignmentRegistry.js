import { RandomTraitorRule }
    from "./RandomTraitorRule.js";

export const TraitorAssignmentRegistry = {
    random: () => new RandomTraitorRule()
};
