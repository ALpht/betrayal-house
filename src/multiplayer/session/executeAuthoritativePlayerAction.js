export function executeAuthoritativePlayerAction(localSession, action) {
    const result = localSession.executeAuthoritativeAction?.(action);
    return result?.accepted
        ? {
            accepted: true,
            reasonCode: null,
            stateChanged: result.stateChanged !== false,
            shouldPublish: result.shouldPublish !== false
        }
        : {
            accepted: false,
            reasonCode: "ACTION_REJECTED",
            stateChanged: false,
            shouldPublish: false
        };
}
