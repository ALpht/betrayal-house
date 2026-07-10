export class HauntRule {

    shouldTrigger(roll, omenCount) {
        throw new Error(
            "HauntRule#shouldTrigger must be overridden"
        );
    }

}
