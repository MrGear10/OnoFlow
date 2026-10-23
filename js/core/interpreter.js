/*
 * OnoFlow — interprete basato su funzioni generatore (§6, §10.3).
 *
 * Dipendenze: js/namespace.js, js/core/number-format.js, js/core/values.js,
 *             js/core/builtins.js, js/core/static-check.js.
 * Definisce: OnoFlow.Interpreter.{execute, runSync, MAX_RECURSION, MAX_ARRAY_SIZE}
 *
 * execute(program, options) restituisce un generatore che cede eventi:
 *     { type: 'step', nodeId, frame }          prima di ogni blocco e a ogni verifica
 *                                              della condizione di un ciclo; frame è la
 *                                              chiamata in corso (frame.snapshot(),
 *                                              frame.programFunction.name: FR-RUN-06)
 *     { type: 'output', text, newline }
 *     { type: 'input', valueType, nodeId, error }   il testo digitato torna con next(testo);
 *                                              error è l'errore del tentativo precedente
 * e alla fine restituisce (done: true) l'esito:
 *     { status: 'done' }
 *     { status: 'error', error: { code, params, nodeId, functionName, variables } }
 *     { status: 'invalid', errors }            errori statici: non si esegue (FR-RUN-02)
 *
 * Opzioni: numberFormat (dal catalogo), random (funzione come Math.random, DEC-011),
 * typeCheck: false (solo nei test: senza l'analisi statica dei tipi, passo 16),
 * invalidInput: 'retry' (si richiede il valore) oppure 'error' (l'esecuzione si ferma).
 * Per fermare l'esecuzione dall'esterno: generatore.throw(new Values.RuntimeFailure('ERR_STOPPED')):
 * l'errore riceve il blocco e le variabili del punto in cui si trovava.
 *
 * runSync(program, inputs, options) esegue tutto subito, con input noti: serve ai test,
 * con un limite di passi e di tempo perché un difetto non blocchi la pagina (QA-10).
 */
(function (OnoFlow) {
    'use strict';

    var Values = OnoFlow.Values;
    var Builtins = OnoFlow.Builtins;
    var NumberFormat = OnoFlow.NumberFormat;
    var StaticCheck = OnoFlow.StaticCheck;
    if (!Values || !Builtins || !StaticCheck) {
        throw new Error('interpreter.js richiede values.js, builtins.js e static-check.js, da caricare prima');
    }

    var RuntimeFailure = Values.RuntimeFailure;
    var fail = Values.fail;

    var MAX_RECURSION = 1000;
    var MAX_ARRAY_SIZE = 1000000;
    var DEFAULT_NUMBER_FORMAT = { decimalSeparator: ',', inputDecimalSeparators: [',', '.'] };

    /* Variabili di una chiamata di funzione (§6.5: ogni funzione vede solo le sue). */
    function Frame(programFunction) {
        this.programFunction = programFunction;
        this.variables = Object.create(null);
        this.order = [];
    }

    /*
     * Dichiara una variabile. Rieseguire la stessa dichiarazione (es. in un ciclo) la
     * riporta a non inizializzata, come una variabile locale in C++ (§6.5).
     * L'oggetto resta lo stesso, così un for che la usa vede il cambiamento.
     */
    Frame.prototype.declare = function (name, type, isArray, size) {
        var variable = this.variables[name];
        if (!variable) {
            variable = { name: name };
            this.variables[name] = variable;
            this.order.push(name);
        }
        variable.type = type;
        variable.array = isArray;
        variable.value = undefined;
        variable.elements = isArray ? new Array(size) : null;
        return variable;
    };

    /* Un parametro array condivide l'array del chiamante (per riferimento, §6.8). */
    Frame.prototype.bindArray = function (name, source) {
        var variable = { name: name, type: source.type, array: true, value: undefined, elements: source.elements };
        this.variables[name] = variable;
        this.order.push(name);
    };

    Frame.prototype.find = function (name) {
        return this.variables[name] || null;
    };

    Frame.prototype.lookup = function (name) {
        var variable = this.variables[name];
        if (!variable) {
            fail('ERR_UNDECLARED_VARIABLE', { name: name });
        }
        return variable;
    };

    /* Fotografia delle variabili per i messaggi di errore (FR-ERR-03). */
    Frame.prototype.snapshot = function () {
        var variables = this.variables;
        return this.order.map(function (name) {
            var variable = variables[name];
            return {
                name: name,
                type: variable.type,
                array: variable.array,
                value: variable.value,
                elements: variable.array ? variable.elements.slice() : null
            };
        });
    };

    /* Assegna il blocco e le variabili a un errore che non li ha ancora. */
    function annotate(failure, nodeId, frame) {
        if (failure instanceof RuntimeFailure && failure.nodeId === null) {
            failure.nodeId = nodeId;
            failure.variables = frame.snapshot();
            failure.functionName = frame.programFunction.name;
        }
        return failure;
    }

    function failAt(code, params, nodeId, frame) {
        throw annotate(new RuntimeFailure(code, params), nodeId, frame);
    }

    function Execution(program, options) {
        var settings = options || {};
        this.program = program;
        this.functions = Object.create(null);
        for (var i = 0; i < program.functions.length; i++) {
            this.functions[program.functions[i].name] = program.functions[i];
        }
        this.context = {
            numberFormat: settings.numberFormat || DEFAULT_NUMBER_FORMAT,
            random: settings.random || Math.random
        };
        this.invalidInput = settings.invalidInput || 'retry';
        this.depth = 0;
        this.currentNodeId = null;
    }

    Execution.prototype.step = function (nodeId, frame) {
        this.currentNodeId = nodeId;
        return { type: 'step', nodeId: nodeId, frame: frame };
    };

    Execution.prototype.executeBlocks = function* (blocks, frame) {
        for (var i = 0; i < blocks.length; i++) {
            yield this.executeBlock(blocks[i], frame);
        }
    };

    Execution.prototype.executeBlock = function* (block, frame) {
        if (block.kind === 'comment') {
            return; // Un commento non si esegue e non consuma passi.
        }
        try {
            yield this.step(block.id, frame);
            switch (block.kind) {
                case 'declare': yield this.executeDeclare(block, frame); break;
                case 'assign': yield this.executeAssign(block, frame); break;
                case 'input': yield this.executeInput(block, frame); break;
                case 'output': yield this.executeOutput(block, frame); break;
                case 'if': yield this.executeIf(block, frame); break;
                case 'while': yield this.executeWhile(block, frame); break;
                case 'do': yield this.executeDo(block, frame); break;
                case 'for': yield this.executeFor(block, frame); break;
                case 'call': yield this.callFunction(block.fields.expression.ast, frame, true); break;
                default: throw new Error('blocco sconosciuto ' + block.kind);
            }
        } catch (failure) {
            throw annotate(failure, block.id, frame);
        }
    };

    Execution.prototype.executeDeclare = function* (block, frame) {
        var size = 0;
        if (block.array) {
            var sizeValue = yield this.evaluate(block.fields.size.ast, frame);
            if (sizeValue.type !== 'Integer') {
                fail('ERR_ARRAY_SIZE_TYPE', { type: sizeValue.type });
            }
            if (sizeValue.value < 1) {
                fail('ERR_ARRAY_SIZE_INVALID', { size: sizeValue.value });
            }
            if (sizeValue.value > MAX_ARRAY_SIZE) {
                fail('ERR_ARRAY_TOO_LARGE', { size: sizeValue.value, max: MAX_ARRAY_SIZE });
            }
            size = sizeValue.value;
        }
        block.fields.names.ast.names.forEach(function (entry) {
            frame.declare(entry.name, block.type, block.array, size);
        });
    };

    /* Controlla il bersaglio di un'assegnazione o di un input e restituisce la variabile. */
    function targetVariable(target, frame) {
        var variable = frame.lookup(target.name);
        if (target.kind === 'variable' && variable.array) {
            fail('ERR_ARRAY_WITHOUT_INDEX', { name: target.name });
        }
        if (target.kind === 'index' && !variable.array) {
            fail('ERR_NOT_AN_ARRAY', { name: target.name });
        }
        return variable;
    }

    /* Scrive un valore nel bersaglio. L'indice si valuta qui, dopo il valore (§6.5). */
    Execution.prototype.store = function* (target, value, frame) {
        var variable = targetVariable(target, frame);
        var converted = Values.convertTo(value, variable.type);
        if (!converted) {
            var params = { name: target.name, expected: variable.type, given: value.type };
            if (variable.type === 'Integer' && value.type === 'Real') {
                params.reason = 'realToInteger';
            }
            fail('ERR_ASSIGN_TYPE', params);
        }
        if (target.kind === 'index') {
            var index = yield this.evaluateIndex(variable, target.index, frame);
            variable.elements[index] = converted.value;
        } else {
            variable.value = converted.value;
        }
    };

    Execution.prototype.executeAssign = function* (block, frame) {
        var value = yield this.evaluate(block.fields.expression.ast, frame);
        yield this.store(block.fields.variable.ast, value, frame);
    };

    Execution.prototype.executeInput = function* (block, frame) {
        var target = block.fields.variable.ast;
        var variable = targetVariable(target, frame);
        var problem = null;
        var parsed;
        while (true) {
            var text = yield { type: 'input', valueType: variable.type, nodeId: block.id, error: problem };
            parsed = NumberFormat.parseInput(String(text), variable.type, this.context.numberFormat);
            if (parsed.ok) {
                break;
            }
            if (this.invalidInput === 'error') {
                fail(parsed.error.code, parsed.error.params);
            }
            problem = parsed.error;
        }
        yield this.store(target, Values.typed(variable.type, parsed.value), frame);
    };

    Execution.prototype.executeOutput = function* (block, frame) {
        var value = yield this.evaluate(block.fields.expression.ast, frame);
        yield { type: 'output', text: Values.toText(value, this.context.numberFormat), newline: block.newline };
    };

    Execution.prototype.condition = function* (block, frame) {
        var value = yield this.evaluate(block.fields.expression.ast, frame);
        if (value.type !== 'Boolean') {
            fail('ERR_CONDITION_TYPE', { type: value.type });
        }
        return value.value;
    };

    Execution.prototype.executeIf = function* (block, frame) {
        var isTrue = yield this.condition(block, frame);
        yield this.executeBlocks(isTrue ? block.then : block['else'], frame);
    };

    Execution.prototype.executeWhile = function* (block, frame) {
        // La prima verifica usa il passo del blocco; le successive ne cedono uno nuovo.
        var first = true;
        while (true) {
            if (!first) {
                yield this.step(block.id, frame);
            }
            first = false;
            if (!(yield this.condition(block, frame))) {
                return;
            }
            yield this.executeBlocks(block.body, frame);
        }
    };

    Execution.prototype.executeDo = function* (block, frame) {
        // Do-while: prima il corpo, poi si ripete finché la condizione è vera (§6.7).
        while (true) {
            yield this.executeBlocks(block.body, frame);
            yield this.step(block.id, frame);
            if (!(yield this.condition(block, frame))) {
                return;
            }
        }
    };

    /*
     * for (§6.7): estremi valutati una volta, fine inclusa, la variabile riparte dal suo
     * valore corrente; se l'incremento uscirebbe dagli Integer il ciclo termina.
     */
    Execution.prototype.executeFor = function* (block, frame) {
        var name = block.fields.variable.ast.name;
        var variable = frame.lookup(name);
        if (variable.array || variable.type !== 'Integer') {
            fail('ERR_FOR_VARIABLE_TYPE', variable.array ? { name: name, type: variable.type, reason: 'array' } : { name: name, type: variable.type });
        }
        var start = yield this.evaluate(block.fields.start.ast, frame);
        if (start.type !== 'Integer') {
            fail('ERR_FOR_BOUND_TYPE', { type: start.type });
        }
        var end = yield this.evaluate(block.fields.end.ast, frame);
        if (end.type !== 'Integer') {
            fail('ERR_FOR_BOUND_TYPE', { type: end.type });
        }
        var step = block.fields.step.ast.value;
        var increasing = block.direction === 'inc';

        variable.value = start.value;
        var first = true;
        while (true) {
            if (!first) {
                yield this.step(block.id, frame);
            }
            first = false;
            var current = variable.value;
            if (current === undefined) {
                fail('ERR_UNINITIALIZED_VARIABLE', { name: name });
            }
            if (increasing ? current > end.value : current < end.value) {
                return;
            }
            yield this.executeBlocks(block.body, frame);
            current = variable.value;
            if (current === undefined) {
                fail('ERR_UNINITIALIZED_VARIABLE', { name: name });
            }
            var next = increasing ? current + step : current - step;
            if (next > Values.INTEGER_MAX || next < Values.INTEGER_MIN) {
                return; // Vicino al massimo: si esce senza overflow, la variabile resta all'ultimo valore.
            }
            variable.value = next;
        }
    };

    /* Indice di un array: Integer, dentro i limiti (§6.6). */
    Execution.prototype.evaluateIndex = function* (variable, indexNode, frame) {
        var index = yield this.evaluate(indexNode, frame);
        if (index.type !== 'Integer') {
            fail('ERR_INDEX_TYPE', { name: variable.name, type: index.type });
        }
        var size = variable.elements.length;
        if (index.value < 0 || index.value >= size) {
            fail('ERR_INDEX_OUT_OF_BOUNDS', { name: variable.name, index: index.value, size: size, last: size - 1 });
        }
        return index.value;
    };

    Execution.prototype.evaluate = function* (node, frame) {
        switch (node.kind) {
            case 'literal':
                return Values.typed(node.type, node.value);
            case 'variable': {
                var variable = frame.lookup(node.name);
                if (variable.array) {
                    fail('ERR_ARRAY_WITHOUT_INDEX', { name: node.name });
                }
                if (variable.value === undefined) {
                    fail('ERR_UNINITIALIZED_VARIABLE', { name: node.name });
                }
                return Values.typed(variable.type, variable.value);
            }
            case 'index': {
                var arrayVariable = frame.lookup(node.name);
                if (!arrayVariable.array) {
                    fail('ERR_NOT_AN_ARRAY', { name: node.name });
                }
                var index = yield this.evaluateIndex(arrayVariable, node.index, frame);
                var element = arrayVariable.elements[index];
                if (element === undefined) {
                    fail('ERR_UNINITIALIZED_VARIABLE', { name: node.name, index: index, reason: 'element' });
                }
                return Values.typed(arrayVariable.type, element);
            }
            case 'call':
                return yield this.callFunction(node, frame, false);
            case 'unary':
                return unary(node.operator, yield this.evaluate(node.operand, frame));
            case 'binary':
                return yield this.evaluateBinary(node, frame);
            default:
                throw new Error('nodo sconosciuto ' + node.kind);
        }
    };

    Execution.prototype.evaluateBinary = function* (node, frame) {
        var operator = node.operator;
        if (operator === 'and' || operator === 'or') {
            // Cortocircuito: il secondo operando si valuta solo se serve (§6.4).
            var left = yield this.evaluate(node.left, frame);
            if (left.type !== 'Boolean') {
                fail('ERR_LOGICAL_OPERAND', { operator: operator, type: left.type });
            }
            if (operator === 'and' ? !left.value : left.value) {
                return left;
            }
            var right = yield this.evaluate(node.right, frame);
            if (right.type !== 'Boolean') {
                fail('ERR_LOGICAL_OPERAND', { operator: operator, type: right.type });
            }
            return right;
        }
        var leftValue = yield this.evaluate(node.left, frame);
        var rightValue = yield this.evaluate(node.right, frame);
        return binary(operator, leftValue, rightValue, this.context.numberFormat);
    };

    function unary(operator, value) {
        if (operator === 'not') {
            if (value.type !== 'Boolean') {
                // Spesso è "not x > 5": il messaggio suggerisce le parentesi (§8.4).
                fail('ERR_UNARY_OPERATOR_TYPE', { operator: 'not', type: value.type, reason: 'not' });
            }
            return Values.boolean(!value.value);
        }
        if (!Values.isNumeric(value.type)) {
            fail('ERR_UNARY_OPERATOR_TYPE', { operator: operator, type: value.type });
        }
        if (operator === '+') {
            return value;
        }
        return value.type === 'Integer' ? Values.integer(-value.value) : Values.real(-value.value);
    }

    function typesError(operator, left, right, reason) {
        var params = { operator: operator, left: left.type, right: right.type };
        if (reason) {
            params.reason = reason;
        }
        fail('ERR_BINARY_OPERATOR_TYPES', params);
    }

    /* Potenza tra Integer con esponente ≥ 0: Integer, con controllo dell'overflow (§6.4). */
    function integerPower(base, exponent) {
        if (exponent === 0) {
            return Values.integer(1);
        }
        if (base === 0 || base === 1) {
            return Values.integer(base);
        }
        if (base === -1) {
            return Values.integer(exponent % 2 === 0 ? 1 : -1);
        }
        if (exponent > 31) {
            fail('ERR_INTEGER_OVERFLOW', {}); // |base| ≥ 2: già 2^32 è fuori intervallo
        }
        var result = BigInt(base) ** BigInt(exponent);
        if (result > BigInt(Values.INTEGER_MAX) || result < BigInt(Values.INTEGER_MIN)) {
            fail('ERR_INTEGER_OVERFLOW', {});
        }
        return Values.integer(Number(result));
    }

    function binary(operator, left, right, numberFormat) {
        var numeric = Values.isNumeric(left.type) && Values.isNumeric(right.type);
        var bothInteger = left.type === 'Integer' && right.type === 'Integer';
        switch (operator) {
            case '+':
            case '-':
            case '*': {
                if (!numeric) {
                    typesError(operator, left, right,
                        operator === '+' && (left.type === 'String' || right.type === 'String') ? 'stringPlus' : null);
                }
                var a = left.value;
                var b = right.value;
                var result = operator === '+' ? a + b : (operator === '-' ? a - b : a * b);
                return bothInteger ? Values.integer(result) : Values.real(result);
            }
            case '/':
                if (!numeric) {
                    typesError(operator, left, right);
                }
                if (right.value === 0) {
                    fail('ERR_DIVISION_BY_ZERO', {});
                }
                // "/" dà sempre un Real, anche tra Integer (§6.4).
                return Values.real(left.value / right.value);
            case 'mod':
                if (!bothInteger) {
                    typesError(operator, left, right);
                }
                if (right.value === 0) {
                    fail('ERR_DIVISION_BY_ZERO', {});
                }
                // % di JavaScript ha il segno del dividendo, come in C++: -7 mod 3 → -1.
                return Values.integer(left.value % right.value);
            case '^':
                if (!numeric) {
                    typesError(operator, left, right);
                }
                if (bothInteger && right.value >= 0) {
                    return integerPower(left.value, right.value);
                }
                return Values.real(Math.pow(left.value, right.value));
            case '&':
                return Values.string(Values.toText(left, numberFormat) + Values.toText(right, numberFormat));
            case '==':
            case '!=': {
                var comparable = numeric || left.type === right.type;
                if (!comparable) {
                    typesError(operator, left, right);
                }
                var equal = left.value === right.value;
                return Values.boolean(operator === '==' ? equal : !equal);
            }
            case '<':
            case '<=':
            case '>':
            case '>=': {
                if (left.type === 'Boolean' && right.type === 'Boolean') {
                    typesError(operator, left, right, 'booleanOrder');
                }
                if (!numeric && !(left.type === 'String' && right.type === 'String')) {
                    typesError(operator, left, right);
                }
                // Le stringhe si confrontano per codice dei caratteri: "Z" < "a" (§6.4).
                var x = left.value;
                var y = right.value;
                var outcome = operator === '<' ? x < y : operator === '<=' ? x <= y : operator === '>' ? x > y : x >= y;
                return Values.boolean(outcome);
            }
            default:
                throw new Error('operatore sconosciuto ' + operator);
        }
    }

    var KIND_EXPECTED = { number: 'Real', real: 'Real', integer: 'Integer', string: 'String' };

    /* Argomento array: deve essere il nome di un array, senza indice (§6.6, §6.8). */
    function arrayArgument(node, frame, functionName, position) {
        if (node.kind !== 'variable') {
            fail('ERR_ARRAY_ARGUMENT', { name: functionName, position: position });
        }
        var variable = frame.lookup(node.name);
        if (!variable.array) {
            fail('ERR_ARRAY_ARGUMENT', { name: functionName, position: position });
        }
        return variable;
    }

    Execution.prototype.callBuiltin = function* (node, builtin, frame) {
        if (node.args.length !== builtin.params.length) {
            fail('ERR_ARGUMENT_COUNT', { name: node.name, expected: builtin.params.length, given: node.args.length });
        }
        var args = [];
        for (var i = 0; i < node.args.length; i++) {
            var kind = builtin.params[i];
            if (kind === 'array') {
                args.push(arrayArgument(node.args[i], frame, node.name, i + 1));
                continue;
            }
            var value = yield this.evaluate(node.args[i], frame);
            var accepted = kind === 'simple' ||
                ((kind === 'number' || kind === 'real') && Values.isNumeric(value.type)) ||
                value.type === KIND_EXPECTED[kind];
            if (!accepted) {
                var params = { name: node.name, position: i + 1, expected: KIND_EXPECTED[kind], given: value.type };
                if (kind === 'number' || kind === 'real') {
                    params.reason = 'number';
                }
                fail('ERR_ARGUMENT_TYPE', params);
            }
            args.push(kind === 'real' ? Values.convertTo(value, 'Real') : value);
        }
        return builtin.call(args, this.context);
    };

    /*
     * Chiamata di funzione. allowNoValue è vero per il blocco call, dove il valore si
     * scarta e una funzione senza ritorno va bene (§6.8).
     */
    Execution.prototype.callFunction = function* (node, frame, allowNoValue) {
        var builtin = Builtins.get(node.name);
        if (builtin) {
            return yield this.callBuiltin(node, builtin, frame);
        }
        var callee = this.functions[node.name];
        if (!callee || callee.name === 'Main') {
            fail('ERR_UNKNOWN_FUNCTION', { name: node.name });
        }
        if (callee.type === 'None' && !allowNoValue) {
            fail('ERR_FUNCTION_NO_VALUE', { name: node.name });
        }
        if (node.args.length !== callee.parameters.length) {
            fail('ERR_ARGUMENT_COUNT', { name: node.name, expected: callee.parameters.length, given: node.args.length });
        }

        // Gli argomenti si valutano tutti nella funzione chiamante, da sinistra.
        var bindings = [];
        for (var i = 0; i < node.args.length; i++) {
            var parameter = callee.parameters[i];
            if (parameter.array) {
                var source = arrayArgument(node.args[i], frame, node.name, i + 1);
                if (source.type !== parameter.type) {
                    fail('ERR_ARRAY_ARGUMENT', { name: node.name, position: i + 1 });
                }
                bindings.push({ parameter: parameter, array: source });
                continue;
            }
            var value = yield this.evaluate(node.args[i], frame);
            var converted = Values.convertTo(value, parameter.type);
            if (!converted) {
                fail('ERR_ARGUMENT_TYPE', { name: node.name, position: i + 1, expected: parameter.type, given: value.type });
            }
            bindings.push({ parameter: parameter, value: converted });
        }

        if (this.depth >= MAX_RECURSION) {
            fail('ERR_RECURSION_LIMIT', { max: MAX_RECURSION });
        }
        var calleeFrame = new Frame(callee);
        bindings.forEach(function (binding) {
            if (binding.array) {
                calleeFrame.bindArray(binding.parameter.name, binding.array);
            } else {
                calleeFrame.declare(binding.parameter.name, binding.parameter.type, false, 0).value = binding.value.value;
            }
        });

        this.depth++;
        try {
            yield this.executeBlocks(callee.body, calleeFrame);
        } finally {
            this.depth--;
        }
        if (callee.type === 'None') {
            return null;
        }
        return returnValue(callee, calleeFrame);
    };

    /* Valore di ritorno: la variabile indicata nella funzione (§6.8). */
    function returnValue(callee, calleeFrame) {
        var params = { name: callee.variable, 'function': callee.name };
        var variable = calleeFrame.find(callee.variable);
        if (!variable) {
            failAt('ERR_RETURN_UNDECLARED', params, callee.id, calleeFrame);
        }
        if (variable.array) {
            params.expected = callee.type;
            params.given = variable.type;
            failAt('ERR_RETURN_TYPE', params, callee.id, calleeFrame);
        }
        if (variable.value === undefined) {
            failAt('ERR_RETURN_NOT_SET', params, callee.id, calleeFrame);
        }
        var converted = Values.convertTo(Values.typed(variable.type, variable.value), callee.type);
        if (!converted) {
            params.expected = callee.type;
            params.given = variable.type;
            failAt('ERR_RETURN_TYPE', params, callee.id, calleeFrame);
        }
        return converted;
    }

    function errorFromFailure(failure) {
        return {
            code: failure.code,
            params: failure.params,
            nodeId: failure.nodeId,
            functionName: failure.functionName,
            variables: failure.variables
        };
    }

    /* Stack esaurito: "too much recursion" in Firefox, "Maximum call stack size exceeded" in Chromium e Safari. */
    function isStackOverflow(error) {
        var message = String((error && error.message) || '');
        return Boolean(error) && (error.name === 'InternalError' || error instanceof RangeError) &&
            /too much recursion|call stack/i.test(message);
    }

    Execution.prototype.run = function* () {
        var main = this.functions.Main;
        var frame = new Frame(main);
        try {
            yield this.executeBlocks(main.body, frame);
            return { status: 'done' };
        } catch (failure) {
            if (failure instanceof RuntimeFailure) {
                return { status: 'error', error: errorFromFailure(failure) };
            }
            if (isStackOverflow(failure)) {
                // Il motore ha finito lo stack prima del limite: per lo studente è la stessa cosa.
                return {
                    status: 'error',
                    error: { code: 'ERR_RECURSION_LIMIT', params: { max: MAX_RECURSION }, nodeId: this.currentNodeId, functionName: null, variables: null }
                };
            }
            // Difetto dell'interprete: l'esecuzione termina invece di bloccarsi (NFR-PERF-03).
            return {
                status: 'error',
                error: {
                    code: 'ERR_INTERNAL', params: { detail: String((failure && failure.message) || failure) },
                    nodeId: this.currentNodeId, functionName: null, variables: null
                }
            };
        }
    };

    function isGenerator(value) {
        return Object.prototype.toString.call(value) === '[object Generator]';
    }

    /*
     * Trampolino (DEC-041). I generatori dell'interprete non delegano con yield*: cedono
     * il sotto-generatore da eseguire, e qui lo si mette in una pila esplicita. Il valore
     * restituito da un sotto-generatore torna al chiamante come risultato del suo yield;
     * un'eccezione gli arriva con throw, quindi try/catch e finally funzionano come prima.
     * Così lo stack nativo non cresce con la profondità delle chiamate (1000 livelli di
     * ricorsione, §6.8) e ogni passo costa uguale a qualunque profondità.
     * Gli eventi (step, output, input) escono all'esterno; ciò che l'esterno invia con
     * next(valore) o throw(errore) arriva al generatore in cima alla pila.
     */
    function* trampoline(root) {
        var stack = [root];
        var toSend;
        var pendingError = null;
        var hasError = false;
        while (true) {
            var top = stack[stack.length - 1];
            var result;
            try {
                result = hasError ? top.throw(pendingError) : top.next(toSend);
                hasError = false;
                pendingError = null;
                toSend = undefined;
            } catch (error) {
                stack.pop();
                if (stack.length === 0) {
                    throw error;
                }
                hasError = true;
                pendingError = error;
                toSend = undefined;
                continue;
            }
            if (result.done) {
                stack.pop();
                if (stack.length === 0) {
                    return result.value;
                }
                toSend = result.value;
                continue;
            }
            if (isGenerator(result.value)) {
                stack.push(result.value);
                continue;
            }
            try {
                toSend = yield result.value;
            } catch (error) {
                hasError = true;
                pendingError = error;
            }
        }
    }

    function* invalid(errors) {
        return { status: 'invalid', errors: errors };
    }

    function execute(program, options) {
        // typeCheck: false salta l'analisi dei tipi (FR-ERR-06): solo per i test dei controlli
        // fatti durante l'esecuzione, che restano per i casi che dipendono dai valori.
        var errors = StaticCheck.check(program, { types: !(options && options.typeCheck === false) });
        if (errors.length > 0) {
            return invalid(errors);
        }
        return trampoline(new Execution(program, options).run());
    }

    function nowMs() {
        return (window.performance && window.performance.now) ? window.performance.now() : Date.now();
    }

    /*
     * Esecuzione sincrona con input già noti (§10.3), per i test.
     * Restituisce { status, output, error, errors, steps }, dove output è il testo della
     * console con gli input digitati, e status può essere anche:
     *     'waitingInput' — servivano altri input; 'limit' — troppi passi; 'timeout' — troppo tempo.
     */
    function runSync(program, inputs, options) {
        var settings = options || {};
        var maxSteps = settings.maxSteps || 1000000;
        var maxMs = settings.maxMs || 2000;
        var startedAt = nowMs();
        var generator = execute(program, settings);
        var output = '';
        var steps = 0;
        var inputIndex = 0;
        var toSend;

        while (true) {
            var result = generator.next(toSend);
            toSend = undefined;
            if (result.done) {
                return {
                    status: result.value.status, output: output, steps: steps,
                    error: result.value.error || null, errors: result.value.errors || null
                };
            }
            var event = result.value;
            if (event.type === 'step') {
                steps++;
                if (steps > maxSteps) {
                    generator.return();
                    return { status: 'limit', output: output, steps: steps, error: null, errors: null };
                }
                if (steps % 1000 === 0 && nowMs() - startedAt > maxMs) {
                    generator.return();
                    return { status: 'timeout', output: output, steps: steps, error: null, errors: null };
                }
            } else if (event.type === 'output') {
                output += event.text + (event.newline ? '\n' : '');
            } else if (event.type === 'input') {
                if (inputIndex >= inputs.length) {
                    generator.return();
                    return { status: 'waitingInput', output: output, steps: steps, error: null, errors: null };
                }
                toSend = inputs[inputIndex++];
                output += toSend + '\n';
            }
        }
    }

    OnoFlow.Interpreter = {
        MAX_RECURSION: MAX_RECURSION,
        MAX_ARRAY_SIZE: MAX_ARRAY_SIZE,
        execute: execute,
        runSync: runSync
    };
})(window.OnoFlow);
