import { removeUselessBackSlashInStr } from "../../interpreter/stringify.js"

/**
 * Check if the given string starts with one of the testers string
 * @param testers A array of string where these strings is the value by who the content will be test
 * @returns The tester character or false
 */
export function multipleStartsWith(content: string, testers: (string | RegExp)[], testIsInsideStrings= false): string | false {
    if(testIsInsideStrings) content= removeUselessBackSlashInStr(content)
    for(const tester of testers) {
        if(typeof tester === "string" && content.startsWith(tester)) return tester
        if(tester instanceof RegExp) {
            const flags = Array.from(tester.flags).filter(l => l !== "m").join('') // To remove the multiline flag
            const reg = new RegExp("^" + tester.source, flags)
            const res = reg.exec(content)
            if(res) return res[0]
        }
    }
    return false
}
/**
 * Check if the given string ends with one of the testers string
 * @param testers A array of string where these strings is the value by who the content will be test
 * @returns The tester character or false
 */
export function multipleEndsWith(content: string, testers: (string | RegExp)[], testIsInsideStrings= false): string | false {
    if(testIsInsideStrings) content= removeUselessBackSlashInStr(content)
    for(const tester of testers) {
        if(typeof tester === "string" && content.endsWith(tester)) return tester
        else if(tester instanceof RegExp) {
            const flags = Array.from(tester.flags).filter(l => l !== "m").join('') // To remove the multiline flag
            const reg = new RegExp(tester.source + "$", flags)
            const res = reg.exec(content)
            if(res) return res[0]
        }
    }
    return false
}

// ------

/**
 * @param fromEndToStart If this function search in the end at priority
 */
export function multipleSearch(content: string, searchers: (string | RegExp)[], fromEndToStart = false): number {
    for(let tester of searchers) {
        const str_tester = fromEndToStart && typeof tester === "string" ? content.split('').reverse().join('') : content
        if(fromEndToStart && typeof tester !== "string") tester = new RegExp(`.*(?:${tester.source})`, tester.flags)
        const value = (
            typeof tester === "string" ? str_tester.indexOf(tester) : str_tester.search(tester)
        )
        if(value >= 0) return fromEndToStart ? content.length - value : value
    }
    return -1
}