import { ParserClassData } from "../parser/parser.js"
import trimContent from "./tools/trim.js"

type valueOfMin = {
    origin: string,
    borned: string,
    borns: [number, number]
}
type valueOf = {
    partOf?: valueOf
} & valueOfMin
type PositionerFilePath = ParserClassData["file"]["src"]["path"]
/**
 * # Positioner
 * This helps to position each portion of the code
 */
export default class Positioner {
    private readonly content: string
    private borns: [number, number]
    relatives?: {
        parent: {object: Positioner, position: [number, number]},
        global: {object: Positioner, position: [number, number]}
    }
    childs: {
        origin: {
            borns: [number, number]
        },
        data: Positioner
    }[]= []
    file?: PositionerFilePath

    /**
     * @param content The code where the positioner will take action
     */
    constructor(content: string, parent?: Positioner, fileInformations?: PositionerFilePath) {
        this.content = content        
        this.borns = [0, content.length]
        this.file= fileInformations

        if(parent) {
            const positionAsGlobal: [number, number] = parent.relatives ? ((): [number, number] => {
                const start = parent.relatives.global.position[0] + parent.global.indexOf(content)
                return [start, start + content.length]
            })() : [...parent.borns]
            
            this.relatives= {
                parent: {object: parent, position: [...parent.borns]},
                
                global: {object: parent.relatives?.global.object || parent, position: positionAsGlobal}
            }
        }
    }

    /**
     * The current value of the initial content
     */
    get now() {
        return this.content.slice(...this.borns)
    }
    /**
     * The initial content
     */
    get global() {
        return this.content
    }
    /**
     * Index at witch the current value starts
     */
    get start() {
        return this.borns[0]
    }
    get fromStart() {
        return this.start
    }
    /**
     * Index at witch the current value ends
     */
    get end() {
        return this.borns[1]
    }
    get fromEnd() {
        return this.global.length - this.end
    }
    /**
     * Indexes at witch the inital content is splitted
     */
    get indexes() {
        return this.borns
    }
    /**
     * If this content inherits from another positioner, this will returns it
     */
    get inherits() {
        return this.relatives?.parent.object
    }
    /**
     * Get informations about this positioner
     */
    get value(): valueOf {
        return {
            origin: this.global,
            borned: this.now,
            borns: this.indexes,
            partOf: this.relatives?.parent.object.value
        }
    }
    /**
     * Get the oldest parent of this positioner
     */
    get original(): Positioner {
        if(this.relatives) return this.relatives.global.object
        return this
    }
    /**
     * Returns the position's parent where the born is set to this actual borns
     */
    get asParent(): Positioner {
        const p = this.relatives?.parent
        if(!p) return this
        const {object, position} = p
        position[0]+= this.start
        position[1]= position[0] + this.now.length        
        
        object.borns= position
        if(!object.file) object.file = this.file
        return object
    }
    get asOriginal(): Positioner {
        const p = this.relatives?.global
        if(!p) return this
        const {object, position} = p
        position[0]+= this.start
        position[1]= position[0] + this.now.length        
        
        object.borns= position
        if(!object.file) object.file = this.file
        return object
    }

    set start(value: number) {
        if(value >= 0) {
            this.borns[0] = value
            if(value > this.end) this.end= value
        }
    }
    set end(value: number) {
        if(value <= this.global.length) {
            this.borns[1] = value
            if(value < this.start) this.start= value
        }
    }
    set indexes(borns: [number, number]) {
        this.start = borns[0]
        this.end = borns[1]
    }

    /**
     * Create a new positionner with the set content's borns and returns it
     */
    split() {
        const splitted = new Positioner(this.now, this, this.file)
        this.childs.push({
            origin: {borns: this.borns},
            data: splitted
        })
        return splitted
    }
    /**
     * Concat a positionner with this one
     * @param pos The 2nd positionner to concat with this one
     */
    concat(pos: Positioner) {
        const [pos1, pos2]= [pos.asOriginal, this.asOriginal]
        if(
            pos1.global !== pos2.global
            || pos1.start <= pos2.start && pos1.end < pos2.end
            || pos1.start >= pos2.start && pos1.end > pos2.end
        ) return null
        
        const start = Math.min(pos1.start, pos2.start)
        const end = Math.max(pos1.end, pos2.end)
        this.indexes=  [start, end]
        return this        
    }

    /**
     * Trim in place the string at the current position
     * @param trim_characters The character you want to trim to the current position (default to the rules.trim_chars array)
     * @param trim_start If you want to trim the start of the string (default to `true`)
     * @param trim_end If you want to trim the end of the string (default to `true`)
     */
    autoTrim(trim_characters?: string[], trim_start= true, trim_end= true) {
        const trimed = trimContent(this.now, trim_characters, trim_start, trim_end)
        if(!trimed) {
            this.start = this.end = 0
            return this
        }
        
        this.take(trimed)
        return this
    }

    /**
     * Set the indexes of the positioner to the position of the given text and create a new positioner on it.
     * @param content The content to set the positioner to
     */
    take(content: string): Positioner {
        const indexes = this.indexes
        this.start= this.global.indexOf(content)
        this.end= this.start+content.length
        const newPos = this.split()
        this.indexes = indexes
        return newPos
    }

    /**
     * Clone this positioner and returns it
     */
    clone(): Positioner {
        const newP = new Positioner(this.global, this, this.file)
        newP.indexes = this.indexes

        return newP
    }
}