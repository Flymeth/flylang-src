import Error from "../_error.js";

export default class AccessError extends Error {
    constructor(message: string) {
        super("ACCESS_ERROR", 11, `Cannot access to property. ${message}`)
    }
}