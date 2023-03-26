import Error from "../_error";

export default class SplitError extends Error {
    constructor(unclosedType = "block") {
        super("SPLIT_ERROR", 3, `Unclosed ${unclosedType}`)
    }
}