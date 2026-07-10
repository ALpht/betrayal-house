import { HauntRule }
    from "./HauntRule.js";

export class StandardHauntRule
    extends HauntRule {

    shouldTrigger(roll, omenCount) {
        return roll < omenCount;
    }

}
