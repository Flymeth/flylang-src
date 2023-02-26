import { ParsedPath, format } from "path";
import Error from "../_error.js";

export default class PathError extends Error {
    constructor(message?: string, pathInformation?: ParsedPath) {
        super(
            "PathError", 0, 
            pathInformation ? `(${format(pathInformation)})` : "" + message
        )
    }
}