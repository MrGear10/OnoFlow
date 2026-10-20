/*
 * OnoFlow — test dei controlli prima dell'esecuzione (§8.1 livello 2, FR-RUN-02).
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*, js/i18n/*.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var OnoFlow = window.OnoFlow;
    var StaticCheck = OnoFlow.StaticCheck;

    function codes(program) {
        return StaticCheck.check(program).map(function (error) { return error.code; });
    }

    T.suite('Controlli statici', function () {
        T.test('un programma corretto non ha errori', function (assert) {
            var loaded = OnoFlow.Format.importFprg(OnoFlow.Examples.byId('somma-massimo-minimo').text);
            assert.deepEqual(StaticCheck.check(loaded.program), []);
            assert.deepEqual(StaticCheck.check(OnoFlow.Model.createEmptyProgram()), []);
        });

        T.test('dichiarazioni duplicate nella stessa funzione', function (assert) {
            var first = H.declare('a, b', 'Integer');
            var second = H.declare('c, a', 'Real');
            var errors = StaticCheck.check(H.program([first, H.when('true', [second])]));
            assert.equal(errors.length, 1);
            assert.equal(errors[0].code, 'ERR_DUPLICATE_DECLARATION');
            assert.equal(errors[0].nodeId, second.id);
            assert.deepEqual(errors[0].params, { name: 'a' });
            assert.deepEqual(errors[0].position, { start: 3, end: 4, column: 4 });
            assert.deepEqual(codes(H.program([H.declare('x, x', 'Integer')])), ['ERR_DUPLICATE_DECLARATION']);
        });

        T.test('lo stesso nome in funzioni diverse va bene; un parametro ridichiarato no', function (assert) {
            var other = H.fn('F', 'None', '', [['n', 'Integer']], [H.declare('x', 'Integer'), H.declare('n', 'Integer')]);
            var errors = StaticCheck.check(H.program([H.declare('x', 'Integer')], [other]));
            assert.deepEqual(errors.map(function (e) { return e.code + ':' + e.params.name; }), ['ERR_DUPLICATE_DECLARATION:n']);
        });

        T.test('nomi di funzione duplicati, riservati o non validi', function (assert) {
            var program = H.program([], [
                H.fn('Doppia', 'None'), H.fn('Doppia', 'None'), H.fn('Len', 'None'), H.fn('2x', 'None'), H.fn('Main', 'None')
            ]);
            assert.deepEqual(codes(program), [
                'ERR_DUPLICATE_FUNCTION', 'ERR_FUNCTION_NAME_RESERVED', 'ERR_SYNTAX_INVALID_NUMBER', 'ERR_DUPLICATE_FUNCTION'
            ]);
        });

        T.test('Main senza parametri e senza valore di ritorno', function (assert) {
            var program = OnoFlow.Model.createProgram({
                functions: [OnoFlow.Model.createFunction({ name: 'Main', type: 'Integer', variable: 'r' })]
            });
            assert.deepEqual(codes(program), ['ERR_MAIN_SIGNATURE']);
            var withParameter = OnoFlow.Model.createProgram({
                functions: [OnoFlow.Model.createFunction({ name: 'Main', parameters: [{ name: 'a', type: 'Integer' }] })]
            });
            assert.deepEqual(codes(withParameter), ['ERR_MAIN_SIGNATURE']);
        });

        T.test('nomi di parametri e variabile di ritorno validi', function (assert) {
            var program = H.program([], [H.fn('F', 'Integer', 'and', [['età', 'Integer']])]);
            assert.deepEqual(codes(program), ['ERR_INVALID_NAME', 'ERR_SYNTAX_UNEXPECTED_CHARACTER']);
        });

        T.test('un blocco call deve contenere una chiamata', function (assert) {
            assert.deepEqual(codes(H.program([H.call('x + 1')])), ['ERR_CALL_BLOCK_NOT_CALL']);
            assert.deepEqual(codes(H.program([H.call('Sqrt(4)')])), []);
        });

        T.test('tutti gli errori insieme, nell\'ordine dei blocchi', function (assert) {
            var a = H.assign('x', '2,5');
            var b = H.declare('y, y', 'Integer');
            var c = H.output('a AND b');
            var errors = StaticCheck.check(H.program([a, H.loop('true', [b]), c]));
            assert.deepEqual(errors.map(function (e) { return e.nodeId; }), [a.id, b.id, c.id]);
            assert.equal(errors[0].field, 'expression');
        });

        T.test('ogni errore statico ha un messaggio', function (assert) {
            var italian = OnoFlow.Localization.createTranslator('it');
            var program = H.program([H.declare('x, x', 'Integer'), H.call('1')], [H.fn('Len', 'None'), H.fn('F', 'None'), H.fn('F', 'None')]);
            var errors = StaticCheck.check(program).concat([{ code: 'ERR_MAIN_SIGNATURE', params: {} }]);
            assert.equal(errors.length, 5);
            errors.forEach(function (error) {
                var message = italian.formatError(error);
                assert.notEqual(message, error.code);
                assert.equal(message.indexOf('{'), -1, message);
            });
        });
    });
})();
