import Error from "../_error.js";

export default class OperationError extends Error {
    constructor(message?: string) {
        super("OPERATION_ERROR", 5, `Invalid operation. ${message || ""}`)
    }
}