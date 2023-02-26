export default class Error {
    data: {
        name: string,
        type: number,
        customMessage?: string
    }
    constructor(name: string, type: number, customMessage?: string) {
        this.data = {name, type, customMessage}
    }
    
    toString() {
        return `[${this.data.type}]> ${this.data.name}\n${this.data.customMessage?.split('\n').map(msg => `> ${msg}`).join('\n') || ""}`
    }
}