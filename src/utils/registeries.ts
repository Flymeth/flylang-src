import { ParsableObjectInformations, ParsableObjectList, ParserClassData } from "../parser/parser.js";
import Error from "../errors/_error.js";
import SyntaxError from "../errors/code/SyntaxError.js";
import PathError from "../errors/compiler/PathError.js";
import UnknowError from "../errors/compiler/UnknowError.js";
import RaiseFlyLangCompilerError from "../errors/raiseError.js";
import rules from "../flylang.rules.json";
import Array from "../parser/objects/array.js";
import BooleanTest from "../parser/objects/boolean.js"; 
import Comparaison from "../parser/objects/comparaison.js";
import FunctionCall from "../parser/objects/function.js";
import FunctionAsignation, { FunctionAsignationReturn } from "../parser/objects/function_asignation.js";
import Number from "../parser/objects/number.js";
import DictObject from "../parser/objects/object.js";
import Operation from "../parser/objects/operations.js";
import StrictValue from "../parser/objects/strict_value.js";
import String from "../parser/objects/string.js";
import Variable from "../parser/objects/variable.js";
import AttrAccess from "../parser/objects/attr_access.js";
import ClassInstanciation from "../parser/objects/class_instanciation.js";
import VariableAsignation, { VariableAsignationReturn } from "../parser/objects/variable_asignation.js";
import ClassConstr, { ClassConstrReturn } from "../parser/objects/class_construct.js";

export const langRules = rules
export function variableAcceptedObjects(data: ParserClassData) {
    return [
        new Array(data), new BooleanTest(data), new Comparaison(data), new FunctionAsignation(data), new FunctionCall(data),
        new Number(data), new DictObject(data), new Operation(data), new StrictValue(data), new String(data), new Variable(data),
        new AttrAccess(data), new ClassInstanciation(data)
    ]
}
export function exportableObjects(data: ParserClassData) {
    return [
        new FunctionAsignation(data), new VariableAsignation(data), new ClassConstr(data)
    ]
}
export type exportableObjects = (VariableAsignationReturn | FunctionAsignationReturn | ClassConstrReturn) & ParsableObjectInformations
export const exportableObjectsName: ParsableObjectList["type"][] = ["variable_asignation", "function_asignation", "class_constructor"]
export const ErrorHandle = {
    codeErrors: {
        default: Error,
        syntax: SyntaxError,
    },
    compilerErrors: {
        path: PathError,
        unknow: UnknowError
    },
    raiser: RaiseFlyLangCompilerError
}