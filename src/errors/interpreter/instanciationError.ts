import Positioner from "../../utils/positioner.js";
import SyntaxError from "../code/SyntaxError.js";

export default class InstanciationError extends SyntaxError {
    constructor(position: Positioner, message?: string) {
        super(position, `Cannot instanciate the class. ${message || ""}`)
    }
}