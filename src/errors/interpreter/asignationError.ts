import Positioner from "../../utils/positioner.js";
import SyntaxError from "../code/SyntaxError.js";

export default class asignationError extends SyntaxError {
    constructor(variable: Positioner, message?: string) {
        super(variable, `Variable has been set as a constant. ${message || ""}`)
    }
}