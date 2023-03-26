import Error from "../_error.js";

export default class ExecutionError extends Error {
    constructor(message: string) {
        super("EXEC.ERROR", 9, `Could not continue execution. ${message}`)
    }
}