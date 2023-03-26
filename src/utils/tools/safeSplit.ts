import { langRules as rules } from "../registeries.js";
import { multipleEndsWith, multipleStartsWith } from "./extremityTester.js";
import Positioner from "../positioner.js";
import { considerAsAChar } from "../../interpreter/stringify.js";
import RaiseCodeError from "../../errors/raiseCodeError.js";
import SplitError from "../../errors/code/splitError.js";

type deepObject = {
    object: number,
    block: number,
    string: 0 | 1,
    comment: 0 | 1,
    cache: {
        [key: string]: any
    }
    insideBlock: () => boolean
}
type ignoreParameter = {
    object?: boolean,
    block?: boolean,
    string?: boolean, 
    comment?: boolean
}
/**
 * Split the string (without any trim) safely with given characters at only the top level.
 * Note that will allow you to preserve strings, objects, ...
 * @param position The position object of the string that you want to split
 * @param spliters The characters/words/regexp that will split the string (default the `rules.end_of_instruction` array)
 * @param keepSplitter If true, the splitter will be integrated into the returned string (default to `false`)
 * @param maxSplits The maximum amount of time the string will be splitted
 * @returns If the returns is `null`, that tells you that your string isn't valid.
 */
export default function safeSplit(position: Positioner, spliters: string[] = rules.end_of_instruction, keepSplitter= false, maxSplits?: number, ignore?: ignoreParameter) {
    if(!position.now) return []
    const splitted: Positioner[] = []
    
    const {objects, string, block, comments, string_data} = rules
    maxSplits??= Infinity

    function isIfElseStatement(): boolean {
        const code = position.now.trimStart()
        if(code.slice(0, 2) !== "if") return false
        return position.global.slice(position.end).trimStart().startsWith("else")
    }

    position.end = 0
    while(position.fromEnd && splitted.length < maxSplits) {
        position.start = position.end
        let foundSplitter: string | null= null
        const deep: deepObject = {
            object: 0,
            block: 0,
            string: 0,
            comment: 0,
            cache: {},
            insideBlock(): boolean {
                const values: number[] = Object.values(this).filter((val): val is number => typeof val === "number")
                return !!values.reduce((pre, cur) => pre + cur, 0)
            }
        }        
        
        while(!foundSplitter && position.end < position.global.length) {
            position.end++
            const content = position.now
            
            if(deep.object && !deep.string && !deep.comment && multipleEndsWith(content, objects.closer)) deep.object--
            else if(deep.string && !deep.comment && deep.cache.str_char === multipleEndsWith(content, string.closer) && !considerAsAChar(content)) deep.string--, delete deep.cache.str_char
            else if(deep.block && !deep.string && !deep.comment && multipleEndsWith(content, block.closer)) deep.block--
            else if(deep.comment && !deep.string && multipleEndsWith(content, comments.closer)) deep.comment--
            
            else if(!deep.comment && deep.string && multipleEndsWith(content, [string_data.openner]) && !considerAsAChar(content)) { // String's data
                const clonedCurrentPosition = position.clone()
                clonedCurrentPosition.start = clonedCurrentPosition.end - 1 // Remove the 1st symbole of the oppener
                clonedCurrentPosition.end = clonedCurrentPosition.global.length
                const fromOpennerToCloser = safeSplit(clonedCurrentPosition.split(), [string_data.closer], true, 1)[0]
                position.end+= fromOpennerToCloser.end -1 // Remove the 2nd symbol of the openner

            }
            else if(!(deep.string || deep.comment)) {
                if(!ignore?.comment && multipleEndsWith(content, comments.openner)) deep.comment++
                else if(!ignore?.block && multipleEndsWith(content, block.openner)) deep.block++
                else if(!ignore?.object && multipleEndsWith(content, objects.openner)) deep.object++
                else if(!ignore?.string && !!(deep.cache.str_char = multipleEndsWith(content, string.openner))) deep.string++
            }
            
            if(!( deep.insideBlock() || isIfElseStatement() )) {
                const splitter = multipleEndsWith(content, spliters)
                const before = splitter && position.global.slice(0, position.end - splitter.length).trimEnd()
                const next = before && !before.endsWith(rules.attribute_access_char) && position.global.slice(position.end - splitter.length)
                
                // This "if" statement if "<" is not a "<=" or if "1+-2" is not a "1+" "-2" or, in a string for exemple "&(data)..." (It is really important)
                if(next && multipleStartsWith(next, spliters) === splitter && (!position.start || content.length > splitter.length)) {
                    foundSplitter = splitter
                    break
                }
            }
        }

        if(deep.insideBlock()) throw new RaiseCodeError(position, new SplitError()).raise()
        const value = position.split()
        if(foundSplitter && !keepSplitter) value.end-= foundSplitter.length
        splitted.push(value)
    }
    if(position.fromEnd) {
        position.start = position.end
        position.end = position.global.length
        splitted.push(position.split())
    }
    return splitted
}