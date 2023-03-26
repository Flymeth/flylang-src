import Error from "../_error.js";

export default class importError extends Error {
    constructor(message?: string) {
        super("IMPORT_ERROR", 7, `Error when wanted to import this module. ${message || ""}`)
    }
}