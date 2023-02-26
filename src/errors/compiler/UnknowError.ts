import Error from "../_error.js";

export default class UnknowError extends Error {
    constructor(customMessage?: string) {
        super("UnknowError", -1, customMessage)
    }
}