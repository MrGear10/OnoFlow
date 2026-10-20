/*
 * OnoFlow — controlli prima dell'esecuzione (errori statici, §8.1 livello 2).
 *
 * Dipendenze: js/namespace.js, js/core/expression-*.js, js/core/model.js, js/core/builtins.js.
 * Definisce: OnoFlow.StaticCheck.check
 *
 * check(program) restituisce tutti gli errori che impediscono l'esecuzione, nell'ordine
 * dei blocchi (FR-RUN-02, DEC-027): per ogni funzione prima i suoi errori (nome, firma),
 * poi quelli dei blocchi, campo per campo. Ogni errore ha nodeId (blocco o funzione).
 *
 * Controlli della fase 1:
 *   - sintassi di ogni campo (dal modello);
 *   - nomi di funzioni e parametri validi; funzioni duplicate o con il nome di una
 *     predefinita; Main senza parametri e senza tipo (§6.8);
 *   - due declare diversi con lo stesso nome nella stessa funzione, anche un nome
 *     ripetuto nello stesso declare o un parametro ridichiarato (§6.5);
 *   - blocchi call che non contengono una chiamata.
 * Variabili non dichiarate, tipi e argomenti sono controlli della fase 2 (FR-ERR-06):
 * per ora si scoprono durante l'esecuzione.
 */
(function (OnoFlow) {
    'use strict';

    var Model = OnoFlow.Model;
    var Expressions = OnoFlow.Expressions;
    var Builtins = OnoFlow.Builtins;
    if (!Model || !Builtins) {
        throw new Error('static-check.js richiede model.js e builtins.js, da caricare prima');
    }

    function error(code, params, nodeId, extra) {
        var result = { code: code, params: params || {}, nodeId: nodeId };
        Object.keys(extra || {}).forEach(function (key) { result[key] = extra[key]; });
        return result;
    }

    function checkName(text, nodeId, field) {
        var parsed = Expressions.parseName(text);
        if (parsed.error) {
            return error(parsed.error.code, parsed.error.params, nodeId, { field: field, position: parsed.error.position });
        }
        return null;
    }

    function functionErrors(programFunction, seenFunctions) {
        var errors = [];
        var id = programFunction.id;
        var nameError = checkName(programFunction.name, id, 'name');
        if (nameError) {
            errors.push(nameError);
        } else if (Builtins.get(programFunction.name)) {
            errors.push(error('ERR_FUNCTION_NAME_RESERVED', { name: programFunction.name }, id));
        } else if (Object.prototype.hasOwnProperty.call(seenFunctions, programFunction.name)) {
            errors.push(error('ERR_DUPLICATE_FUNCTION', { name: programFunction.name }, id));
        }
        seenFunctions[programFunction.name] = true;

        if (programFunction.name === 'Main' &&
            (programFunction.parameters.length > 0 || programFunction.type !== 'None')) {
            errors.push(error('ERR_MAIN_SIGNATURE', {}, id));
        }
        if (programFunction.type !== 'None') {
            var returnError = checkName(programFunction.variable, id, 'variable');
            if (returnError) {
                errors.push(returnError);
            }
        }
        programFunction.parameters.forEach(function (parameter) {
            var parameterError = checkName(parameter.name, id, 'parameters');
            if (parameterError) {
                errors.push(parameterError);
            }
        });
        return errors;
    }

    function check(program) {
        var errors = [];
        var seenFunctions = {};

        program.functions.forEach(function (programFunction) {
            errors = errors.concat(functionErrors(programFunction, seenFunctions));

            // Nomi già usati in questa funzione: parametri e dichiarazioni.
            var declared = {};
            programFunction.parameters.forEach(function (parameter) {
                declared[parameter.name] = true;
            });

            var single = Model.createProgram({ functions: [programFunction] });
            Model.walk(single, function (block) {
                Model.activeFieldNames(block).forEach(function (fieldName) {
                    var fieldError = block.fields[fieldName].error;
                    if (fieldError) {
                        errors.push(error(fieldError.code, fieldError.params, block.id,
                            { field: fieldName, position: fieldError.position }));
                    }
                });

                if (block.kind === 'declare' && block.fields.names.ast) {
                    block.fields.names.ast.names.forEach(function (entry) {
                        if (Object.prototype.hasOwnProperty.call(declared, entry.name)) {
                            errors.push(error('ERR_DUPLICATE_DECLARATION', { name: entry.name }, block.id, {
                                field: 'names',
                                position: { start: entry.start, end: entry.end, column: entry.start + 1 }
                            }));
                        }
                        declared[entry.name] = true;
                    });
                }

                if (block.kind === 'call' && block.fields.expression.ast &&
                    block.fields.expression.ast.kind !== 'call') {
                    errors.push(error('ERR_CALL_BLOCK_NOT_CALL', {}, block.id, { field: 'expression' }));
                }
            });
        });
        return errors;
    }

    OnoFlow.StaticCheck = { check: check };
})(window.OnoFlow);
