import { StatModifierEffect }
    from './effects/StatModifierEffect.js';

export const CardEffectRegistry = {

    modifyStat:
        () => new StatModifierEffect()

};
