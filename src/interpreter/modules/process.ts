import BigNumber from "bignumber.js";
import { cacheInterface } from "../defaultCache.js"
import Interpreter, { UNDEFINED_TYPE } from "../interpreter.js"
import FunctionError from "../../errors/interpreter/functionError.js";
import ExecutionError from "../../errors/interpreter/executionError.js";
import importError from "../../errors/interpreter/importError.js";
import RaiseCodeError from "../../errors/raiseCodeError.js";
import { createStringObj } from "../stringify.js";
import processTools from "../../libs/ps.js";

async function genNewProcessObject(nodeProcessPID: number): Promise<cacheInterface["builtin"]["objects"][string] | null> {
    const nodeProcess = await processTools.fetchBy({pid: nodeProcessPID})
    if(!nodeProcess) return null
    return {id: nodeProcessPID, data: {
        variables: {
            pid: async () => ({type: "number", data: {type: "integer", negative: false, number: new BigNumber(nodeProcess.pid)}}),
            ppid: async () => ({type: "number", data: {type: "integer", negative: false, number: new BigNumber(nodeProcess.ppid || -1)}}),
            name: async () => (createStringObj(nodeProcess.name)),
            path: async () => (nodeProcess.path ? createStringObj(nodeProcess.path) : UNDEFINED_TYPE),
            usage: async () => ({type: "object", data: {values: [
                {key: "memory", value: {type: "number", data: {type: "float", negative: false, number: new BigNumber(nodeProcess.storage || 0)}}},
                {key: "cpu", value: {type: "number", data: {type: "float", negative: false, number: new BigNumber(nodeProcess.cpu || 0)}}}
            ]}}),
            index: async () => ({type: "number", data: {type: "integer", negative: false, number: new BigNumber(nodeProcess.pind)}})
        },
        functions: {
            kill: async () => {
                processTools.kill(nodeProcess)
                return UNDEFINED_TYPE
            }
        },
        objects: {}
    }}
}
export default async function modl(intrp : Interpreter): Promise<cacheInterface["builtin"]> {
    const currentProcessObj = await genNewProcessObject(process.pid)
    if(!currentProcessObj) throw new RaiseCodeError(intrp.currentPosition, new importError("The 'process' module has not found his own process. Without the module can't be used. Please contact the developper to report this error.")).raise()
    
    const module: cacheInterface["builtin"] = {
        variables: {},
        functions: {
            async fetch(pid, force, ..._) {                
                pid= await intrp.eval(pid)                
                if(pid.type !== "number" || pid.data.number.isNaN() || pid.data.negative || pid.data.type !== "integer") throw new RaiseCodeError(intrp.currentPosition, new FunctionError("Can only fetch a process with a positive integer.")).raise()
                const forceFetch= force && intrp.convertToBoolean(await intrp.eval(force))

                const instanceName = `//builtin_fetchedProcessID${pid.data.number.toFixed()}`
                const instance = Object.keys(intrp.cache.builtin.objects).find(n => n === instanceName)

                // If an instance already exist, returns it (because it will the exact same)
                if(!instance || forceFetch) {
                    const fetched = await genNewProcessObject(pid.data.number.toNumber())
                    if(!fetched) throw new RaiseCodeError(intrp.currentPosition, new ExecutionError(`No process has ${pid.data.number.toFixed()} as pid.`)).raise()
                    
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