import Error from "../_error.js";

export default class NameError extends Error {
    /**
     * Create a new syntax error
     * @param code The global code that includes the error (the best to do is to give the original src file)
     * @param indexs The global index of the error (the index where the error raised or the borns of code where an error had come). Please note that those index is relative to the given code sample.
     * @param message A custom message to display
     */
    constructor(invalidName?: string) {
        super("INVALID_NAME", 12, `INVALID NAME -> "${invalidName}" cannot be used here.`)
    }
}