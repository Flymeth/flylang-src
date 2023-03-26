import Error from "../_error.js";

export default class asignationError extends Error {
    constructor(message?: string) {
        super("ASIGN.ERROR", 10, `Cannot perfom variable asignation. ${message || ""}`)
    }
}