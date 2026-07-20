const DEFAULT_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export class RoomCodeGenerator {
    constructor({
        alphabet = DEFAULT_ALPHABET,
        length = 4,
        random = Math.random
    } = {}) {
        this.alphabet = alphabet;
        this.length = length;
        this.random = random;
    }

    generate(existingCodes = new Set()) {
        for (let attempt = 0; attempt < 1000; attempt++) {
            let code = "";
            for (let index = 0; index < this.length; index++) {
                const charIndex = Math.floor(this.random() * this.alphabet.length);
                code += this.alphabet[charIndex];
            }

            if (!existingCodes.has(code)) {
                return code;
            }
        }

        throw new Error("Unable to generate unique room code");
    }
}
