import Error from "../_error.js";

export default class InstanciationError extends Error {
    constructor(message?: string) {
        super("INST.ERROR", 6, `Cannot instanciate the class. ${message || ""}`)
    }
}