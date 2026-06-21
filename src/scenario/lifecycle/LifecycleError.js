export class LifecycleError extends Error {
    constructor(currentState, targetTransition) {
        super(
            `Invalid lifecycle transition: cannot transition from "${currentState}" via "${targetTransition}"`
        );
        this.name = "LifecycleError";
        this.currentState = currentState;
        this.targetTransition = targetTransition;
    }
}
