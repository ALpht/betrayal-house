export class PlayerStats {

    constructor(stats) {

        this.speed = stats.speed;
        this.might = stats.might;
        this.sanity = stats.sanity;
        this.knowledge = stats.knowledge;

    }

    modifyStat(stat, delta) {

        const allowed = [
            'might',
            'speed',
            'sanity',
            'knowledge'
        ];

        if (!allowed.includes(stat)) {

            throw new Error(
                `Unknown stat: ${stat}`
            );

        }

        this[stat] += delta;

        return this[stat];
    }

}