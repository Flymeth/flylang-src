import { MakeRecurcive } from "../types.js";
import { langRules as rules } from "../registeries.js";
import safeSplit from "./safeSplit.js";
import { multipleEndsWith } from "./extremityTester.js";
import Positioner from "../positioner.js";

export type separateFunctionReturn = MakeRecurcive<Positioner>
/**
 * Separate a string while respecting the priorities and objects
 * The returned array is shaped like:
 * 
 * * 1st: string before the 1st separator
 * * 2nd: a separator
 * * 3rd: string after the 1st separator
 * * 4th: a separator
 * * ...
 * @param separators The separators characters/words/regexp (default the `rules.end_of_instruction` array) (note that the order is important: the first char is the most important)
 */
export function separate(position: Positioner, separators: string[] = rules.end_of_instruction, maxDepth= Infinity): separateFunctionReturn | null {
    const splitted = safeSplit(position, separators, true)
    if(!splitted) return null

    const res: Positioner[] = []
    for(const pos of splitted) {
        const endChar = multipleEndsWith(pos.now, separators)
        pos.end-= (endChar || "").length
        res.push(pos.split())
        if(endChar) {
            pos.start = pos.end
            pos.end+= endChar.length
            res.push(pos.split())
        }
    }

    if(res.length > 3 && maxDepth -1) {
        const sortedSymbol = [...res].sort((v1, v2) => {
            const index1 = separators.findIndex(sep => v1.now === sep)
            const index2 = separators.findIndex(sep => v2.now === sep)
            if(!(index1 || index2)) return -Infinity
            return index2 - index1 // = The less important symbol
        })        
        const maxSymbol = sortedSymbol[0]
        const operation = maxSymbol.asParent.asParent
        const [symb_start, sym_end] = operation.indexes

        operation.start = 0
        operation.end = symb_start
        const beforeContent = operation.split().autoTrim()
        
        operation.start = sym_end
        operation.end = operation.global.length
        const afterContent = operation.split().autoTrim()

        const sep1 = separate(beforeContent, separators, maxDepth -1)
        if(!sep1) return sep1
        const sep2 = separate(afterContent, separators, maxDepth -1)
        if(!sep2) return sep2

        return [
            (sep1.length > 1 ? sep1 : sep1[0] || ""),
            maxSymbol,
            (sep2.length > 1  ? sep2 : sep2[0] || "")
        ]
    }
    return res
}

export async function handleRecursiveSeparate<HandlerReturnType>(
    
    separated: separateFunctionReturn,
    handler: (symbol: Positioner, before: HandlerReturnType | Positioner, after: HandlerReturnType | Positioner) => Promise<HandlerReturnType | null>,
    symbols?: (string | RegExp)[]

): Promise<HandlerReturnType | null> {
    if(separated.length !== 3) return null
    const [first, symbol, second] = separated.slice(0, 3)
    if(!(symbol instanceof Positioner)) return null

    if(symbols && first instanceof Array && second instanceof Positioner) {
        const pos = first.at(-1)

        if(symbols.filter(str => str === (pos instanceof Positioner ? pos.now : null) || str === symbol.now).length === 2) {
            first.push(symbol.concat(second) || symbol)
            return await handleRecursiveSeparate(first, handler)
        }
    }

    const parsedFirst = (first instanceof Positioner ? first : await handleRecursiveSeparate(first, handler))
    if(parsedFirst === null) return null
    const parsedSecond = (second instanceof Positioner ? second : await handleRecursiveSeparate(second, handler))
    if(parsedSecond === null) return null

    return await handler(
        symbol,
        parsedFirst,
        parsedSecond
    )
}