import { ParsedPath, format } from "path";
import Error from "../_error.js";
import chalk from "chalk";

export default class PathError extends Error {
    constructor(message?: string, pathInformation?: ParsedPath) {
        super(
            "PathError", 0, 
            pathInformation ? chalk.black(`("${chalk.blue(format(pathInformation))}")`) : "" + message
        )
    }
}