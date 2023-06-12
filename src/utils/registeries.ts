import rules from "../flylang.rules.json"; // This must be as topiest as possible because else nodejs imports recurcively things.
export const langRules = rules

import { ParsableObjectInformations, ParsableObjectList, ParserClassData } from "../parser/parser.js";
import Error from "../errors/_error.js";
import SyntaxError from "../errors/code/SyntaxError.js";
import PathError from "../errors/compiler/PathError.js";
import UnknowError from "../errors/compiler/UnknowError.js";
import RaiseFlyLangCompilerError from "../errors/raiseError.js";
import Array, { ArrayReturn } from "../parser/objects/array.js";
import BooleanTest from "../parser/objects/boolean.js"; 
import Comparaison, { ComparaisonReturn } from "../parser/objects/comparaison.js";
import FunctionCall from "../parser/objects/function.js";
import FunctionAsignation, { FunctionAsignationReturn } from "../parser/objects/function_asignation.js";
import Number from "../parser/objects/number.js";
import DictObject, { DictObjectReturn } from "../parser/objects/object.js";
import Operation, { OperationReturn } from "../parser/objects/operations.js";
import StrictValue from "../parser/objects/strict_value.js";
import String, { StringReturn } from "../parser/objects/string.js";
import Variable from "../parser/objects/variable.js";
import AttrAccess, { AttrAccessReturn } from "../parser/objects/attr_access.js";
import ClassInstanciation from "../parser/objects/class_instanciation.js";
import VariableAsignation, { VariableAsignationReturn } from "../parser/objects/variable_asignation.js";
import ClassConstr, { ClassConstrReturn } from "../parser/objects/class_construct.js";
import ifStatement from "../parser/objects/ifStatement.js";

export const validFileEncoding = ['ascii', 'utf8', 'utf-8', 'utf16le', 'ucs2', 'ucs-2', 'base64', 'base64url', 'latin1', 'binary', 'hex']

export function variableAcceptedObjects(data: ParserClassData, allowKeywordNaming= false) {
    return [
        new Array(data), new BooleanTest(data), new Comparaison(data), new FunctionAsignation(data, allowKeywordNaming), new FunctionCall(data),
        new Number(data), new DictObject(data), new Operation(data), new StrictValue(data), new String(data), new Variable(data),
        new AttrAccess(data), new ClassInstanciation(data), new ifStatement(data)
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