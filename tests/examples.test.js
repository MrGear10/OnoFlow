/*
 * OnoFlow — test degli esempi del menu (QA-06, B6, DEC-070): ognuno si apre senza errori né
 * avvisi, si riesporta identico e produce l'output atteso con input noti.
 *
 * Dipendenze: tests/framework/*, js/core/*, js/examples/examples.js.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var OnoFlow = window.OnoFlow;
    var Format = OnoFlow.Format;
    var Model = OnoFlow.Model;
    var Examples = OnoFlow.Examples;

    /* Ultime righe dell'output (gli input compaiono anche loro nella console). */
    function lastLines(id, inputs, count) {
        var result = OnoFlow.Interpreter.runSync(Format.importFprg(Examples.byId(id).text).program, inputs);
        var lines = result.output.replace(/\n$/, '').split('\n');
        return { status: result.status, lines: lines.slice(-count), error: result.error };
    }

    T.suite('Esempi › ogni esempio del menu (QA-06)', function () {
        T.test('si apre senza errori né avvisi e si riesporta identico, salvo saved', function (assert) {
            var withoutSaved = function (text) { return text.replace(/<attribute name="saved" value="[^"]*"\/>/, ''); };
            assert.equal(Examples.list.length, 7);
            Examples.list.forEach(function (example) {
                var loaded = Format.importFprg(example.text);
                assert.deepEqual(loaded.warnings, [], example.id + ': avvisi');
                assert.deepEqual(Model.collectFieldErrors(loaded.program), [], example.id + ': errori dei campi');
                assert.deepEqual(OnoFlow.StaticCheck.check(loaded.program), [], example.id + ': errori statici');
                assert.equal(withoutSaved(Format.exportFprg(loaded.program, { format: loaded.format })), withoutSaved(example.text),
                    example.id + ': round-trip');
            });
        });

        T.test('ognuno ha un titolo nel catalogo e un nome di file .fprg', function (assert) {
            var ids = {};
            Examples.list.forEach(function (example) {
                assert.notEqual(OnoFlow.Localization.t(example.titleKey), example.titleKey, example.id + ': titolo');
                assert.isTrue(/^[a-z_-]+\.fprg$/.test(example.fileName), example.id + ': ' + example.fileName);
                assert.isFalse(ids[example.id] === true, 'id ripetuto ' + example.id);
                ids[example.id] = true;
            });
        });
    });

    T.suite('Esempi › output con input noti (QA-06, B6)', function () {
        T.test('pari o dispari', function (assert) {
            assert.deepEqual(lastLines('pari-dispari', ['7'], 1).lines, ['7 è dispari']);
            assert.deepEqual(lastLines('pari-dispari', ['4'], 1).lines, ['4 è pari']);
            assert.deepEqual(lastLines('pari-dispari', ['-3'], 1).lines, ['-3 è dispari'], 'mod con un negativo');
        });

        T.test('tabellina', function (assert) {
            var lines = lastLines('tabellina', ['3'], 10).lines;
            assert.equal(lines[0], '3 x 1 = 3');
            assert.equal(lines[9], '3 x 10 = 30');
        });

        T.test('media: con la virgola e senza numeri', function (assert) {
            assert.deepEqual(lastLines('media', ['3', '4', '5', '6'], 1).lines, ['Media: 5']);
            assert.deepEqual(lastLines('media', ['2', '1', '2'], 1).lines, ['Media: 1,5']);
            assert.deepEqual(lastLines('media', ['0'], 1).lines, ['Nessun numero inserito']);
        });

        T.test('fattoriale: anche 0 e il primo che esce dagli Integer', function (assert) {
            assert.deepEqual(lastLines('fattoriale', ['5'], 1).lines, ['5! = 120']);
            assert.deepEqual(lastLines('fattoriale', ['0'], 1).lines, ['0! = 1']);
            var overflow = lastLines('fattoriale', ['13'], 1);
            assert.equal(overflow.status, 'error', '13! supera 2147483647');
        });

        T.test('massimo comun divisore', function (assert) {
            assert.deepEqual(lastLines('mcd', ['12', '18'], 1).lines, ['Massimo comun divisore: 6']);
            assert.deepEqual(lastLines('mcd', ['7', '0'], 1).lines, ['Massimo comun divisore: 7']);
        });

        T.test('somma fino allo zero (do)', function (assert) {
            assert.deepEqual(lastLines('somma-positivi', ['3', '4', '0'], 1).lines, ['Somma: 7']);
            assert.deepEqual(lastLines('somma-positivi', ['0'], 1).lines, ['Somma: 0'], 'il corpo del do si esegue almeno una volta');
        });
    });
})();
