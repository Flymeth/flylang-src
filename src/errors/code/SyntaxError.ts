import Positioner from "../../utils/positioner.js";
import Error from "../_error.js";
import chalk from "chalk";

/**
 * Easily create a new syntax error
 * @param indexs Custom index to set. Note that if you set these index, there are the indexes of the current parsing object (in another way, do not include the length of the string that is already parsed)
 * @param message A custom message
 */
export function fastSyntaxError(position: Positioner, message?: string) {
    return new SyntaxError(position.asOriginal, message)
}
export default class SyntaxError extends Error {
    position: Positioner
    /**
     * Create a new syntax error
     * @param code The global code that includes the error (the best to do is to give the original src file)
     * @param indexs The global index of the error (the index where the error raised or the borns of code where an error had come). Please note that those index is relative to the given code sample.
     * @param message A custom message to display
     */
    constructor(position: Positioner, message?: string) {
        super("SyntaxError", 1, message || "")
        this.position= position
    }

    toString(): string {
        const original = this.position.asOriginal
        const {start, end} = original

        const lines = [
            original.global.slice(0, start).split("\n").length,
            original.global.slice(0, end).split("\n").length
        ]
        
        const linesContent = original.global.split('\n').slice(lines[0]- 1, lines[1]).join('\n')        
        const startsAt = linesContent.indexOf(original.now)
        const endsAt = startsAt + original.now.length        
        const errorMsgCode = chalk.italic.blue(linesContent.slice(0, startsAt)) + chalk.red.underline.bold(linesContent.slice(startsAt, endsAt)) + chalk.italic.blue(linesContent.slice(endsAt))
        
        return `[SyntaxError] line ${lines[0]} to ${lines[1]}: ${this.data.customMessage}\n${errorMsgCode}\n${chalk.gray(`At: ${this.position.file?.value || "<input>"}:${lines[0]}${startsAt >= 0 ? `:${startsAt}` : ""}`)}`
    }
}