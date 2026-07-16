import { relicEscapeDefinition } from "./relicEscape/RelicEscapeDefinition.js";
import { ashenTitanDefinition } from "./ashenTitan/AshenTitanDefinition.js";
import { lostHeirDefinition } from "./lostHeir/LostHeirDefinition.js";
import { sealedGalleryDefinition } from "./sealedGallery/SealedGalleryDefinition.js";
import { maskedHostDefinition } from "./maskedHost/MaskedHostDefinition.js";

export const PLAYABLE_SCENARIO_PACK_01_DEFINITIONS = {
    relicEscape: relicEscapeDefinition,
    ashenTitan: ashenTitanDefinition,
    lostHeir: lostHeirDefinition,
    sealedGallery: sealedGalleryDefinition,
    maskedHost: maskedHostDefinition
};

export const PLAYABLE_SCENARIO_PACK_01_DEFINITIONS_LIST =
    Object.values(PLAYABLE_SCENARIO_PACK_01_DEFINITIONS);
