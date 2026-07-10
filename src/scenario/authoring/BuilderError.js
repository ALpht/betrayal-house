export class BuilderError extends Error {
    constructor({ field, message }) {
        super(message);
        this.name = "BuilderError";
        this.field = field;
    }
}
