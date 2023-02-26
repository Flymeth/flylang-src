import Positioner from "../../utils/positioner.js";
import SyntaxError from "../code/SyntaxError.js";

export default class AccessError extends SyntaxError {
    constructor(position: Positioner, message: string) {
        super(position, `Cannot access to property. ${message}`)
    }
}