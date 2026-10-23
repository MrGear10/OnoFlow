/*
 * OnoFlow — test della gestione delle funzioni (passo 18, FR-EDIT-11): aggiunta, cancellazione,
 * firma, chiamate rinominate, annulla/ripeti.
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var OnoFlow = window.OnoFlow;
    var Editor = OnoFlow.Editor;
    var Model = OnoFlow.Model;

    function names(program) {
        return program.functions.map(function (programFunction) { return programFunction.name; });
    }

    T.suite('Funzioni › aggiunta e cancellazione (FR-EDIT-11)', function () {
        T.test('una funzione nuova ha un nome libero, nessun parametro, nessun valore', function (assert) {
            var program = H.program([], [H.fn('Funzione', 'None')]);
            var created = Editor.newFunction(program);
            assert.equal(created.name, 'Funzione2');
            assert.equal(created.type, 'None');
            assert.deepEqual(created.parameters, []);
            assert.deepEqual(created.body, []);
            assert.equal(Editor.newFunction(H.program([])).name, 'Funzione');
        });

        T.test('si aggiunge in fondo, si toglie e si rimette nello stesso posto', function (assert) {
            var program = H.program([], [H.fn('A', 'None'), H.fn('B', 'None')]);
            var added = Editor.insertFunction(program, null, Editor.newFunction(program));
            assert.equal(added.index, 3);
            assert.deepEqual(names(program), ['Main', 'A', 'B', 'Funzione']);
            var removed = Editor.removeFunction(program, program.functions[1].id);
            assert.deepEqual(names(program), ['Main', 'B', 'Funzione']);
            Editor.insertFunction(program, removed.index, removed.fn);
            assert.deepEqual(names(program), ['Main', 'A', 'B', 'Funzione']);
        });

        T.test('Main non si cancella e niente va prima di Main', function (assert) {
            var program = H.program([]);
            assert.throws(function () { Editor.removeFunction(program, program.functions[0].id); }, RangeError);
            assert.throws(function () { Editor.insertFunction(program, 0, Editor.newFunction(program)); }, RangeError);
            assert.throws(function () { Editor.removeFunction(program, 'n-nessuna'); }, RangeError);
        });

        T.test('dal passo 18 si inserisce anche nelle altre funzioni', function (assert) {
            var other = H.fn('F', 'None');
            var program = H.program([], [other]);
            assert.isTrue(Editor.canEdit(program, other.id));
            Editor.insertAt(program, { ownerId: other.id, list: 'body', index: 0 }, Editor.createNewBlock('output'));
            assert.equal(other.body.length, 1);
        });
    });

    T.suite('Funzioni › firma (FR-EDIT-11, §6.8)', function () {
        T.test('nome, valore restituito, parametri: copiati, non condivisi', function (assert) {
            var fn = H.fn('Doppio', 'Integer', 'r', [['n', 'Integer']]);
            var signature = Editor.signatureOf(fn);
            assert.deepEqual(signature, { name: 'Doppio', type: 'Integer', variable: 'r', parameters: [{ name: 'n', type: 'Integer', array: false }] });
            signature.parameters[0].name = 'x';
            assert.equal(fn.parameters[0].name, 'n', 'la copia non tocca la funzione');
        });

        T.test('una nuova firma; senza valore la variabile restituita si svuota', function (assert) {
            var fn = H.fn('F', 'Integer', 'r', []);
            Editor.setSignature(fn, { name: 'G', type: 'Real', variable: 'v', parameters: [{ name: 'a', type: 'String', array: true }] });
            assert.equal(fn.name, 'G');
            assert.equal(fn.variable, 'v');
            assert.deepEqual(fn.parameters, [{ name: 'a', type: 'String', array: true }]);
            Editor.setSignature(fn, { name: 'G', type: 'None', variable: 'v', parameters: [] });
            assert.equal(fn.variable, '');
            assert.throws(function () { Editor.setSignature(fn, { name: 'G', type: 'Testo', variable: '', parameters: [] }); }, TypeError);
            assert.isTrue(Editor.sameSignature(fn, Editor.signatureOf(fn)));
        });

        T.test('l\'errore sul nome di un parametro dice quale parametro', function (assert) {
            var program = H.program([], [H.fn('F', 'None', '', [['a', 'Integer'], ['2b', 'Integer']])]);
            var error = OnoFlow.StaticCheck.check(program)[0];
            assert.equal(error.field, 'parameters');
            assert.equal(error.parameter, 1);
        });
    });

    T.suite('Funzioni › chiamate rinominate (FR-EDIT-11)', function () {
        T.test('solo le chiamate, con lo stile del testo; non variabili né stringhe', function (assert) {
            var a = H.assign('x', 'Doppio(2) + Doppio (3) * Doppio');
            var b = H.output('"Doppio(1)" & Doppio(Doppio(1))');
            var c = H.call('Doppio(4)');
            var target = H.assign('v[Doppio(0)]', '1');
            var program = H.program([a, b, c, target]);
            var changes = Editor.renameCalls(program, 'Doppio', 'Triplo');
            assert.equal(a.fields.expression.text, 'Triplo(2) + Triplo (3) * Doppio');
            assert.equal(b.fields.expression.text, '"Doppio(1)" & Triplo(Triplo(1))');
            assert.equal(c.fields.expression.text, 'Triplo(4)');
            assert.equal(target.fields.variable.text, 'v[Triplo(0)]');
            assert.equal(changes.length, 4);
            assert.equal(a.fields.expression.ast.left.name, 'Triplo', 'il campo si rianalizza');
            Editor.applyTexts(program, changes, true);
            assert.equal(a.fields.expression.text, 'Doppio(2) + Doppio (3) * Doppio');
            assert.equal(target.fields.variable.text, 'v[Doppio(0)]');
        });

        T.test('anche dentro le altre funzioni; maiuscole esatte', function (assert) {
            var other = H.fn('G', 'None', '', [], [H.call('doppio(1)'), H.call('Doppio(1)')]);
            var program = H.program([], [other]);
            Editor.renameCalls(program, 'Doppio', 'Triplo');
            assert.equal(other.body[0].fields.expression.text, 'doppio(1)');
            assert.equal(other.body[1].fields.expression.text, 'Triplo(1)');
        });
    });

    T.suite('Funzioni › annulla/ripeti (FR-EDIT-05, QA-13)', function () {
        T.test('aggiungere, rinominare con le chiamate, cancellare: tutto si annulla e si ripete', function (assert) {
            var doppio = H.fn('Doppio', 'Integer', 'r', [['n', 'Integer']], [H.declare('r', 'Integer'), H.assign('r', 'n * 2')]);
            var program = H.program([H.declare('x', 'Integer'), H.assign('x', 'Doppio(4)')], [doppio]);
            var start = JSON.stringify(program);
            var history = OnoFlow.History.create();

            var created = Editor.newFunction(program);
            history.record({ kind: 'addFunction', fn: created, index: Editor.insertFunction(program, null, created).index });

            var before = Editor.signatureOf(doppio);
            var after = Editor.signatureOf(doppio);
            after.name = 'Triplo';
            Editor.setSignature(doppio, after);
            var calls = Editor.renameCalls(program, 'Doppio', 'Triplo');
            history.record({ kind: 'editFunction', functionId: doppio.id, before: before, after: after, calls: calls });

            var removed = Editor.removeFunction(program, created.id);
            history.record({ kind: 'removeFunction', fn: removed.fn, index: removed.index });
            var end = JSON.stringify(program);
            assert.equal(program.functions[0].body[1].fields.expression.text, 'Doppio(4)'.replace('Doppio', 'Triplo'));

            while (history.undo(program)) { /* fino all'inizio */ }
            assert.equal(JSON.stringify(program), start, 'modello iniziale, ID compresi');
            while (history.redo(program)) { /* fino alla fine */ }
            assert.equal(JSON.stringify(program), end);
            assert.deepEqual(OnoFlow.StaticCheck.check(program), []);
        });
    });
})();
