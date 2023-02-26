const letters = "abcdefghijklmnopqrstuvwxyz"
const parseStr = (str: string) => Array.from(str).map(char => `${letters.includes(char) ? "" : "\\"}${char}`).join('')
const parsePossibilites = (pos: string[]) => pos.map(str => `(?:${parseStr(str)})`)

export function RegExp_OR(possibilities: string[]) {    
    return new RegExp(`(?:${parsePossibilites(possibilities).join('|')})`)
}
export function RegExp_AND(sorted: string[]) {
    return new RegExp(`(?:${parsePossibilites(sorted).join('')})`)
}
export const tools = {
    parseStr, parsePossibilites
}