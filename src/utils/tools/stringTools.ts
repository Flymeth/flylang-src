export const StringTools = {
    log(message: string) {
        return console.log(message)
    },
    splitByWith(message: string, maxWidth = 250, normalize = false) {
        const messages: string[] = []
        for(let i = 0; i < message.length; i++) {
            if(i && i%maxWidth === 0) messages.push(
                message.slice(i - maxWidth, i)
            )
            else if(i === message.length - 1) {
                const startIndex = Math.floor(i / maxWidth) * maxWidth
                const msg = message.slice(startIndex, i)
                messages.push(msg + (normalize ? " ".repeat(maxWidth - msg.length) : ""))
            }
        }
        return messages
    }
}