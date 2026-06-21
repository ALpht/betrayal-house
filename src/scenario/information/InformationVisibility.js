import { InformationAudience }
    from "./InformationAudience.js";

export function isVisibleTo(audience, playerId, traitorPlayerId) {

    switch (audience) {

        case InformationAudience.ALL_PLAYERS:
            return true;

        case InformationAudience.TRAITOR_ONLY:
            return playerId === traitorPlayerId;

        case InformationAudience.HEROES_ONLY:
            return playerId !== traitorPlayerId;

        case InformationAudience.OBSERVERS:
            return false;

        default:
            return false;

    }

}

export function resolveAudience(audience, allPlayers, traitorPlayerId) {

    return allPlayers.filter(
        p => isVisibleTo(
            audience,
            p.id,
            traitorPlayerId
        )
    ).map(p => p.id);

}
