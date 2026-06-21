/* TECH-DEBT-029
 * Lifecycle Missing SUSPENDED State
 *
 * 未來 Multiplayer 當玩家斷線時可能需要 SUSPENDED 狀態。
 * 目前無實作必要，僅預留占位。
 */

export const ScenarioLifecycleState = {
    CREATED: "created",
    STARTED: "started",
    PAUSED: "paused",
    COMPLETED: "completed",
    DESTROYED: "destroyed"
};
