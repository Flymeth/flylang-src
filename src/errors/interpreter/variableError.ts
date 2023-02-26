import Positioner from "../../utils/positioner.js";
import SyntaxError from "../code/SyntaxError.js";

export default class VariableError extends SyntaxError {
    constructor(variable: Positioner, message: string) {
        super(variable, `Cannot find variable. ${message}`)
    }
}