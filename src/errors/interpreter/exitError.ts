import Error from "../_error.js";

// This error will be throwed by the user itself
export default class ExitError extends Error {
    constructor(message?: string) {
        super("EXITED", 54, message)
    }
}