import Error from "../_error.js";

export default class ArgError extends Error {
    constructor(message?: string, argument?: string) {
        super(
            "ArgumentError", 1, `The "${argument}" isn't valid!\n${message}`
        )
    }
}