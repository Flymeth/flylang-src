import Error from "../_error.js";

export default class FunctionError extends Error {
    constructor(message: string) {
        super("FUNCTION_ERROR", 8, `Unable to execute correcly this function. ${message}`)
    }
}