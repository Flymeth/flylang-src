import Error from "../_error.js";

export default class CompilerError extends Error {
    constructor() {
        super("compiler_error", 2, "The compiler is apparently not well programmed. Please contact the author to warn this error.")
    }
}