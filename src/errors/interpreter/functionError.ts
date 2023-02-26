import Positioner from "../../utils/positioner.js";
import SyntaxError from "../code/SyntaxError.js";

export default class FunctionError extends SyntaxError {
    constructor(position: Positioner, message: string) {
        super(position, `Unable to execute correcly this function. ${message}`)
    }
}