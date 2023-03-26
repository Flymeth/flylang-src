import psList from "ps-list";
import {exec} from "node:child_process";

async function execCmd(cmd: string) {
    return new Promise<({error: boolean, data: string})>(res => {
        exec(cmd, (e, stdout, stderr) => {
            if(e || stderr) return res({error: true, data: stderr})
            else return res({error: false, data: stdout})
        })
    })
}

type processObject = {
    name: string,
    pid: number,
    pind: number,
    path?: string,
    ppid?: number,
    cpu?: number,
    storage?: number
}
function tableParse(tableString: string, descriptors: {[key: string]: keyof processObject}): processObject[] {
    const rows = tableString.split('\r\n')
    const descriptorsRegexp = /\s*(\w+)\s*/
    const commandDescriptors = (() => {
        let line = rows.shift()
        const table: string[] = []
        while(line && descriptorsRegexp.test(line)) {
            const res = descriptorsRegexp.exec(line) as RegExpExecArray // Tested above
            const [all, key] = res
            table.push(key.toLowerCase())
            line= line.slice(all.length)
        }

        return table
    })()
    
    return rows.map((value, index) => {
        const values = value.split(/ {3,}/).map(v => v.trim())
        const obj: processObject = {pid: 0, name: "unknown", pind: index}
        for(let valueIndex = 0; valueIndex < commandDescriptors.length; valueIndex++) {
            const commandKey = commandDescriptors[valueIndex]
            if(commandKey in descriptors) {
                const key = descriptors[commandKey.toLowerCase()]
                const value = values[valueIndex]
                if(!(key && value)) continue
                
                //@ts-ignore
                obj[key] = value && /\d+/.exec(value)?.[0] === value ? parseInt(value) : value
            }
        }
        return obj
    })
}
const win = process.arch === "x64"
async function defaultFetch(): Promise<processObject[]> {
    const processes = await psList()
    return processes.map((prc, ind) => ({
        ...prc,
        pind: ind
    }))
}

const ps = {
    lastFetched: [] as processObject[],
    /**
     * Fetch all current process
     */
    async fetchAll(): Promise<processObject[]> {
        if(win) {
            const res = await execCmd("wmic process get processid,parentprocessid,name,executablepath,workingsetsize,virtualsize")
            if(res.error) ps.lastFetched = await defaultFetch()
            else {
                ps.lastFetched= tableParse(res.data, {
                    processid: "pid",
                    parentprocessid: "ppid",
                    name: "name",
                    executablepath: "path",
                    workingsetsize: "cpu",
                    virtualsize: "storage"
                }).map(row => ({
                    ...row,
                    cpu: (row.cpu || 0)/1000000000,
                    storage: (row.storage || 0)/1000000000
                }))
            }

        }else ps.lastFetched= await defaultFetch()
        return ps.lastFetched
    },
    /**
     * Fetch a single process with a predicate
     */
    async fetchBy(predicate: {pid: number} | {name: string}, force = false): Promise<processObject | null> {
        const all = force || !ps.lastFetched.length ? await ps.fetchAll() : ps.lastFetched
        if("pid" in predicate) return all.find(p => p.pid === predicate.pid) || null
        if("name" in predicate) return all.find(p => p.name === predicate.name) || null

        return null
    },
    /**
     * Kill the given process
     * @param prc The process to kill
     */
    kill(prc: processObject) {
        process.kill(prc.pid)
    }
}

export default ps