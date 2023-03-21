import BigNumber from "bignumber.js";
import { cacheInterface } from "../defaultCache"
import Interpreter, { UNDEFINED_TYPE } from "../interpreter"
import prc from "process";
import RaiseFlyLangCompilerError from "../../errors/raiseError";
import FunctionError from "../../errors/interpreter/functionError";
import ExecutionError from "../../errors/interpreter/executionError";
import importError from "../../errors/interpreter/importError";
import psList from "ps-list";

export default async function modl(intrp : Interpreter): Promise<cacheInterface["builtin"]> {
    async function genNewProcessObject(nodeProcessPID: number): Promise<cacheInterface["builtin"]["objects"][string] | null> {
        const nodeProcess = (await psList({})).find(p => p.pid === nodeProcessPID)
        if(!nodeProcess) return null
        
        return {id: nodeProcessPID, data: {
            variables: {
                pid: async () => ({type: "number", data: {type: "integer", negative: false, number: new BigNumber(nodeProcess.pid)}}),
                ppid: async () => ({type: "number", data: {type: "integer", negative: false, number: new BigNumber(nodeProcess.ppid || -1)}}),
                name: async () => ({type: "string", data: [{type: "text", data: nodeProcess.name}]})
            },
            functions: {
                kill: async () => {
                    prc.kill(nodeProcess.pid)
                    return UNDEFINED_TYPE
                }
            },
            objects: {}
        }}
    }
    
    
    
    const currentProcessObj = await genNewProcessObject(process.pid)
    if(!currentProcessObj) throw new RaiseFlyLangCompilerError(new importError(intrp.currentPosition, "The 'process' module has not found his own process. Without the module can't be used. Please contact the developper to report this error.")).raise()
    
    const module: cacheInterface["builtin"] = {
        variables: {},
        functions: {
            async fetch(pid, ..._) {
                pid= await intrp.eval(pid)
                if(pid.type !== "number" || pid.data.number.isNaN() || pid.data.negative || pid.data.type !== "integer") throw new RaiseFlyLangCompilerError(new FunctionError(intrp.currentPosition, "Can only fetch a process with a positive integer.")).raise()
                
                const instanceName = `//builtin_fetchedPID${pid.data.number.toFixed()}`
                const instance = Object.keys(intrp.cache.builtin.objects).find(n => n === instanceName)
                // If an instance already exist, returns it (because it will the exact same)
                if(!instance) {
                    const fetched = await genNewProcessObject(pid.data.number.toNumber())
                    if(!fetched) throw new RaiseFlyLangCompilerError(new ExecutionError(intrp.currentPosition, `No process has ${pid.data.number.toFixed()} as pid.`)).raise()
                    
                    intrp.cache.builtin.objects[instanceName]= fetched
                }
                
                return {type: "variable", data: {name: instanceName}}   
            }
        },
        objects: {
            current: currentProcessObj
        }
    }

    return module
}