import safeSplit from "./safeSplit.js";
import { langRules as rules } from "../registeries.js";
import { multipleEndsWith, multipleSearch, multipleStartsWith } from "./extremityTester.js";
import Positioner from "../positioner.js";
import { CommentaryRegexps } from "../../parser/objects/comment.js";
import {allowErrors, setAllowErrors} from "../../errors/raiseError.js";

const letters = "abcdefghijklmnopqrstuvwxyz"
function generateLetter(itemIndex: number): string {
    if(!itemIndex) return letters[0]
    const numberOfLetters = Math.ceil(itemIndex / letters.length)
    return letters[itemIndex%letters.length].repeat(numberOfLetters)
}
function splitAndRemoveUselessPriorities(code: string, prioritiesCloser= rules.block.closer): string[] | null {
    code= code.trim()
    if(code.startsWith('if')) return [code]
    try {
        const splitted = safeSplit(new Positioner(code), prioritiesCloser, true)
        if(splitted.length <= 1 && multipleStartsWith(code, rules.block.openner)) return splitAndRemoveUselessPriorities(code.slice(1, -1), prioritiesCloser)
        return splitted.map(e => e.now)
    } catch (_) { return null }
}

function simplifyPriorities(code: string): string[] | null {
    const symplifies_end = [...rules.block.closer, ...rules.objects.closer, ...rules.string.openner]
    const symplifies_start= [...rules.block.openner, ...rules.objects.openner, ...rules.string.closer]
    
    const resetAllowErrors = allowErrors
    setAllowErrors(false)
    const splitted = splitAndRemoveUselessPriorities(code, symplifies_end)
    if(!splitted) return null
    
    const result= splitted.map((value, index) => {
        const closer = multipleEndsWith(value, symplifies_end)
        if(!closer) return value
        const openner = symplifies_start[symplifies_end.indexOf(closer)]
        const priorityIndex = multipleSearch(value, [openner])

        const before = value.slice(0, priorityIndex)

        const isFunction = !rules.string.closer.includes(closer) && before && multipleEndsWith(before, [/[a-z]\w*\s*/i])
        if(isFunction) {
            const args = value.slice(priorityIndex +1, value.length)
            let splittedArgs: Positioner[] = []
            try {
                splittedArgs = safeSplit(new Positioner(args), [","])
            } catch (_) { }

            return `${before}(${splittedArgs.map((_, i) => generateLetter(index + i)).join(',')})`
        }
        
        const strToSympl = rules.string.closer.includes(closer) && multipleStartsWith(value, rules.string.openner) === openner && splitted[index +1] // "&& if there is something else" -> A single string char doens't need to be simplified.
        if( priorityIndex > 0 
            || splitted[index + 1]?.startsWith('.')
            || strToSympl
        ) {
            const letter = isFunction ? `(${generateLetter(index)})` : generateLetter(index)
            return before + letter
        }

        return value
    })

    setAllowErrors(resetAllowErrors)
    return result
}
/**
 * This function simplifies the top-level priorities in the given code into simple letters like "a", "b", "aa", ...
 * @param code The code where to simplify the priorities
 */
export function prioritySymplifier(code: string): string | null {
    return simplifyPriorities(code)?.join('') || null
}
export function removeUselessPriorities(code: string): string | null {
    return splitAndRemoveUselessPriorities(code)?.join('') || null
}

/**
 * Returns the given code as simplified as possible \
 * Note that, by calling this function you're calling theses functions: \
 * `prioritySymplifier`
 * @param code The code to simplify
 */
export function codeSimplifier(code: string): string | null {
    return prioritySymplifier(code)
}

/**
 * ! **PLEASE EXECUTE THIS FUNCTION ONLY ON A CODE PORTION FOR THE BEST CONDITIONS** !
 * > Remove comments from the given code
 * > Note that if the given code contain unicly a comment code, this function will returns the same given code.
 */
export function removeComments(code: string): string {
    const executed = CommentaryRegexps.fast.exec(code)
    if(!executed) return code.trim()
    const codeWithoutComment = (code.slice(0, executed.index) + code.slice(executed.index + executed[0].length)).trim()
    return codeWithoutComment ? removeComments(codeWithoutComment) : code
}