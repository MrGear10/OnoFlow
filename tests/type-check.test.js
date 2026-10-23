/*
 * OnoFlow — test dell'analisi statica completa (passo 16, FR-ERR-06, D-06): nomi, tipi,
 * argomenti, posizione dell'errore, suggerimento sulle maiuscole, nessun falso allarme.
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*, js/i18n/*, js/examples/examples.js.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var OnoFlow = window.OnoFlow;
    var StaticCheck = OnoFlow.StaticCheck;

    /* Codici (con il motivo, se c'è) degli errori di un Main fatto di questi blocchi. */
    function codes(blocks, otherFunctions) {
        return StaticCheck.check(H.program(blocks, otherFunctions)).map(function (error) {
            return error.code + (error.params.reason ? '.' + error.params.reason : '');
        });
    }

    /* Errori di una sola espressione in output, con le dichiarazioni date. */
    function outputCodes(declarations, expression) {
        return codes(declarations.concat([H.output(expression)]));
    }

    var NUMBERS = [H.declare('i', 'Integer'), H.declare('r', 'Real'), H.declare('s', 'String'), H.declare('b', 'Boolean'), H.declare('v', 'Integer', '3')];

    T.suite('Analisi statica › nomi (FR-ERR-06)', function () {
        T.test('variabile non dichiarata, ovunque sia usata', function (assert) {
            assert.deepEqual(outputCodes([], 'x + 1'), ['ERR_UNDECLARED_VARIABLE']);
            assert.deepEqual(codes([H.assign('x', '1')]), ['ERR_UNDECLARED_VARIABLE']);
            assert.deepEqual(codes([H.input('x')]), ['ERR_UNDECLARED_VARIABLE']);
            assert.deepEqual(codes([H.when('x > 0', [], [])]), ['ERR_UNDECLARED_VARIABLE']);
        });

        T.test('una dichiarazione dopo l\'uso o in un ramo vale: lo decide l\'esecuzione', function (assert) {
            assert.deepEqual(codes([H.output('"a"'), H.when('true', [H.declare('x', 'Integer')], []), H.assign('x', '1')]), []);
        });

        T.test('funzione inesistente; Main non si chiama (DEC-038)', function (assert) {
            assert.deepEqual(outputCodes([], 'Pow(2, 3)'), ['ERR_UNKNOWN_FUNCTION']);
            assert.deepEqual(codes([H.call('Main()')]), ['ERR_UNKNOWN_FUNCTION']);
        });

        T.test('l\'errore ha il blocco, il campo e la posizione esatta', function (assert) {
            var block = H.output('1 + conta * 2');
            var errors = StaticCheck.check(H.program([block]));
            assert.equal(errors.length, 1);
            assert.equal(errors[0].nodeId, block.id);
            assert.equal(errors[0].field, 'expression');
            assert.deepEqual(errors[0].position, { start: 4, end: 9, column: 5 }, 'sotto «conta»');
        });

        T.test('un solo errore per campo, il primo da sinistra', function (assert) {
            var errors = StaticCheck.check(H.program([H.output('a + b')]));
            assert.equal(errors.length, 1);
            assert.equal(errors[0].params.name, 'a');
        });
    });

    T.suite('Analisi statica › maiuscole (D-06)', function () {
        T.test('True, Conta, len: il suggerimento con le maiuscole giuste', function (assert) {
            var errors = StaticCheck.check(H.program([H.declare('conta', 'Integer'), H.declare('b', 'Boolean'),
                H.assign('b', 'True'), H.output('Conta'), H.output('len("abc")')]));
            assert.deepEqual(errors.map(function (e) { return e.params.reason + ':' + e.params.suggestion; }),
                ['case:true', 'case:conta', 'case:Len']);
        });

        T.test('senza un nome simile, nessun suggerimento', function (assert) {
            var errors = StaticCheck.check(H.program([H.output('totale')]));
            assert.equal(errors[0].params.reason, undefined);
        });

        T.test('il messaggio dice il nome giusto', function (assert) {
            var italian = OnoFlow.Localization.createTranslator('it');
            var error = StaticCheck.check(H.program([H.declare('b', 'Boolean'), H.assign('b', 'False')]))[0];
            assert.isTrue(italian.formatError(error).indexOf('«false»') !== -1, italian.formatError(error));
        });
    });

    T.suite('Analisi statica › tipi (FR-ERR-06, §6.4–6.9)', function () {
        T.test('assegnazioni: Integer → Real sì, Real → Integer no, con il suggerimento di Int', function (assert) {
            assert.deepEqual(codes(NUMBERS.concat([H.assign('r', 'i')])), []);
            assert.deepEqual(codes(NUMBERS.concat([H.assign('i', '7 / 2')])), ['ERR_ASSIGN_TYPE.realToInteger']);
            assert.deepEqual(codes(NUMBERS.concat([H.assign('i', 'Int(7 / 2)')])), []);
            assert.deepEqual(codes(NUMBERS.concat([H.assign('s', '5')])), ['ERR_ASSIGN_TYPE']);
            assert.deepEqual(codes(NUMBERS.concat([H.assign('v[0]', '"a"')])), ['ERR_ASSIGN_TYPE']);
        });

        T.test('operatori', function (assert) {
            assert.deepEqual(outputCodes(NUMBERS, 's + 1'), ['ERR_BINARY_OPERATOR_TYPES.stringPlus']);
            assert.deepEqual(outputCodes(NUMBERS, 'r mod 2'), ['ERR_BINARY_OPERATOR_TYPES']);
            assert.deepEqual(outputCodes(NUMBERS, 'b < true'), ['ERR_BINARY_OPERATOR_TYPES.booleanOrder']);
            assert.deepEqual(outputCodes(NUMBERS, 's == i'), ['ERR_BINARY_OPERATOR_TYPES']);
            assert.deepEqual(outputCodes(NUMBERS, 'i == r'), [], 'Integer con Real si confrontano');
            assert.deepEqual(outputCodes(NUMBERS, 's & i & b'), [], '& unisce tutto');
            assert.deepEqual(outputCodes(NUMBERS, 'not i > 5'), ['ERR_UNARY_OPERATOR_TYPE.not']);
            assert.deepEqual(outputCodes(NUMBERS, '-s'), ['ERR_UNARY_OPERATOR_TYPE']);
        });

        T.test('and/or: anche il secondo operando, che l\'esecuzione salta (DEC-044)', function (assert) {
            assert.deepEqual(outputCodes(NUMBERS, 'true or 1'), ['ERR_LOGICAL_OPERAND']);
            assert.deepEqual(outputCodes(NUMBERS, 'i and b'), ['ERR_LOGICAL_OPERAND']);
        });

        T.test('condizioni, for, dimensione degli array', function (assert) {
            assert.deepEqual(codes(NUMBERS.concat([H.when('i', [], [])])), ['ERR_CONDITION_TYPE']);
            assert.deepEqual(codes(NUMBERS.concat([H.loop('s', [])])), ['ERR_CONDITION_TYPE']);
            assert.deepEqual(codes(NUMBERS.concat([H.forLoop('r', '1', '3', [])])), ['ERR_FOR_VARIABLE_TYPE']);
            assert.deepEqual(codes(NUMBERS.concat([H.forLoop('v', '1', '3', [])])), ['ERR_FOR_VARIABLE_TYPE.array']);
            assert.deepEqual(codes(NUMBERS.concat([H.forLoop('i', '1', 'r', [])])), ['ERR_FOR_BOUND_TYPE']);
            assert.deepEqual(codes([H.declare('a', 'Integer', '2.5')]), ['ERR_ARRAY_SIZE_TYPE']);
        });

        T.test('array: indice Integer, niente array senza indice, niente indice su una variabile semplice', function (assert) {
            assert.deepEqual(outputCodes(NUMBERS, 'v[r]'), ['ERR_INDEX_TYPE']);
            assert.deepEqual(outputCodes(NUMBERS, 'v'), ['ERR_ARRAY_WITHOUT_INDEX']);
            assert.deepEqual(outputCodes(NUMBERS, 'i[0]'), ['ERR_NOT_AN_ARRAY']);
            assert.deepEqual(codes(NUMBERS.concat([H.input('v')])), ['ERR_ARRAY_WITHOUT_INDEX']);
            assert.deepEqual(outputCodes(NUMBERS, 'Size(v) + v[2 ^ 1]'), [], 'Size vuole l\'array; 2 ^ 1 come indice va bene');
        });

        T.test('funzioni predefinite: numero e tipo degli argomenti, tipo del risultato', function (assert) {
            assert.deepEqual(outputCodes(NUMBERS, 'Len(3)'), ['ERR_ARGUMENT_TYPE']);
            assert.deepEqual(outputCodes(NUMBERS, 'Sqrt("4")'), ['ERR_ARGUMENT_TYPE.number']);
            assert.deepEqual(outputCodes(NUMBERS, 'Char("abc")'), ['ERR_ARGUMENT_COUNT']);
            assert.deepEqual(outputCodes(NUMBERS, 'Size(i)'), ['ERR_ARRAY_ARGUMENT']);
            assert.deepEqual(codes(NUMBERS.concat([H.assign('i', 'Len(s) + Abs(-3) + Sgn(r)')])), []);
            assert.deepEqual(codes(NUMBERS.concat([H.assign('i', 'Abs(r)')])), ['ERR_ASSIGN_TYPE.realToInteger'], 'Abs ha il tipo dell\'argomento');
            assert.deepEqual(codes(NUMBERS.concat([H.assign('s', 'ToString(r) & ToFixed(r, 2)')])), []);
        });
    });

    T.suite('Analisi statica › funzioni utente (§6.8)', function () {
        function doppio() {
            return H.fn('Doppio', 'Integer', 'd', [['n', 'Integer']], [H.declare('d', 'Integer'), H.assign('d', 'n * 2')]);
        }
        function saluta() {
            return H.fn('Saluta', 'None', '', [], [H.output('"ciao"')]);
        }
        function somma() {
            return H.fn('Somma', 'Integer', 't', [['a', 'Integer', true]], [H.declare('t', 'Integer'), H.assign('t', 'a[0]')]);
        }

        T.test('argomenti: numero, tipo, array dello stesso tipo', function (assert) {
            var others = [doppio(), somma()];
            assert.deepEqual(codes(NUMBERS.concat([H.output('Doppio(1, 2)')]), others), ['ERR_ARGUMENT_COUNT']);
            assert.deepEqual(codes(NUMBERS.concat([H.output('Doppio(s)')]), others), ['ERR_ARGUMENT_TYPE']);
            assert.deepEqual(codes(NUMBERS.concat([H.output('Doppio(r)')]), others), ['ERR_ARGUMENT_TYPE'], 'Real → Integer no');
            assert.deepEqual(codes(NUMBERS.concat([H.output('Somma(i)')]), others), ['ERR_ARRAY_ARGUMENT']);
            assert.deepEqual(codes(NUMBERS.concat([H.declare('w', 'Real', '2'), H.output('Somma(w)')]), others), ['ERR_ARRAY_ARGUMENT']);
            assert.deepEqual(codes(NUMBERS.concat([H.assign('i', 'Doppio(i) + Somma(v)')]), others), []);
        });

        T.test('una funzione senza valore: nel blocco call sì, in un\'espressione no', function (assert) {
            assert.deepEqual(codes([H.call('Saluta()')], [saluta()]), []);
            assert.deepEqual(codes([H.output('Saluta()')], [saluta()]), ['ERR_FUNCTION_NO_VALUE']);
        });

        T.test('ogni funzione vede solo le sue variabili', function (assert) {
            var spia = H.fn('Spia', 'None', '', [], [H.output('segreto')]);
            var errors = StaticCheck.check(H.program([H.declare('segreto', 'Integer')], [spia]));
            assert.deepEqual(errors.map(function (e) { return e.code; }), ['ERR_UNDECLARED_VARIABLE']);
            assert.equal(errors[0].nodeId, spia.body[0].id);
        });

        T.test('valore di ritorno: dichiarato, semplice, del tipo giusto', function (assert) {
            var missing = H.fn('F', 'Integer', 'r', [], []);
            var wrong = H.fn('G', 'Integer', 'r', [], [H.declare('r', 'String')]);
            var widened = H.fn('K', 'Real', 'r', [], [H.declare('r', 'Integer'), H.assign('r', '1')]);
            var errors = StaticCheck.check(H.program([], [missing, wrong, widened]));
            assert.deepEqual(errors.map(function (e) { return e.code + '@' + e.nodeId; }),
                ['ERR_RETURN_UNDECLARED@' + missing.id, 'ERR_RETURN_TYPE@' + wrong.id]);
        });
    });

    T.suite('Analisi statica › nessun falso allarme', function () {
        T.test('gli esempi e la loro esecuzione', function (assert) {
            OnoFlow.Examples.list.forEach(function (example) {
                var program = OnoFlow.Format.importFprg(example.text).program;
                assert.deepEqual(StaticCheck.check(program), [], example.id);
            });
        });

        T.test('Integer ^ Integer va bene sia per un Integer sia per un Real', function (assert) {
            assert.deepEqual(codes(NUMBERS.concat([H.assign('i', '2 ^ 3'), H.assign('r', '2 ^ i'), H.assign('i', 'i ^ 2 mod 5')])), []);
            assert.deepEqual(codes(NUMBERS.concat([H.assign('i', '2.0 ^ 3')])), ['ERR_ASSIGN_TYPE.realToInteger']);
        });

        T.test('ogni errore dei tipi ha un messaggio completo (QA-07)', function (assert) {
            var italian = OnoFlow.Localization.createTranslator('it');
            var program = H.program(NUMBERS.concat([
                H.output('x'), H.output('Pow(1)'), H.assign('i', 'r'), H.output('s + 1'), H.output('true or 1'),
                H.when('i', [], []), H.forLoop('r', '1', '2', []), H.output('v[r]'), H.output('v'), H.output('i[0]'),
                H.output('Len(3)'), H.output('Char("a")'), H.output('Size(i)'), H.output('not i'), H.output('True'), H.output('len("a")')
            ]), [H.fn('F', 'Integer', 'q', [], [])]);
            var errors = StaticCheck.check(program);
            assert.isTrue(errors.length >= 16, String(errors.length));
            errors.forEach(function (error) {
                var message = italian.formatError(error);
                assert.notEqual(message, error.code, error.code);
                assert.equal(message.indexOf('{'), -1, message);
            });
        });
    });
})();
