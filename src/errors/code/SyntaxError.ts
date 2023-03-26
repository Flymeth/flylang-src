import Error from "../_error.js";

export default class SyntaxError extends Error {
    constructor(message?: string) {
        super("SyntaxError", 1, message || "An invalid syntax has been written.")
    }
}