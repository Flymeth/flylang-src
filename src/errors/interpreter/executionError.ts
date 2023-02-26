import Positioner from "../../utils/positioner.js";
import SyntaxError from "../code/SyntaxError.js";

export default class ExecutionError extends SyntaxError {
    constructor(position: Positioner, message: string) {
        super(position, `Could not continue execution. ${message}`)
    }
}