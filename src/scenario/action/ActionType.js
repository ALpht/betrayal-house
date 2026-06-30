export const ActionType = Object.freeze({
    MOVE: "MOVE",
    INTERACT: "INTERACT",
    COLLECT: "COLLECT",
    ATTACK: "ATTACK",
    DESTROY: "DESTROY",
    ACTIVATE: "ACTIVATE",
    USE_ITEM: "USE_ITEM",
    END_TURN: "END_TURN"
});

export const ACTION_TYPE_VALUES = Object.freeze(
    Object.values(ActionType)
);
