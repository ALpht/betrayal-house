export class ValidationError extends Error {
    constructor({ code, path, message }) {
        super(message);
        this.name = "ValidationError";
        this.code = code;
        this.path = path;
    }
}

export class ValidationErrorCollection extends Error {
    constructor(errors) {
        const count = errors.length;
        super(`Validation failed with ${count} error(s)`);
        this.name = "ValidationErrorCollection";
        this.errors = errors;
    }

    hasErrors() {
        return this.errors.length > 0;
    }
}
