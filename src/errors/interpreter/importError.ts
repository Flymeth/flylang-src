import Positioner from "../../utils/positioner.js";
import SyntaxError from "../code/SyntaxError.js";

export default class importError extends SyntaxError {
    constructor(position: Positioner, message?: string) {
        super(position, `Error when wanted to import this module. ${message || ""}`)
    }
}