/*
 * OnoFlow — test che falliscono di proposito, caricati solo con tests.html?dimostrazione.
 *
 * Dipendenze: tests/framework/assert.js, tests/framework/runner.js.
 *
 * Servono a vedere come la pagina mostra ogni tipo di problema. Non fanno parte
 * della batteria normale.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;

    T.suite('Dimostrazione › fallimenti voluti', function () {
        T.test('un test che passa', function (assert) {
            assert.equal(2 + 2, 4);
        });
        T.test('uguaglianza fallita (0 contro -0)', function (assert) {
            assert.equal(-0, 0);
        });
        T.test('differenza in una struttura', function (assert) {
            assert.deepEqual({ code: 'ERR_INDEX_OUT_OF_BOUNDS', params: { index: 5 } },
                { code: 'ERR_INDEX_OUT_OF_BOUNDS', params: { index: 4 } });
        });
        T.test('eccezione imprevista', function () {
            null.campo; // eslint-disable-line no-unused-expressions
        });
        T.test('test senza asserzioni', function () {});
        T.test('tempo scaduto', function () {
            return new Promise(function () {});
        }, { timeout: 100 });
    });

    T.suite('Dimostrazione › suite rotta', function () {
        throw new Error('errore mentre si definiscono i test');
    });
})();
