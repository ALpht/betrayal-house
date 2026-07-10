export class HauntDice {

    static FACES = [0, 0, 1, 1, 2, 2];

    static rollSixDice(rng = Math.random) {
        const faces = this.FACES;
        let total = 0;

        for (let i = 0; i < 6; i++) {
            total +=
                faces[
                    Math.floor(
                        rng() * faces.length
                    )
                ];
        }

        return total;
    }

}
