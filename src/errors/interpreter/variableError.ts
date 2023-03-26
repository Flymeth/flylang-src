import Positioner from "../../utils/positioner.js";
import Error from "../_error.js";

export default class VariableError extends Error {
    constructor(message: string) {
        super("UNFOUND_VARIABLE", 4, `Cannot find variable. ${message}`)
    }
}