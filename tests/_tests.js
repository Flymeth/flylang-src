const {default: raiseCodeError} = require('../dist/errors/raiseCodeError')
const {default: Positioner} = require('../dist/utils/positioner')

const code = new Positioner("Hello les gens comment\n allez-vous ?")
const error = code.take("comment\n allez")
new raiseCodeError(error).raise()