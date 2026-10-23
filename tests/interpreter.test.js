/*
 * OnoFlow — test dell'interprete e delle funzioni predefinite (§6, §8, QA-04, QA-10).
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*, js/examples/examples.js, js/i18n/*.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var OnoFlow = window.OnoFlow;
    var Interpreter = OnoFlow.Interpreter;
    var Values = OnoFlow.Values;

    // Ogni errore di runtime prodotto nei test: alla fine si controllano i messaggi (QA-07).
    var RUNTIME_ERRORS = [];

    /*
     * Questi test provano i controlli fatti durante l'esecuzione: l'analisi statica dei tipi
     * (passo 16) li troverebbe prima, quindi qui è spenta. La provano tests/type-check.test.js.
     */
    function run(program, inputs, options) {
        var settings = { typeCheck: false };
        Object.keys(options || {}).forEach(function (key) { settings[key] = options[key]; });
        var result = Interpreter.runSync(program, inputs || [], settings);
        if (result.error) {
            RUNTIME_ERRORS.push(result.error);
        }
        return result;
    }

    /* Output di un programma Main = blocchi. */
    function outputOf(blocks, inputs, options) {
        var result = run(H.program(blocks), inputs, options);
        if (result.status !== 'done') {
            return 'ESITO:' + result.status + (result.error ? ':' + result.error.code : '');
        }
        return result.output;
    }

    /* Valore stampato di una sola espressione. */
    function show(expression) {
        return outputOf([H.output(expression, false)]);
    }

    /* Codice d'errore (ed eventuale motivo) di un'espressione stampata. */
    function errorOf(blocks, inputs, options) {
        var result = run(H.program(blocks), inputs, options);
        if (!result.error) {
            return 'NESSUN ERRORE (' + result.status + ')';
        }
        return result.error.code + (result.error.params.reason ? '.' + result.error.params.reason : '');
    }

    function expressionError(expression) {
        return errorOf([H.output(expression)]);
    }

    function table(assert, cases, convert) {
        cases.forEach(function (testCase) {
            assert.equal(convert(testCase[0]), testCase[1], 'caso ' + T.formatValue(testCase[0]));
        });
    }

    T.suite('Interprete › operatori (§6.4)', function () {
        T.test('/ dà sempre Real', function (assert) {
            table(assert, [['7 / 2', '3,5'], ['6 / 3', '2'], ['1 / 3', '0,33'], ['-7 / 2', '-3,5']], show);
            assert.equal(errorOf([H.declare('c', 'Integer'), H.assign('c', '6 / 3')]), 'ERR_ASSIGN_TYPE.realToInteger');
        });

        T.test('divisione per zero, tra Integer e tra Real, anche con mod', function (assert) {
            table(assert, [
                ['1 / 0', 'ERR_DIVISION_BY_ZERO'],
                ['1.5 / 0.0', 'ERR_DIVISION_BY_ZERO'],
                ['7 mod 0', 'ERR_DIVISION_BY_ZERO']
            ], expressionError);
        });

        T.test('overflow degli Integer', function (assert) {
            table(assert, [
                ['2147483647 + 1', 'ERR_INTEGER_OVERFLOW'],
                ['-2147483648 - 1', 'ERR_INTEGER_OVERFLOW'],
                ['65536 * 65536', 'ERR_INTEGER_OVERFLOW'],
                ['-(-2147483648)', 'ERR_INTEGER_OVERFLOW']
            ], expressionError);
            table(assert, [['2147483646 + 1', '2147483647'], ['-2147483648', '-2147483648'], ['2147483647.0 + 1', '2147483648']], show);
        });

        T.test('mod: solo Integer, segno del dividendo', function (assert) {
            table(assert, [['-7 mod 3', '-1'], ['7 mod -3', '1'], ['7 % 3', '1'], ['-6 mod 3', '0']], show);
            assert.equal(expressionError('7.5 mod 2'), 'ERR_BINARY_OPERATOR_TYPES');
        });

        T.test('potenza', function (assert) {
            table(assert, [
                ['2 ^ 3', '8'], ['2 ^ -1', '0,5'], ['2 ^ 30', '1073741824'], ['(-2) ^ 31', '-2147483648'],
                ['(-2) ^ 3', '-8'], ['0 ^ 0', '1'], ['-2 ^ 2', '-4'], ['2 ^ 3 ^ 2', '512'], ['1 ^ 1000000', '1'],
                ['(-1) ^ 7', '-1'], ['2.0 ^ 0.5 * 2.0 ^ 0.5', '2']
            ], show);
            table(assert, [
                ['2 ^ 31', 'ERR_INTEGER_OVERFLOW'],
                ['3 ^ 100', 'ERR_INTEGER_OVERFLOW'],
                ['10.0 ^ 400', 'ERR_REAL_NOT_FINITE'],
                ['(-8) ^ (1 / 3)', 'ERR_REAL_NOT_FINITE'],
                ['0 ^ -1', 'ERR_REAL_NOT_FINITE']
            ], expressionError);
            assert.equal(outputOf([H.declare('x', 'Integer'), H.assign('x', '2 ^ 3'), H.output('x')]), '8\n');
        });

        T.test('concatenazione con &', function (assert) {
            table(assert, [
                ['"Somma: " & 3 + 4', 'Somma: 7'],
                ['true & "!"', 'true!'],
                ['2.5 & ""', '2,5'],
                ['1 / 3 & " circa"', '0,33 circa'],
                ['"a" & "b" & "c"', 'abc']
            ], show);
            assert.equal(expressionError('"a" + "b"'), 'ERR_BINARY_OPERATOR_TYPES.stringPlus');
            assert.equal(expressionError('"a" + 1'), 'ERR_BINARY_OPERATOR_TYPES.stringPlus');
        });

        T.test('and / or cortocircuitati, solo Boolean', function (assert) {
            table(assert, [
                ['false and 1 / 0 > 0', 'false'],
                ['true or 1 / 0 > 0', 'true'],
                ['true and false', 'false'],
                ['false or true', 'true']
            ], show);
            assert.equal(expressionError('1 and true'), 'ERR_LOGICAL_OPERAND');
            assert.equal(expressionError('false or 1'), 'ERR_LOGICAL_OPERAND');
            // Con il cortocircuito il secondo operando non si valuta: il suo tipo non si scopre.
            assert.equal(show('true or 1'), 'true');
        });

        T.test('confronti', function (assert) {
            table(assert, [
                ['0.1 + 0.2 == 0.3', 'false'],
                ['1 == 1.0', 'true'],
                ['"S" == "s"', 'false'],
                ['"Z" < "a"', 'true'],
                ['"abc" < "abd"', 'true'],
                ['true == true', 'true'],
                ['true <> false', 'true'],
                ['3 >= 3', 'true'],
                ['2 < 1.5', 'false']
            ], show);
            table(assert, [
                ['true < false', 'ERR_BINARY_OPERATOR_TYPES.booleanOrder'],
                ['1 == "1"', 'ERR_BINARY_OPERATOR_TYPES'],
                ['"a" < 1', 'ERR_BINARY_OPERATOR_TYPES'],
                ['true == 1', 'ERR_BINARY_OPERATOR_TYPES']
            ], expressionError);
        });

        T.test('operatori unari', function (assert) {
            table(assert, [['-(3)', '-3'], ['+2.5', '2,5'], ['not false', 'true'], ['!true', 'false'], ['-0.0', '0']], show);
            assert.equal(errorOf([H.declare('x', 'Integer'), H.assign('x', '3'), H.output('not x > 5')]),
                'ERR_UNARY_OPERATOR_TYPE.not');
            assert.equal(expressionError('-"a"'), 'ERR_UNARY_OPERATOR_TYPE');
            assert.equal(expressionError('-true'), 'ERR_UNARY_OPERATOR_TYPE');
        });

        T.test('Real non finito è errore', function (assert) {
            assert.equal(expressionError('10.0 ^ 308 * 10.0'), 'ERR_REAL_NOT_FINITE');
        });
    });

    T.suite('Interprete › variabili e array (§6.5, §6.6)', function () {
        T.test('variabile non dichiarata o non inizializzata', function (assert) {
            assert.equal(expressionError('x'), 'ERR_UNDECLARED_VARIABLE');
            assert.equal(errorOf([H.declare('x', 'Integer'), H.output('x')]), 'ERR_UNINITIALIZED_VARIABLE');
            assert.equal(errorOf([H.assign('y', '1')]), 'ERR_UNDECLARED_VARIABLE');
        });

        T.test('rieseguire una dichiarazione riporta la variabile a non inizializzata', function (assert) {
            var result = run(H.program([
                H.declare('i', 'Integer'),
                H.forLoop('i', '1', '2', [
                    H.declare('x', 'Integer'),
                    H.when('i == 1', [H.assign('x', '5')]),
                    H.output('x')
                ])
            ]));
            assert.equal(result.output, '5\n');
            assert.equal(result.error.code, 'ERR_UNINITIALIZED_VARIABLE');
        });

        T.test('Integer → Real implicito, Real → Integer errore', function (assert) {
            assert.equal(outputOf([H.declare('r', 'Real'), H.assign('r', '3'), H.output('r / 2')]), '1,5\n');
            assert.equal(errorOf([H.declare('n', 'Integer'), H.assign('n', '2.5')]), 'ERR_ASSIGN_TYPE.realToInteger');
            assert.equal(errorOf([H.declare('s', 'String'), H.assign('s', '1')]), 'ERR_ASSIGN_TYPE');
            assert.equal(errorOf([H.declare('b', 'Boolean'), H.assign('b', '"true"')]), 'ERR_ASSIGN_TYPE');
        });

        T.test('nell\'assegnazione prima il valore, poi il bersaglio', function (assert) {
            assert.equal(errorOf([H.declare('a', 'Integer', '3'), H.assign('a[10]', '1 / 0')]), 'ERR_DIVISION_BY_ZERO');
            assert.equal(errorOf([H.declare('a', 'Integer', '3'), H.assign('a[10]', '1')]), 'ERR_INDEX_OUT_OF_BOUNDS');
        });

        T.test('array: dimensione a runtime, indici da 0', function (assert) {
            assert.equal(outputOf([
                H.declare('n', 'Integer'), H.assign('n', '3'),
                H.declare('a', 'Integer', 'n + 1'),
                H.declare('i', 'Integer'),
                H.forLoop('i', '0', 'Size(a) - 1', [H.assign('a[i]', 'i * i')]),
                H.output('a[0] & a[3] & " " & Size(a)')
            ]), '09 4\n');
        });

        T.test('errori sugli array', function (assert) {
            table(assert, [
                [[H.declare('a', 'Integer', '0')], 'ERR_ARRAY_SIZE_INVALID'],
                [[H.declare('a', 'Integer', '-1')], 'ERR_ARRAY_SIZE_INVALID'],
                [[H.declare('a', 'Integer', '2.0')], 'ERR_ARRAY_SIZE_TYPE'],
                [[H.declare('a', 'Integer', '1000001')], 'ERR_ARRAY_TOO_LARGE'],
                [[H.declare('a', 'Integer', '3'), H.output('a[1.0]')], 'ERR_INDEX_TYPE'],
                [[H.declare('a', 'Integer', '3'), H.output('a[3]')], 'ERR_INDEX_OUT_OF_BOUNDS'],
                [[H.declare('a', 'Integer', '3'), H.output('a[-1]')], 'ERR_INDEX_OUT_OF_BOUNDS'],
                [[H.declare('a', 'Integer', '3'), H.output('a[0]')], 'ERR_UNINITIALIZED_VARIABLE.element'],
                [[H.declare('a', 'Integer', '3'), H.output('a')], 'ERR_ARRAY_WITHOUT_INDEX'],
                [[H.declare('a', 'Integer', '3'), H.assign('a', '1')], 'ERR_ARRAY_WITHOUT_INDEX'],
                [[H.declare('x', 'Integer'), H.output('x[0]')], 'ERR_NOT_AN_ARRAY'],
                [[H.declare('x', 'Integer'), H.assign('x[0]', '1')], 'ERR_NOT_AN_ARRAY'],
                [[H.declare('a, b', 'Integer', '2'), H.assign('a[0]', '1'), H.output('a + b')], 'ERR_ARRAY_WITHOUT_INDEX']
            ], function (blocks) { return errorOf(blocks); });
        });

        T.test('l\'errore fuori dai limiti ha indice, dimensione e ultimo indice', function (assert) {
            var result = run(H.program([H.declare('v', 'Integer', '3'), H.output('v[5]')]));
            assert.deepEqual(result.error.params, { name: 'v', index: 5, size: 3, last: 2 });
        });

        T.test('array di un milione di elementi', function (assert) {
            assert.equal(outputOf([H.declare('a', 'Boolean', '1000000'), H.assign('a[999999]', 'true'), H.output('a[999999]')]), 'true\n');
        });

        T.test('dichiarazione di più array con una sola dimensione', function (assert) {
            assert.equal(outputOf([H.declare('a, b', 'String', '2'), H.assign('a[1]', '"x"'), H.assign('b[1]', '"y"'), H.output('a[1] & b[1]')]), 'xy\n');
        });
    });

    T.suite('Interprete › strutture di controllo (§6.7)', function () {
        T.test('if con else', function (assert) {
            var blocks = function (value) {
                return [H.when(value + ' > 0', [H.output('"positivo"')], [H.output('"non positivo"')])];
            };
            assert.equal(outputOf(blocks('3')), 'positivo\n');
            assert.equal(outputOf(blocks('-3')), 'non positivo\n');
            assert.equal(errorOf([H.when('1', [])]), 'ERR_CONDITION_TYPE');
            assert.equal(errorOf([H.loop('"si"', [])]), 'ERR_CONDITION_TYPE');
        });

        T.test('while e do', function (assert) {
            assert.equal(outputOf([
                H.declare('i', 'Integer'), H.assign('i', '0'),
                H.loop('i < 3', [H.output('i', false), H.assign('i', 'i + 1')])
            ]), '012');
            // do-while: il corpo si esegue almeno una volta, poi si ripete finché la condizione è vera.
            assert.equal(outputOf([
                H.declare('i', 'Integer'), H.assign('i', '10'),
                H.repeat([H.output('i', false), H.assign('i', 'i + 1')], 'i < 3')
            ]), '10');
            assert.equal(outputOf([
                H.declare('i', 'Integer'), H.assign('i', '0'),
                H.repeat([H.output('i', false), H.assign('i', 'i + 1')], 'i < 3')
            ]), '012');
        });

        T.test('for: estremo incluso, dopo il ciclo il primo valore oltre la fine', function (assert) {
            assert.equal(outputOf([
                H.declare('i', 'Integer'),
                H.forLoop('i', '1', '3', [H.output('i', false)]),
                H.output('" " & i', false)
            ]), '123 4');
            assert.equal(outputOf([
                H.declare('i', 'Integer'),
                H.forLoop('i', '10', '1', [H.output('i & ","', false)], 'dec', '3'),
                H.output('i', false)
            ]), '10,7,4,1,-2');
        });

        T.test('for: intervallo vuoto, nessuna iterazione', function (assert) {
            assert.equal(outputOf([
                H.declare('i', 'Integer'),
                H.forLoop('i', '5', '1', [H.output('"mai"')]),
                H.output('i', false)
            ]), '5');
        });

        T.test('for: estremi valutati una volta, la variabile riparte dal valore corrente', function (assert) {
            assert.equal(outputOf([
                H.declare('i, n', 'Integer'), H.assign('n', '3'),
                H.forLoop('i', '1', 'n', [H.output('i', false), H.assign('n', '10')])
            ]), '123');
            assert.equal(outputOf([
                H.declare('i', 'Integer'),
                H.forLoop('i', '1', '10', [H.output('i & " "', false), H.assign('i', 'i * 2')])
            ]), '1 3 7 ');
        });

        T.test('for vicino al massimo: termina senza overflow', function (assert) {
            assert.equal(outputOf([
                H.declare('i', 'Integer'),
                H.forLoop('i', '2147483646', '2147483647', [H.output('"x"', false)]),
                H.output('" " & i', false)
            ]), 'xx 2147483647');
            assert.equal(outputOf([
                H.declare('i', 'Integer'),
                H.forLoop('i', '-2147483647', '-2147483648', [H.output('"y"', false)], 'dec'),
                H.output('" " & i', false)
            ]), 'yy -2147483648');
        });

        T.test('for: variabile e estremi devono essere Integer', function (assert) {
            assert.equal(errorOf([H.declare('r', 'Real'), H.forLoop('r', '1', '2', [])]), 'ERR_FOR_VARIABLE_TYPE');
            assert.equal(errorOf([H.declare('a', 'Integer', '2'), H.forLoop('a', '1', '2', [])]), 'ERR_FOR_VARIABLE_TYPE.array');
            assert.equal(errorOf([H.declare('i', 'Integer'), H.forLoop('i', '1.0', '2', [])]), 'ERR_FOR_BOUND_TYPE');
            assert.equal(errorOf([H.declare('i', 'Integer'), H.forLoop('i', '1', '"2"', [])]), 'ERR_FOR_BOUND_TYPE');
            assert.equal(errorOf([H.forLoop('k', '1', '2', [])]), 'ERR_UNDECLARED_VARIABLE');
        });

        T.test('i commenti non si eseguono', function (assert) {
            assert.equal(outputOf([H.comment('nota'), H.output('1')]), '1\n');
        });
    });

    T.suite('Interprete › input e output (§6.11, FR-CON-02)', function () {
        T.test('input di ogni tipo, con conversione', function (assert) {
            assert.equal(outputOf([
                H.declare('n', 'Integer'), H.declare('r', 'Real'), H.declare('s', 'String'), H.declare('b', 'Boolean'),
                H.input('n'), H.input('r'), H.input('s'), H.input('b'),
                H.output('n + 1 & " " & r * 2 & " [" & s & "] " & not b')
            ], [' 41 ', '1,25', '  ciao ', 'TRUE']), ' 41 \n1,25\n  ciao \nTRUE\n42 2,5 [  ciao ] false\n');
        });

        T.test('l\'evento di input ha il tipo atteso e il blocco', function (assert) {
            var program = H.program([H.declare('x', 'Real'), H.input('x')]);
            var generator = Interpreter.execute(program, {});
            var event;
            do {
                event = generator.next().value;
            } while (event.type !== 'input');
            assert.equal(event.valueType, 'Real');
            assert.equal(event.nodeId, program.functions[0].body[1].id);
            assert.equal(event.error, null);
        });

        T.test('valore non valido: si richiede, con l\'errore del tentativo precedente', function (assert) {
            var program = H.program([H.declare('n', 'Integer'), H.input('n'), H.output('n * 2')]);
            var generator = Interpreter.execute(program, {});
            var event;
            do {
                event = generator.next().value;
            } while (event.type !== 'input');
            event = generator.next('2,5').value;
            assert.equal(event.type, 'input');
            assert.equal(event.error.code, 'ERR_INPUT_NOT_CONVERTIBLE');
            assert.equal(event.error.params.reason, 'decimal');
            assert.equal(outputOf(program.functions[0].body, ['2,5', 'x', '7']), '2,5\nx\n7\n14\n');
        });

        T.test('valore non valido con invalidInput "error": l\'esecuzione si ferma', function (assert) {
            var result = run(H.program([H.declare('n', 'Integer'), H.input('n')]), ['abc'], { invalidInput: 'error' });
            assert.equal(result.error.code, 'ERR_INPUT_NOT_CONVERTIBLE');
            assert.equal(result.error.params.reason, 'format');
        });

        T.test('input in un elemento di array e nei bersagli non validi', function (assert) {
            assert.equal(outputOf([H.declare('a', 'Integer', '2'), H.input('a[1]'), H.output('a[1]')], ['9']), '9\n9\n');
            assert.equal(errorOf([H.declare('a', 'Integer', '2'), H.input('a')], ['1']), 'ERR_ARRAY_WITHOUT_INDEX');
            assert.equal(errorOf([H.input('z')], ['1']), 'ERR_UNDECLARED_VARIABLE');
            assert.equal(errorOf([H.declare('a', 'Integer', '2'), H.input('a[5]')], ['1']), 'ERR_INDEX_OUT_OF_BOUNDS');
        });

        T.test('output senza a capo', function (assert) {
            assert.equal(outputOf([H.output('"a"', false), H.output('"b"'), H.output('"c"', false)]), 'ab\nc');
        });

        T.test('il separatore decimale viene dal formato della lingua', function (assert) {
            var dot = { decimalSeparator: '.', inputDecimalSeparators: ['.'] };
            assert.equal(outputOf([H.declare('r', 'Real'), H.input('r'), H.output('r / 2')], ['5'], { numberFormat: dot }), '5\n2.5\n');
            assert.equal(outputOf([H.output('ToFixed(2.5, 2)')], [], { numberFormat: dot }), '2.50\n');
        });
    });

    T.suite('Interprete › funzioni utente (§6.8)', function () {
        T.test('funzione con valore di ritorno', function (assert) {
            var somma = H.fn('Somma', 'Integer', 'r', [['a', 'Integer'], ['b', 'Integer']], [
                H.declare('r', 'Integer'), H.assign('r', 'a + b')
            ]);
            assert.equal(run(H.program([H.output('Somma(2, 3) * 2')], [somma])).output, '10\n');
        });

        T.test('scalari per valore, array per riferimento', function (assert) {
            var change = H.fn('Cambia', 'None', '', [['x', 'Integer'], ['v', 'Integer', true]], [
                H.assign('x', '99'), H.assign('v[0]', '99')
            ]);
            var result = run(H.program([
                H.declare('x', 'Integer'), H.declare('v', 'Integer', '1'),
                H.assign('x', '1'), H.assign('v[0]', '1'),
                H.call('Cambia(x, v)'),
                H.output('x & " " & v[0]')
            ], [change]));
            assert.equal(result.output, '1 99\n');
        });

        T.test('Integer → Real negli argomenti e nel ritorno', function (assert) {
            var half = H.fn('Meta', 'Real', 'r', [['x', 'Real']], [H.declare('r', 'Integer'), H.assign('r', 'Int(x / 2)')]);
            assert.equal(run(H.program([H.output('Meta(7) / 2')], [half])).output, '1,5\n');
        });

        T.test('ricorsione', function (assert) {
            var factorial = H.fn('Fatt', 'Integer', 'f', [['n', 'Integer']], [
                H.declare('f', 'Integer'),
                H.when('n <= 1', [H.assign('f', '1')], [H.assign('f', 'n * Fatt(n - 1)')])
            ]);
            assert.equal(run(H.program([H.output('Fatt(10)')], [factorial])).output, '3628800\n');
        });

        T.test('ricorsione fino a 1000 livelli, oltre è errore', function (assert) {
            var down = H.fn('Giu', 'Integer', 'r', [['n', 'Integer']], [
                H.declare('r', 'Integer'),
                H.when('n == 0', [H.assign('r', '0')], [H.assign('r', 'Giu(n - 1) + 1')])
            ]);
            assert.equal(run(H.program([H.output('Giu(999)')], [down]), [], { maxMs: 10000 }).output, '999\n');
            var result = run(H.program([H.output('Giu(1000)')], [down]), [], { maxMs: 10000 });
            assert.equal(result.error.code, 'ERR_RECURSION_LIMIT');
            var forever = H.fn('Sempre', 'None', '', [], [H.call('Sempre()')]);
            assert.equal(run(H.program([H.call('Sempre()')], [forever]), [], { maxMs: 10000 }).error.code, 'ERR_RECURSION_LIMIT');
        });

        T.test('una funzione vede solo le sue variabili', function (assert) {
            var peek = H.fn('Guarda', 'None', '', [], [H.output('x')]);
            var result = run(H.program([H.declare('x', 'Integer'), H.assign('x', '1'), H.call('Guarda()')], [peek]));
            assert.equal(result.error.code, 'ERR_UNDECLARED_VARIABLE');
        });

        T.test('un input dentro una funzione chiamata in un\'espressione', function (assert) {
            var ask = H.fn('Chiedi', 'Integer', 'v', [], [H.declare('v', 'Integer'), H.input('v')]);
            assert.equal(run(H.program([H.output('Chiedi() + Chiedi()')], [ask]), ['2', '3']).output, '2\n3\n5\n');
        });

        T.test('funzioni senza valore: blocco call sì, espressione no', function (assert) {
            var hello = H.fn('Ciao', 'None', '', [], [H.output('"ciao"')]);
            assert.equal(run(H.program([H.call('Ciao()')], [hello])).output, 'ciao\n');
            assert.equal(run(H.program([H.output('Ciao()')], [hello])).error.code, 'ERR_FUNCTION_NO_VALUE');
            var one = H.fn('Uno', 'Integer', 'r', [], [H.declare('r', 'Integer'), H.assign('r', '1')]);
            assert.equal(run(H.program([H.call('Uno()'), H.output('"ok"')], [one])).output, 'ok\n');
        });

        T.test('errori sul valore di ritorno, attribuiti alla funzione chiamata', function (assert) {
            var undeclared = H.fn('A', 'Integer', 'r', [], []);
            var result = run(H.program([H.output('A()')], [undeclared]));
            assert.equal(result.error.code, 'ERR_RETURN_UNDECLARED');
            assert.equal(result.error.nodeId, undeclared.id);
            assert.equal(result.error.functionName, 'A');

            var unset = H.fn('B', 'Integer', 'r', [], [H.declare('r', 'Integer')]);
            assert.equal(run(H.program([H.output('B()')], [unset])).error.code, 'ERR_RETURN_NOT_SET');

            var wrongType = H.fn('C', 'Integer', 'r', [], [H.declare('r', 'String'), H.assign('r', '"x"')]);
            assert.equal(run(H.program([H.output('C()')], [wrongType])).error.code, 'ERR_RETURN_TYPE');

            var arrayReturn = H.fn('D', 'Integer', 'r', [], [H.declare('r', 'Integer', '2')]);
            assert.equal(run(H.program([H.output('D()')], [arrayReturn])).error.code, 'ERR_RETURN_TYPE');
        });

        T.test('errori sugli argomenti', function (assert) {
            var f = H.fn('F', 'Integer', 'r', [['x', 'Integer'], ['v', 'Integer', true]], [H.declare('r', 'Integer'), H.assign('r', 'x')]);
            var body = function (expression) {
                return [H.declare('v', 'Integer', '2'), H.declare('w', 'Real', '2'), H.declare('k', 'Integer'), H.assign('k', '1'), H.output(expression)];
            };
            table(assert, [
                ['F(1)', 'ERR_ARGUMENT_COUNT'],
                ['F(1.5, v)', 'ERR_ARGUMENT_TYPE'],
                ['F(1, k)', 'ERR_ARRAY_ARGUMENT'],
                ['F(1, v[0])', 'ERR_ARRAY_ARGUMENT'],
                ['F(1, w)', 'ERR_ARRAY_ARGUMENT'],
                ['G(1)', 'ERR_UNKNOWN_FUNCTION'],
                ['Main()', 'ERR_UNKNOWN_FUNCTION'],
                ['Pow(2, 3)', 'ERR_UNKNOWN_FUNCTION'],
                ['F(1, v)', 'NESSUN ERRORE (done)']
            ], function (expression) {
                var result = run(H.program(body(expression), [f]));
                return result.error ? result.error.code : 'NESSUN ERRORE (' + result.status + ')';
            });
        });

        T.test('un errore dentro una funzione indica il suo blocco e le sue variabili', function (assert) {
            var broken = H.fn('Rotta', 'None', '', [['n', 'Integer']], [H.declare('q', 'Integer'), H.assign('q', 'n / 0')]);
            var program = H.program([H.declare('x', 'Integer'), H.assign('x', '5'), H.call('Rotta(x)')], [broken]);
            var result = run(program);
            assert.equal(result.error.code, 'ERR_DIVISION_BY_ZERO');
            assert.equal(result.error.nodeId, broken.body[1].id);
            assert.equal(result.error.functionName, 'Rotta');
            assert.deepEqual(result.error.variables, [
                { name: 'n', type: 'Integer', array: false, value: 5, elements: null },
                { name: 'q', type: 'Integer', array: false, value: undefined, elements: null }
            ]);
        });
    });

    T.suite('Interprete › funzioni predefinite (§6.9)', function () {
        function builtins(random) {
            return function (expression) {
                var result = run(H.program([H.output(expression, false)]), [], { random: random });
                if (result.error) {
                    return result.error.code + (result.error.params.reason ? '.' + result.error.params.reason : '');
                }
                return result.output;
            };
        }

        T.test('matematiche', function (assert) {
            table(assert, [
                ['Abs(-3)', '3'], ['Abs(-2.5)', '2,5'], ['Abs(-2147483648)', 'ERR_INTEGER_OVERFLOW'],
                ['Sqrt(16)', '4'], ['Sqrt(2)', '1,41'], ['Sqrt(-1)', 'ERR_REAL_NOT_FINITE'],
                ['Log(0)', 'ERR_REAL_NOT_FINITE'], ['Log10(1000)', '3'], ['Log(1)', '0'],
                ['Sin(0)', '0'], ['Cos(0)', '1'], ['Arctan(1) * 4', '3,14'], ['Arcsin(2)', 'ERR_REAL_NOT_FINITE'],
                ['Tan(0)', '0'], ['Arccos(1)', '0'],
                ['Int(-2.7)', '-2'], ['Int(2.7)', '2'], ['Int(5)', '5'], ['Int(10.0 ^ 20)', 'ERR_INTEGER_OVERFLOW'],
                ['Sgn(-5)', '-1'], ['Sgn(0.0)', '0'], ['Sgn(3.5)', '1']
            ], builtins());
        });

        T.test('testi e caratteri', function (assert) {
            table(assert, [
                ['Len("ciao")', '4'], ['Len("")', '0'],
                ['Char("ciao", 1)', 'i'], ['Char("ciao", 4)', 'ERR_BUILTIN_ARGUMENT.position'], ['Char("ciao", -1)', 'ERR_BUILTIN_ARGUMENT.position'],
                ['ToChar(65)', 'A'], ['ToChar(-1)', 'ERR_BUILTIN_ARGUMENT.charCode'], ['ToChar(55296)', 'ERR_BUILTIN_ARGUMENT.charCode'],
                ['ToCode("A")', '65'], ['ToCode("")', 'ERR_BUILTIN_ARGUMENT.empty']
            ], builtins());
        });

        T.test('conversioni', function (assert) {
            table(assert, [
                ['ToFixed(2.5, 2)', '2,50'], ['ToFixed(1, 0)', '1'], ['ToFixed(1.0, 16)', 'ERR_BUILTIN_ARGUMENT.digits'],
                ['ToInteger(" 42 ")', '42'], ['ToInteger("2,5")', 'ERR_CONVERSION_FAILED.decimal'],
                ['ToInteger("x")', 'ERR_CONVERSION_FAILED.format'], ['ToReal("2,5") * 2', '5'],
                ['ToString(1 / 3)', '0,33'], ['ToString(true)', 'true'], ['Len(ToString(7.0))', '1']
            ], builtins());
        });

        T.test('Random con sorgente sostituibile (DEC-011)', function (assert) {
            table(assert, [['Random(10)', '5'], ['Random(1)', '0'], ['Random(0)', 'ERR_BUILTIN_ARGUMENT.random']], builtins(function () { return 0.5; }));
            assert.equal(builtins(function () { return 0.999999; })('Random(10)'), '9');
            assert.equal(builtins(function () { return 0; })('Random(10)'), '0');
        });

        T.test('Size vuole il nome di un array', function (assert) {
            assert.equal(outputOf([H.declare('a', 'Real', '7'), H.output('Size(a)')]), '7\n');
            assert.equal(errorOf([H.declare('x', 'Integer'), H.assign('x', '1'), H.output('Size(x)')]), 'ERR_ARRAY_ARGUMENT');
            assert.equal(errorOf([H.output('Size(3)')]), 'ERR_ARRAY_ARGUMENT');
        });

        T.test('numero e tipo degli argomenti', function (assert) {
            table(assert, [
                ['Len(3)', 'ERR_ARGUMENT_TYPE'], ['Sqrt("x")', 'ERR_ARGUMENT_TYPE.number'], ['Abs(true)', 'ERR_ARGUMENT_TYPE.number'],
                ['Sqrt(1, 2)', 'ERR_ARGUMENT_COUNT'], ['Char("a")', 'ERR_ARGUMENT_COUNT'], ['Random(2.0)', 'ERR_ARGUMENT_TYPE']
            ], builtins());
        });

        T.test('un blocco call con una predefinita scarta il valore', function (assert) {
            assert.equal(outputOf([H.call('Sqrt(4)'), H.output('"ok"')]), 'ok\n');
        });
    });

    T.suite('Interprete › caso di riferimento (QA-04)', function () {
        T.test('l\'Appendice A con 5, s, 3, n, 4, 9', function (assert) {
            var loaded = OnoFlow.Format.importFprg(OnoFlow.Examples.byId('somma-massimo-minimo').text);
            var result = run(loaded.program, ['5', 's', '3', 'n', '4', '9']);
            assert.equal(result.status, 'done');
            var lines = result.output.replace(/\n$/, '').split('\n');
            assert.deepEqual(lines.slice(-3), [
                'Somma del primo set di numeri: 8',
                'Numero massimo trovato nel secondo set di numeri: 9',
                'Numero minimo trovato nel secondo set di numeri: 4'
            ]);
            assert.deepEqual(lines, [
                'Quale numero vuoi sommare?', '5', 'Vuoi continuare? s/n', 's',
                'Quale numero vuoi sommare?', '3', 'Vuoi continuare? s/n', 'n',
                'Inserisci un numero', '4', 'Inserisci un numero', '9',
                'Somma del primo set di numeri: 8',
                'Numero massimo trovato nel secondo set di numeri: 9',
                'Numero minimo trovato nel secondo set di numeri: 4'
            ]);
        });

        T.test('il programma costruito con il modello dà lo stesso risultato', function (assert) {
            var loaded = OnoFlow.Format.importFprg(OnoFlow.Examples.byId('somma-massimo-minimo').text);
            var rebuilt = OnoFlow.Format.importFprg(OnoFlow.Format.exportFprg(loaded.program, { format: loaded.format }));
            assert.equal(run(rebuilt.program, ['5', 's', '3', 'n', '4', '9']).output,
                run(loaded.program, ['5', 's', '3', 'n', '4', '9']).output);
        });
    });

    T.suite('Interprete › robustezza (QA-10, NFR-PERF-03)', function () {
        T.test('un ciclo infinito si ferma al limite di passi', function (assert) {
            var result = run(H.program([H.loop('true', [])]), [], { maxSteps: 50000 });
            assert.equal(result.status, 'limit');
            assert.equal(result.steps, 50001);
        });

        T.test('un ciclo do vuoto consuma passi', function (assert) {
            assert.equal(run(H.program([H.repeat([], 'true')]), [], { maxSteps: 1000 }).status, 'limit');
        });

        T.test('e al limite di tempo', function (assert) {
            var result = run(H.program([H.loop('true', [])]), [], { maxSteps: 1e12, maxMs: 50 });
            assert.equal(result.status, 'timeout');
        });

        T.test('servono altri input: si segnala invece di bloccarsi', function (assert) {
            var result = run(H.program([H.declare('x', 'Integer'), H.input('x'), H.input('x')]), ['1']);
            assert.equal(result.status, 'waitingInput');
        });

        T.test('un difetto dell\'interprete termina con ERR_INTERNAL', function (assert) {
            // Un nodo che l'interprete non conosce simula un suo difetto.
            var broken = H.output('1');
            var program = H.program([H.output('"prima"'), broken]);
            broken.fields.expression.ast = { kind: 'sconosciuto' };
            var result = run(program);
            assert.equal(result.status, 'error');
            assert.equal(result.error.code, 'ERR_INTERNAL');
            assert.equal(result.error.nodeId, broken.id);
            assert.equal(result.output, 'prima\n');
        });

        T.test('un errore del codice di OnoFlow non si scambia per ricorsione troppo profonda', function (assert) {
            var broken = H.output('1');
            var program = H.program([broken]);
            broken.fields.expression.ast = { kind: 'literal', type: 'Real', value: Infinity, text: 'x' };
            var result = run(program);
            assert.equal(result.error.code, 'ERR_INTERNAL');
        });

        T.test('Ferma dall\'esterno: ERR_STOPPED con blocco e variabili', function (assert) {
            var program = H.program([H.declare('i', 'Integer'), H.assign('i', '0'), H.loop('true', [H.assign('i', 'i + 1')])]);
            var generator = Interpreter.execute(program, {});
            for (var i = 0; i < 100; i++) {
                generator.next();
            }
            var result = generator.throw(new Values.RuntimeFailure('ERR_STOPPED', {}));
            assert.isTrue(result.done);
            assert.equal(result.value.error.code, 'ERR_STOPPED');
            assert.equal(result.value.error.variables[0].name, 'i');
            assert.isTrue(result.value.error.variables[0].value > 0);
            assert.notEqual(result.value.error.nodeId, null);
        });

        T.test('con errori statici non si esegue (FR-RUN-02)', function (assert) {
            var result = run(H.program([H.output('"mai"'), H.assign('x', '2,5')]));
            assert.equal(result.status, 'invalid');
            assert.equal(result.output, '');
            assert.equal(result.errors[0].code, 'ERR_SYNTAX_UNEXPECTED_TOKEN');
        });
    });

    T.suite('Interprete › messaggi (QA-07)', function () {
        T.test('ogni errore di runtime prodotto nei test ha un messaggio completo e specifico', function (assert) {
            var italian = OnoFlow.Localization.createTranslator('it');
            // Campioni minimi, validi anche quando un filtro esclude gli altri test.
            var samples = RUNTIME_ERRORS.concat([
                run(H.program([H.output('1 / 0')])).error,
                run(H.program([H.declare('c', 'Integer'), H.assign('c', '6 / 3')])).error
            ]);
            samples.forEach(function (error) {
                var message = italian.formatError(error);
                assert.notEqual(message, error.code, 'messaggio per ' + error.code);
                assert.equal(message.indexOf('{'), -1, 'segnaposto rimasto in: ' + message);
                if (error.params.reason) {
                    var specific = italian.errorKeys(error).filter(function (key) { return key !== error.code; });
                    assert.isTrue(specific.some(function (key) { return italian.t(key) !== key; }),
                        'messaggio specifico per ' + error.code + '.' + error.params.reason);
                }
            });
            ['ERR_STOPPED', 'ERR_INTERNAL', 'ERR_RECURSION_LIMIT'].forEach(function (code) {
                var message = italian.formatError({ code: code, params: { detail: 'x', max: 1000 } });
                assert.equal(message.indexOf('{'), -1, code);
            });
        });
    });
})();
