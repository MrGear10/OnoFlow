/*
 * OnoFlow — test del pannello delle variabili (passo 15): valore completo dei Real (D-05),
 * variabili della chiamata in corso nello scheduler, disegno del pannello (FR-RUN-06).
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*, js/i18n/*, js/ui/variables-view.js.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var OnoFlow = window.OnoFlow;
    var NumberFormat = OnoFlow.NumberFormat;
    var VariablesView = OnoFlow.VariablesView;
    var t = OnoFlow.Localization.t;
    var FORMAT = { decimalSeparator: ',', inputDecimalSeparators: [',', '.'] };

    /* Come l'app: le stringhe tra virgolette. */
    function formatValue(value) {
        var text = NumberFormat.formatValue(value.type, value.value, FORMAT);
        return value.type === 'String' ? '"' + text + '"' : text;
    }

    function view() {
        var host = document.createElement('div');
        var panel = VariablesView.create(host, {
            t: t,
            formatValue: formatValue,
            formatFull: function (value) { return NumberFormat.formatRealFull(value, FORMAT); }
        });
        panel.row = function (name) { return host.querySelector('[data-name="' + name + '"]'); };
        panel.host = host;
        return panel;
    }

    function variable(name, type, value) {
        return { name: name, type: type, array: false, value: value, elements: null };
    }

    function array(name, type, elements) {
        return { name: name, type: type, array: true, value: undefined, elements: elements };
    }

    /* Scheduler con timer finti, un passo alla volta. */
    function stepper(program) {
        var queue = [];
        var scheduler = OnoFlow.Scheduler.create(program, {
            now: function () { return 0; },
            schedule: function (callback) { queue.push(callback); return queue.length; },
            cancel: function () { queue = []; }
        });
        return {
            scheduler: scheduler,
            step: function () {
                scheduler.step();
                for (var turns = 0; turns < 1000 && queue.length; turns++) {
                    queue.shift()();
                }
            }
        };
    }

    T.suite('Variabili › valore completo dei Real (D-05)', function () {
        T.test('tutte le cifre della rappresentazione più corta, con la virgola', function (assert) {
            assert.equal(NumberFormat.formatRealFull(0.1 + 0.2, FORMAT), '0,30000000000000004');
            assert.equal(NumberFormat.formatRealFull(5, FORMAT), '5');
            assert.equal(NumberFormat.formatRealFull(-2.5, FORMAT), '-2,5');
            assert.equal(NumberFormat.formatRealFull(1 / 3, FORMAT), '0,3333333333333333');
        });

        T.test('mai notazione scientifica né -0', function (assert) {
            assert.equal(NumberFormat.formatRealFull(1e21, FORMAT), '1000000000000000000000');
            assert.equal(NumberFormat.formatRealFull(1e-7, FORMAT), '0,0000001');
            assert.equal(NumberFormat.formatRealFull(-0, FORMAT), '0');
            assert.equal(NumberFormat.formatRealFull(2.5, { decimalSeparator: '.', inputDecimalSeparators: ['.'] }), '2.5');
        });
    });

    T.suite('Variabili › scheduler (FR-RUN-06)', function () {
        T.test('le variabili della chiamata in corso, al blocco evidenziato', function (assert) {
            var program = H.program([H.declare('x', 'Integer'), H.assign('x', '5'), H.output('x')]);
            var run = stepper(program);
            assert.equal(run.scheduler.variables(), null, 'prima di cominciare');
            run.step(); // prima della dichiarazione
            assert.deepEqual(run.scheduler.variables(), { functionName: 'Main', variables: [] });
            run.step(); // prima dell'assegnazione
            assert.deepEqual(run.scheduler.variables().variables, [variable('x', 'Integer', undefined)]);
            run.step(); // prima dell'output
            assert.equal(run.scheduler.variables().variables[0].value, 5);
        });

        T.test('dentro una funzione, le sue variabili e il suo nome', function (assert) {
            // Come in Flowgorithm, la variabile di ritorno si dichiara nel corpo.
            var doppio = H.fn('Doppio', 'Integer', 'r', [['n', 'Integer']], [H.declare('r', 'Integer'), H.assign('r', 'n * 2')]);
            var program = H.program([H.declare('a', 'Integer'), H.assign('a', 'Doppio(4)')], [doppio]);
            var run = stepper(program);
            run.step();
            run.step(); // prima dell'assegnazione in Main
            run.step(); // dentro Doppio, prima della dichiarazione
            var inside = run.scheduler.variables();
            assert.equal(inside.functionName, 'Doppio');
            assert.deepEqual(inside.variables.map(function (v) { return v.name + '=' + v.value; }), ['n=4']);
            run.step();
            assert.deepEqual(run.scheduler.variables().variables.map(function (v) { return v.name + '=' + v.value; }), ['n=4', 'r=undefined']);
            run.step(); // di nuovo in Main, a fine assegnazione: il programma è finito
            assert.equal(run.scheduler.state(), 'finished');
        });

        T.test('la fotografia non cambia con i passi successivi', function (assert) {
            var program = H.program([H.declare('x', 'Integer'), H.assign('x', '1'), H.assign('x', '2'), H.output('x')]);
            var run = stepper(program);
            run.step();
            run.step();
            run.step();
            var before = run.scheduler.variables();
            run.step();
            assert.equal(before.variables[0].value, 1);
            assert.equal(run.scheduler.variables().variables[0].value, 2);
        });
    });

    T.suite('Variabili › tutte quelle del diagramma (MG-02)', function () {
        T.test('Main prima, poi le funzioni; parametri, poi dichiarazioni anche in rami e cicli', function (assert) {
            var somma = H.fn('Somma', 'Integer', 'r', [['v', 'Integer', true], ['k', 'Integer']], [H.declare('r', 'Integer')]);
            var program = H.program([
                H.declare('n, i', 'Integer'),
                H.when('n > 0', [H.declare('voti', 'Real', '3')], [H.declare('n', 'String')]),
                H.loop('i < 3', [H.declare('t', 'Boolean')])
            ], [somma]);
            var rows = OnoFlow.Model.declaredVariables(program).map(function (row) {
                return row.functionName + ':' + row.name + ':' + row.type + (row.array ? '[]' : '') + (row.parameter ? ':p' : '');
            });
            assert.deepEqual(rows, ['Main:n:Integer', 'Main:i:Integer', 'Main:voti:Real[]', 'Main:t:Boolean',
                'Somma:v:Integer[]:p', 'Somma:k:Integer:p', 'Somma:r:Integer']);
        });

        T.test('lo stesso nome in funzioni diverse sono due variabili; un campo con errore non conta', function (assert) {
            var f = H.fn('F', 'None', '', [['n', 'Integer']], [H.declare('x, 3a', 'Integer')]);
            var rows = OnoFlow.Model.declaredVariables(H.program([H.declare('n', 'Integer')], [f]));
            assert.deepEqual(rows.map(function (row) { return row.functionName + ':' + row.name; }), ['Main:n', 'F:n']);
        });
    });

    T.suite('Variabili › pila delle chiamate (MG-02)', function () {
        T.test('dentro una funzione si vedono anche le variabili di Main', function (assert) {
            var doppio = H.fn('Doppio', 'Integer', 'r', [['n', 'Integer']], [H.declare('r', 'Integer'), H.assign('r', 'n * 2')]);
            var program = H.program([H.declare('a', 'Integer'), H.assign('a', '1'), H.assign('a', 'Doppio(4)')], [doppio]);
            var run = stepper(program);
            assert.equal(run.scheduler.frames(), null, 'prima di cominciare');
            run.step();
            run.step();
            run.step();
            run.step(); // dentro Doppio
            var frames = run.scheduler.frames();
            assert.deepEqual(frames.map(function (frame) { return frame.functionName; }), ['Main', 'Doppio']);
            assert.equal(frames[0].variables[0].value, 1, 'a in Main');
            assert.equal(frames[1].variables[0].value, 4, 'n in Doppio');
            run.step();
            run.step(); // finito: resta Main con il risultato
            assert.deepEqual(run.scheduler.frames().map(function (frame) { return frame.functionName + ':' + frame.variables[0].value; }), ['Main:8']);
        });

        T.test('ricorsione: una chiamata per livello', function (assert) {
            var fatt = H.fn('Fatt', 'Integer', 'r', [['n', 'Integer']], [
                H.declare('r', 'Integer'),
                H.when('n <= 1', [H.assign('r', '1')], [H.assign('r', 'n * Fatt(n - 1)')])
            ]);
            var program = H.program([H.declare('x', 'Integer'), H.assign('x', 'Fatt(3)')], [fatt]);
            var run = stepper(program);
            var deepest = 0;
            for (var i = 0; i < 40 && run.scheduler.state() !== 'finished'; i++) {
                run.step();
                var frames = run.scheduler.frames();
                deepest = Math.max(deepest, frames ? frames.length : 0);
            }
            assert.equal(deepest, 4, 'Main e tre chiamate di Fatt');
        });
    });

    T.suite('Variabili › pannello (FR-RUN-06, QA-08)', function () {
        T.test('nome, tipo e valore come nella console; le stringhe tra virgolette', function (assert) {
            var panel = view();
            panel.show({ functionName: 'Main', variables: [
                variable('n', 'Integer', 7), variable('s', 'String', 'ciao'), variable('b', 'Boolean', true), variable('z', 'Real', undefined)
            ] });
            assert.equal(panel.host.querySelector('.variables-title').textContent, 'Variabili di Main');
            assert.equal(panel.row('n').querySelector('.variable-type').textContent, 'Integer');
            assert.equal(panel.row('n').querySelector('.variable-value').textContent, '7');
            assert.equal(panel.row('s').querySelector('.variable-value').textContent, '"ciao"');
            assert.equal(panel.row('b').querySelector('.variable-value').textContent, 'true');
            assert.equal(panel.row('z').querySelector('.variable-value').textContent, 'nessun valore');
        });

        T.test('un Real arrotondato ha sotto il valore completo, gli altri no (D-05)', function (assert) {
            var panel = view();
            panel.show({ functionName: 'Main', variables: [variable('a', 'Real', 0.1 + 0.2), variable('b', 'Real', 2.5), variable('c', 'Real', 7)] });
            assert.equal(panel.row('a').querySelector('.variable-value').firstChild.textContent, '0,3');
            assert.equal(panel.row('a').querySelector('.variable-full').textContent, '0,30000000000000004');
            assert.equal(panel.row('b').querySelector('.variable-full'), null);
            assert.equal(panel.row('c').querySelector('.variable-full'), null, '7 si stampa come 7');
        });

        T.test('un array mostra gli elementi con l\'indice, anche quelli senza valore', function (assert) {
            var panel = view();
            var elements = new Array(3);
            elements[0] = 4;
            elements[2] = 9;
            panel.show({ functionName: 'Main', variables: [array('numeri', 'Integer', elements)] });
            var row = panel.row('numeri');
            assert.equal(row.querySelector('.variable-type').textContent, 'Integer, 3 elementi');
            var items = row.querySelectorAll('.variable-elements li');
            assert.equal(items.length, 3);
            assert.equal(items[0].querySelector('.variable-index').textContent, '0');
            assert.equal(items[0].querySelector('.variable-element').textContent, '4');
            assert.equal(items[1].querySelector('.variable-element').textContent, 'nessun valore');
        });

        T.test('un array lungo si accorcia', function (assert) {
            var panel = view();
            var elements = [];
            for (var i = 0; i < VariablesView.MAX_ELEMENTS + 7; i++) {
                elements.push(i);
            }
            panel.show({ functionName: 'Main', variables: [array('v', 'Integer', elements)] });
            assert.equal(panel.row('v').querySelectorAll('.variable-element').length, VariablesView.MAX_ELEMENTS);
            assert.equal(panel.row('v').querySelector('.variable-more').textContent, 'e altri 7');
        });

        T.test('ciò che è cambiato dall\'ultima fotografia è segnato', function (assert) {
            var panel = view();
            panel.show({ functionName: 'Main', variables: [variable('a', 'Integer', 1), array('v', 'Integer', [1, 2])] });
            assert.equal(panel.host.querySelectorAll('.is-changed').length, 0, 'la prima volta niente');
            panel.show({ functionName: 'Main', variables: [variable('a', 'Integer', 2), array('v', 'Integer', [1, 5]), variable('b', 'Integer', undefined)] });
            assert.isTrue(panel.row('a').classList.contains('is-changed'));
            assert.isTrue(panel.row('b').classList.contains('is-changed'), 'appena dichiarata');
            var items = panel.row('v').querySelectorAll('.variable-elements li');
            assert.isFalse(items[0].classList.contains('is-changed'));
            assert.isTrue(items[1].classList.contains('is-changed'), 'solo l\'elemento cambiato');
            assert.isTrue(panel.row('a').textContent.indexOf('cambiata') !== -1, 'detto anche ai lettori di schermo');
            panel.show({ functionName: 'Main', variables: [variable('a', 'Integer', 2), array('v', 'Integer', [1, 5]), variable('b', 'Integer', undefined)] });
            assert.equal(panel.host.querySelectorAll('.is-changed').length, 0, 'un passo senza cambiamenti');
        });

        T.test('un\'altra funzione non si confronta con la precedente; senza variabili, un avviso', function (assert) {
            var panel = view();
            panel.show({ functionName: 'Main', variables: [variable('a', 'Integer', 1)] });
            panel.show({ functionName: 'Doppio', variables: [variable('a', 'Integer', 2)] });
            assert.equal(panel.host.querySelectorAll('.is-changed').length, 0);
            assert.equal(panel.host.querySelector('.variables-title').textContent, 'Variabili di Doppio');
            panel.show({ functionName: 'Main', variables: [] });
            assert.equal(panel.host.querySelector('.variables-empty').textContent, 'Nessuna variabile dichiarata finora.');
            panel.reset();
            assert.equal(panel.element.textContent, '');
        });

        T.test('riassunto in una riga per la striscia del telefono', function (assert) {
            var snapshot = { functionName: 'Main', variables: [variable('n', 'Integer', 7), variable('s', 'String', 'ok'), array('v', 'Integer', [1, 2, 3, 4, 5, 6])] };
            assert.equal(VariablesView.summary(snapshot, t, formatValue), 'n = 7 · s = "ok" · v = [1; 2; 3; 4; 5; …]');
            assert.equal(VariablesView.summary(null, t, formatValue), 'Nessuna variabile dichiarata finora.');
        });

        T.test('riassunto: prima le cambiate, poi quelle con un valore, poi le vuote (M-06)', function (assert) {
            var snapshot = { functionName: 'Main', variables: [
                variable('n', 'Integer', undefined), variable('max', 'Integer', 3), variable('min', 'Integer', undefined),
                variable('dim', 'Integer', 0), array('v', 'Integer', [undefined, undefined])
            ] };
            assert.equal(VariablesView.summary(snapshot, t, formatValue, ['dim']), 'dim = 0 · max = 3 · n = nessun valore · min = nessun valore · v = [nessun valore; nessun valore]');
            assert.deepEqual(VariablesView.summaryParts(snapshot, t, formatValue, ['dim', 'n']).map(function (part) { return part.changed; }),
                [true, true, false, false, false], 'cambiate segnate, in ordine di dichiarazione');
            assert.equal(VariablesView.summaryParts(snapshot, t, formatValue, ['dim', 'n'])[0].text, 'n = nessun valore', 'tra le cambiate resta l\'ordine di dichiarazione');
            assert.equal(VariablesView.summary(snapshot, t, formatValue), 'max = 3 · dim = 0 · n = nessun valore · min = nessun valore · v = [nessun valore; nessun valore]', 'senza cambiate: prima i valori');
        });

        T.test('show restituisce i nomi delle variabili cambiate', function (assert) {
            var panel = view();
            assert.deepEqual(panel.show({ functionName: 'Main', variables: [variable('a', 'Integer', 1), variable('b', 'Integer', 2)] }), [], 'la prima fotografia non ha cambiate');
            assert.deepEqual(panel.show({ functionName: 'Main', variables: [variable('a', 'Integer', 1), variable('b', 'Integer', 5)] }), ['b']);
            assert.deepEqual(panel.show(null), [], 'senza fotografia, nessuna');
        });
    });
})();
