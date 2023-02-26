import rules from "../../flylang.rules.json";

/**
 * Trim the given string with different rules (note that the .trim() function is not used so the only trimed chars is the one that are given)
 * @param content The content to trim
 * @param with_chars The char that need to be trimed (default to the `rules.trim_chars` array)
 * @param start If the trim start is active (default to true)
 * @param end If the trim end is active (default to true)
 * @returns 
 */
export default function trimContent(content: string, with_chars: string[] = rules.trim_chars, start: boolean = true, end: boolean = true) {
    if(start) {
        while(with_chars.includes(content[0])) content= content.slice(1)
    }
    if(end) {
        while(with_chars.includes(content.at(-1) || "")) content= content.slice(0, content.length - 1)
    }
    return content
}