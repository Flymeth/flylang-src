import Error from "../_error.js";

export default class SplitError extends Error {
    constructor(unclosedType = "block") {
        super("SPLIT_ERROR", 3, `Unclosed ${unclosedType}.`)
    }
}