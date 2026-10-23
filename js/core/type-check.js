/*
 * OnoFlow — analisi statica dei nomi e dei tipi (passo 16, FR-ERR-06, D-06, DEC-076).
 *
 * Dipendenze: js/namespace.js, js/core/expression-parser.js, js/core/model.js, js/core/builtins.js.
 * Definisce: OnoFlow.TypeCheck.{create, suggestionFor}
 *
 * Trova prima dell'esecuzione gli errori che l'interprete troverebbe solo arrivando al blocco:
 * variabili non dichiarate, funzioni inesistenti, numero e tipo degli argomenti, tipi delle
 * assegnazioni, delle condizioni, degli operatori, degli indici e del for, valore di ritorno.
 * Usa gli stessi codici e parametri dell'interprete (§8.3), quindi gli stessi messaggi.
 *
 * Regole:
 *   - una variabile è dichiarata se un declare della funzione o un parametro ha quel nome,
 *     in qualunque punto del corpo: l'uso prima della dichiarazione resta un errore di
 *     esecuzione, perché dipende dal percorso (un declare dentro un if);
 *   - nessun falso allarme: quando il tipo dipende dai valori si lascia passare. Per esempio
 *     Integer ^ Integer è Integer con esponente ≥ 0 e Real altrimenti: vale come "numero
 *     forse intero" ('Number'), accettato dove serve un Integer o un Real;
 *   - un solo errore per campo, il primo nell'ordine di lettura (DEC-022), con la posizione;
 *   - D-06: un nome sconosciuto che differisce solo per le maiuscole da una variabile, da
 *     true/false o da una funzione ha il suggerimento (params.suggestion, reason 'case').
 *
 *     create(program) → { functionErrors(funzione), blockErrors(blocco, funzione) }
 *         ognuno → [{ code, params, nodeId, field, position }]
 */
(function (OnoFlow) {
    'use strict';

    var Model = OnoFlow.Model;
    var Builtins = OnoFlow.Builtins;
    if (!Model || !Builtins) {
        throw new Error('type-check.js richiede model.js e builtins.js, da caricare prima');
    }

    // Un numero che può essere Integer o Real a seconda dei valori (Integer ^ Integer).
    var NUMBER = 'Number';
    var KEYWORD_VALUES = ['true', 'false'];
    var KIND_EXPECTED = { number: 'Real', real: 'Real', integer: 'Integer', string: 'String' };

    /* Il primo errore di un campo interrompe l'analisi del campo. */
    function Problem(code, params, node) {
        this.code = code;
        this.params = params;
        this.node = node;
    }

    function stop(code, params, node) {
        throw new Problem(code, params, node);
    }

    function isNumeric(type) {
        return type === 'Integer' || type === 'Real' || type === NUMBER;
    }

    function maybeInteger(type) {
        return type === 'Integer' || type === NUMBER;
    }

    /* Nei messaggi un "numero forse intero" si mostra come Integer, il caso più comune. */
    function shown(type) {
        return type === NUMBER ? 'Integer' : type;
    }

    /* Un valore di tipo "given" si può mettere dove serve "expected"? (§6.1) */
    function assignable(given, expected) {
        if (given === expected) {
            return true;
        }
        if (expected === 'Real') {
            return given === 'Integer' || given === NUMBER;
        }
        return expected === 'Integer' && given === NUMBER;
    }

    /* D-06: lo stesso nome con altre maiuscole tra i candidati, oppure null. */
    function suggestionFor(name, candidates) {
        var lower = name.toLowerCase();
        for (var i = 0; i < candidates.length; i++) {
            if (candidates[i] !== name && candidates[i].toLowerCase() === lower) {
                return candidates[i];
            }
        }
        return null;
    }

    function create(program) {
        var functionsByName = Object.create(null);
        program.functions.forEach(function (programFunction) {
            if (!(programFunction.name in functionsByName)) {
                functionsByName[programFunction.name] = programFunction;
            }
        });
        var symbolsCache = Object.create(null);

        /* Nomi della funzione: parametri e dichiarazioni; vince il primo (i doppioni sono già errori). */
        function symbolsOf(programFunction) {
            if (symbolsCache[programFunction.id]) {
                return symbolsCache[programFunction.id];
            }
            var symbols = Object.create(null);
            programFunction.parameters.forEach(function (parameter) {
                if (!(parameter.name in symbols)) {
                    symbols[parameter.name] = { type: parameter.type, array: parameter.array };
                }
            });
            Model.walk(Model.createProgram({ functions: [programFunction] }), function (block) {
                if (block.kind === 'declare' && block.fields.names.ast) {
                    block.fields.names.ast.names.forEach(function (entry) {
                        if (!(entry.name in symbols)) {
                            symbols[entry.name] = { type: block.type, array: block.array };
                        }
                    });
                }
            });
            symbolsCache[programFunction.id] = symbols;
            return symbols;
        }

        function functionNames() {
            return Builtins.NAMES.concat(Object.keys(functionsByName).filter(function (name) { return name !== 'Main'; }));
        }

        function Context(programFunction) {
            this.symbols = symbolsOf(programFunction);
        }

        Context.prototype.lookup = function (name, node) {
            var symbol = this.symbols[name];
            if (!symbol) {
                var suggestion = suggestionFor(name, Object.keys(this.symbols).concat(KEYWORD_VALUES, functionNames()));
                stop('ERR_UNDECLARED_VARIABLE', suggestion ? { name: name, reason: 'case', suggestion: suggestion } : { name: name }, node);
            }
            return symbol;
        };

        Context.prototype.index = function (symbol, name, indexNode) {
            var type = this.type(indexNode);
            if (!maybeInteger(type)) {
                stop('ERR_INDEX_TYPE', { name: name, type: shown(type) }, indexNode);
            }
        };

        /* Tipo di un'espressione: 'Integer', 'Real', 'String', 'Boolean', NUMBER, oppure null (nessun valore). */
        Context.prototype.type = function (node) {
            switch (node.kind) {
                case 'literal':
                    return node.type;
                case 'variable': {
                    var symbol = this.lookup(node.name, node);
                    if (symbol.array) {
                        stop('ERR_ARRAY_WITHOUT_INDEX', { name: node.name }, node);
                    }
                    return symbol.type;
                }
                case 'index': {
                    var arraySymbol = this.lookup(node.name, node);
                    if (!arraySymbol.array) {
                        stop('ERR_NOT_AN_ARRAY', { name: node.name }, node);
                    }
                    this.index(arraySymbol, node.name, node.index);
                    return arraySymbol.type;
                }
                case 'call':
                    return this.call(node, false);
                case 'unary':
                    return this.unary(node);
                case 'binary':
                    return this.binary(node);
                default:
                    throw new Error('TypeCheck: nodo sconosciuto ' + node.kind);
            }
        };

        Context.prototype.unary = function (node) {
            var type = this.type(node.operand);
            if (node.operator === 'not') {
                if (type !== 'Boolean') {
                    // Spesso è "not x > 5": il messaggio suggerisce le parentesi (§8.4).
                    stop('ERR_UNARY_OPERATOR_TYPE', { operator: 'not', type: shown(type), reason: 'not' }, node);
                }
                return 'Boolean';
            }
            if (!isNumeric(type)) {
                stop('ERR_UNARY_OPERATOR_TYPE', { operator: node.operator, type: shown(type) }, node);
            }
            return type;
        };

        Context.prototype.binary = function (node) {
            var operator = node.operator;
            var left = this.type(node.left);
            if (operator === 'and' || operator === 'or') {
                // A differenza dell'esecuzione, si controlla anche il secondo operando (DEC-044).
                if (left !== 'Boolean') {
                    stop('ERR_LOGICAL_OPERAND', { operator: operator, type: shown(left) }, node.left);
                }
                var second = this.type(node.right);
                if (second !== 'Boolean') {
                    stop('ERR_LOGICAL_OPERAND', { operator: operator, type: shown(second) }, node.right);
                }
                return 'Boolean';
            }
            var right = this.type(node.right);
            var numeric = isNumeric(left) && isNumeric(right);
            var types = function (reason) {
                var params = { operator: operator, left: shown(left), right: shown(right) };
                if (reason) {
                    params.reason = reason;
                }
                stop('ERR_BINARY_OPERATOR_TYPES', params, node);
            };
            switch (operator) {
                case '+':
                case '-':
                case '*':
                    if (!numeric) {
                        types(operator === '+' && (left === 'String' || right === 'String') ? 'stringPlus' : null);
                    }
                    if (left === 'Integer' && right === 'Integer') {
                        return 'Integer';
                    }
                    return left === 'Real' || right === 'Real' ? 'Real' : NUMBER;
                case '/':
                    if (!numeric) {
                        types(null);
                    }
                    return 'Real';
                case 'mod':
                    if (!maybeInteger(left) || !maybeInteger(right)) {
                        types(null);
                    }
                    return 'Integer';
                case '^':
                    if (!numeric) {
                        types(null);
                    }
                    return maybeInteger(left) && maybeInteger(right) ? NUMBER : 'Real';
                case '&':
                    return 'String';
                case '==':
                case '!=':
                    if (!numeric && left !== right) {
                        types(null);
                    }
                    return 'Boolean';
                default: // < <= > >=
                    if (left === 'Boolean' && right === 'Boolean') {
                        types('booleanOrder');
                    }
                    if (!numeric && !(left === 'String' && right === 'String')) {
                        types(null);
                    }
                    return 'Boolean';
            }
        };

        /* Argomento array: il nome di un array senza indice (§6.6); restituisce il suo simbolo. */
        Context.prototype.arrayArgument = function (node, functionName, position) {
            if (node.kind !== 'variable') {
                stop('ERR_ARRAY_ARGUMENT', { name: functionName, position: position }, node);
            }
            var symbol = this.lookup(node.name, node);
            if (!symbol.array) {
                stop('ERR_ARRAY_ARGUMENT', { name: functionName, position: position }, node);
            }
            return symbol;
        };

        /* Chiamata; allowNoValue per il blocco call, dove il valore si scarta (§6.8). */
        Context.prototype.call = function (node, allowNoValue) {
            var self = this;
            var builtin = Builtins.get(node.name);
            if (builtin) {
                if (node.args.length !== builtin.params.length) {
                    stop('ERR_ARGUMENT_COUNT', { name: node.name, expected: builtin.params.length, given: node.args.length }, node);
                }
                var argumentType = null;
                node.args.forEach(function (argument, i) {
                    var kind = builtin.params[i];
                    if (kind === 'array') {
                        self.arrayArgument(argument, node.name, i + 1);
                        return;
                    }
                    var type = self.type(argument);
                    var accepted = kind === 'simple' ||
                        ((kind === 'number' || kind === 'real') && isNumeric(type)) ||
                        (kind === 'integer' && maybeInteger(type)) ||
                        type === KIND_EXPECTED[kind];
                    if (!accepted) {
                        var params = { name: node.name, position: i + 1, expected: KIND_EXPECTED[kind], given: shown(type) };
                        if (kind === 'number' || kind === 'real') {
                            params.reason = 'number';
                        }
                        stop('ERR_ARGUMENT_TYPE', params, argument);
                    }
                    if (i === 0) {
                        argumentType = type;
                    }
                });
                return builtin.result === 'same' ? argumentType : builtin.result;
            }
            var callee = functionsByName[node.name];
            if (!callee || callee.name === 'Main') {
                var suggestion = suggestionFor(node.name, functionNames());
                stop('ERR_UNKNOWN_FUNCTION', suggestion ? { name: node.name, reason: 'case', suggestion: suggestion } : { name: node.name }, node);
            }
            if (callee.type === 'None' && !allowNoValue) {
                stop('ERR_FUNCTION_NO_VALUE', { name: node.name }, node);
            }
            if (node.args.length !== callee.parameters.length) {
                stop('ERR_ARGUMENT_COUNT', { name: node.name, expected: callee.parameters.length, given: node.args.length }, node);
            }
            node.args.forEach(function (argument, i) {
                var parameter = callee.parameters[i];
                if (parameter.array) {
                    var source = self.arrayArgument(argument, node.name, i + 1);
                    if (source.type !== parameter.type) {
                        stop('ERR_ARRAY_ARGUMENT', { name: node.name, position: i + 1 }, argument);
                    }
                    return;
                }
                var type = self.type(argument);
                if (!assignable(type, parameter.type)) {
                    stop('ERR_ARGUMENT_TYPE', { name: node.name, position: i + 1, expected: parameter.type, given: shown(type) }, argument);
                }
            });
            return callee.type === 'None' ? null : callee.type;
        };

        /* Bersaglio di un'assegnazione o di un input; restituisce il tipo che accetta. */
        Context.prototype.target = function (node) {
            var symbol = this.lookup(node.name, node);
            if (node.kind === 'variable' && symbol.array) {
                stop('ERR_ARRAY_WITHOUT_INDEX', { name: node.name }, node);
            }
            if (node.kind === 'index') {
                if (!symbol.array) {
                    stop('ERR_NOT_AN_ARRAY', { name: node.name }, node);
                }
                this.index(symbol, node.name, node.index);
            }
            return symbol.type;
        };

        function report(errors, block, field, run) {
            var ast = block.fields[field] && block.fields[field].ast;
            if (!ast) {
                return null; // errore di sintassi: lo segnala già il modello
            }
            try {
                return run(ast);
            } catch (problem) {
                if (!(problem instanceof Problem)) {
                    // Un difetto dell'analisi non deve impedire l'esecuzione: decide l'interprete.
                    return undefined;
                }
                var node = problem.node || ast;
                errors.push({
                    code: problem.code,
                    params: problem.params,
                    nodeId: block.id,
                    field: field,
                    position: typeof node.start === 'number'
                        ? { start: node.start, end: node.end, column: node.start + 1 }
                        : undefined
                });
                return undefined;
            }
        }

        function blockErrors(block, programFunction) {
            var errors = [];
            var context = new Context(programFunction);
            switch (block.kind) {
                case 'declare':
                    if (block.array) {
                        report(errors, block, 'size', function (ast) {
                            var type = context.type(ast);
                            if (!maybeInteger(type)) {
                                stop('ERR_ARRAY_SIZE_TYPE', { type: shown(type) }, ast);
                            }
                        });
                    }
                    break;
                case 'assign': {
                    var expected = report(errors, block, 'variable', function (ast) { return context.target(ast); });
                    report(errors, block, 'expression', function (ast) {
                        var given = context.type(ast);
                        if (typeof expected === 'string' && !assignable(given, expected)) {
                            var params = { name: block.fields.variable.ast.name, expected: expected, given: shown(given) };
                            if (expected === 'Integer' && given === 'Real') {
                                params.reason = 'realToInteger';
                            }
                            stop('ERR_ASSIGN_TYPE', params, ast);
                        }
                    });
                    break;
                }
                case 'input':
                    report(errors, block, 'variable', function (ast) { context.target(ast); });
                    break;
                case 'output':
                    report(errors, block, 'expression', function (ast) { context.type(ast); });
                    break;
                case 'if':
                case 'while':
                case 'do':
                    report(errors, block, 'expression', function (ast) {
                        var type = context.type(ast);
                        if (type !== 'Boolean') {
                            stop('ERR_CONDITION_TYPE', { type: shown(type) }, ast);
                        }
                    });
                    break;
                case 'for':
                    report(errors, block, 'variable', function (ast) {
                        var symbol = context.lookup(ast.name, ast);
                        if (symbol.array) {
                            stop('ERR_FOR_VARIABLE_TYPE', { name: ast.name, type: symbol.type, reason: 'array' }, ast);
                        }
                        if (symbol.type !== 'Integer') {
                            stop('ERR_FOR_VARIABLE_TYPE', { name: ast.name, type: symbol.type }, ast);
                        }
                    });
                    ['start', 'end'].forEach(function (field) {
                        report(errors, block, field, function (ast) {
                            var type = context.type(ast);
                            if (!maybeInteger(type)) {
                                stop('ERR_FOR_BOUND_TYPE', { type: shown(type) }, ast);
                            }
                        });
                    });
                    break;
                case 'call':
                    report(errors, block, 'expression', function (ast) {
                        if (ast.kind === 'call') {
                            context.call(ast, true);
                        }
                    });
                    break;
                default:
                    break; // comment: niente da controllare
            }
            return errors;
        }

        /* Valore di ritorno: la variabile indicata va dichiarata, non array, del tipo giusto (§6.8). */
        function functionErrors(programFunction) {
            // Main non restituisce nulla (lo dice ERR_MAIN_SIGNATURE); un nome non valido ha già il suo errore.
            if (programFunction.type === 'None' || programFunction.name === 'Main' || !programFunction.variable ||
                OnoFlow.Expressions.parseName(programFunction.variable).error) {
                return [];
            }
            var symbol = symbolsOf(programFunction)[programFunction.variable];
            var params = { name: programFunction.variable, 'function': programFunction.name };
            if (!symbol) {
                return [{ code: 'ERR_RETURN_UNDECLARED', params: params, nodeId: programFunction.id, field: 'variable' }];
            }
            if (symbol.array || !assignable(symbol.type, programFunction.type)) {
                params.expected = programFunction.type;
                params.given = symbol.type;
                return [{ code: 'ERR_RETURN_TYPE', params: params, nodeId: programFunction.id, field: 'variable' }];
            }
            return [];
        }

        return { blockErrors: blockErrors, functionErrors: functionErrors };
    }

    OnoFlow.TypeCheck = { create: create, suggestionFor: suggestionFor };
})(window.OnoFlow);
