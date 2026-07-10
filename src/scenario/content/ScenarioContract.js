export const ScenarioContract = {
    REQUIRED_METADATA: ["id", "title"],
    OPTIONAL_METADATA: ["description", "difficulty", "version"],
    REQUIRED_LIFECYCLE: ["start"],
    OPTIONAL_LIFECYCLE: [
        "onTurnStart", "onTurnEnd", "update", "checkVictory",
        "pause", "resume", "restore", "destroy"
    ],
    VALID_AUDIENCES: [
        "all_players",
        "heroes_only",
        "traitor_only",
        "observers"
    ],
    VALID_TRAITOR_RULES: ["random"],
    VALID_VICTORY_WINNERS: ["heroes", "traitor"],
    DEPRECATED_LIFECYCLE_HOOKS: [
        "onRoundStart",
        "onRoundEnd",
        "onGameStart"
    ]
};
