/*
 * OnoFlow — test di annulla/ripeti (passo 12): storia delle modifiche, contenuto dei blocchi,
 * versioni del documento, QA-13.
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*, js/examples/examples.js.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var OnoFlow = window.OnoFlow;
    var Format = OnoFlow.Format;
    var Model = OnoFlow.Model;
    var Editor = OnoFlow.Editor;
    var History = OnoFlow.History;
    var DiagramDocument = OnoFlow.DiagramDocument;

    /* Il programma intero, ID compresi: due programmi uguali hanno la stessa stringa. */
    function snapshot(program) {
        return JSON.stringify(program);
    }

    function sampleDocument() {
        var text = OnoFlow.Examples.byId('somma-massimo-minimo').text;
        var result = Format.importFprg(text);
        return DiagramDocument.create({
            program: result.program, format: result.format, sourceText: text,
            fileName: 'somma-massimo-minimo.fprg', origin: 'file', saved: true
        });
    }

    /* Le modifiche come le fa l'interfaccia: operazione, documento modificato, passo registrato. */
    function editor(document, history) {
        var program = document.program;
        function record(step, before) {
            document.markChanged();
            step.revisions = { before: before, after: document.revision() };
            history.record(step);
            return step;
        }
        return {
            insert: function (slot, kindOrBlock) {
                var before = document.revision();
                var block = typeof kindOrBlock === 'string' ? Editor.createNewBlock(kindOrBlock) : kindOrBlock;
                Editor.insertAt(program, slot, block);
                return record({ kind: 'insert', block: block, slot: slot }, before);
            },
            remove: function (id) {
                var before = document.revision();
                var removed = Editor.removeAt(program, id);
                return record({ kind: 'remove', block: removed.block, slot: removed.slot }, before);
            },
            edit: function (id, change) {
                var before = document.revision();
                var block = Model.findById(program, id).node;
                var content = Editor.contentOf(block);
                change(block);
                return record({ kind: 'edit', blockId: id, before: content, after: Editor.contentOf(block) }, before);
            }
        };
    }

    function undoAll(document, history) {
        var step;
        while ((step = history.undo(document.program))) {
            document.setRevision(step.revisions.before);
        }
    }

    function redoAll(document, history) {
        var step;
        while ((step = history.redo(document.program))) {
            document.setRevision(step.revisions.after);
        }
    }

    T.suite('Annulla/ripeti › contenuto di un blocco (FR-EDIT-05)', function () {
        T.test('testi dei campi e proprietà, senza figli né ID', function (assert) {
            var block = H.declare('numeri', 'Real', 'dim');
            assert.deepEqual(Editor.contentOf(block), {
                fields: { names: 'numeri', size: 'dim' },
                properties: { type: 'Real', array: true }
            });
            var loop = H.loop('i < 3', [H.output('i')]);
            assert.deepEqual(Editor.contentOf(loop), { fields: { expression: 'i < 3' }, properties: {} });
        });

        T.test('rimesso, il blocco torna com\'era e i campi si rianalizzano', function (assert) {
            var block = H.declare('x', 'Integer');
            var before = Editor.contentOf(block);
            var id = block.id;
            Model.setFieldText(block, 'names', 'x y');
            Model.setProperty(block, 'type', 'String');
            Model.setProperty(block, 'array', true);
            assert.isTrue(block.fields.names.error !== null, 'un errore di sintassi');
            assert.isFalse(Editor.sameContent(before, Editor.contentOf(block)));
            Editor.setContent(block, before);
            assert.isTrue(Editor.sameContent(before, Editor.contentOf(block)));
            assert.equal(block.fields.names.error, null, 'l\'errore sparisce con il testo di prima');
            assert.equal(block.type, 'Integer');
            assert.isFalse(block.array);
            assert.equal(block.id, id);
        });

        T.test('sameContent confronta campi e proprietà', function (assert) {
            var a = Editor.contentOf(H.output('n'));
            assert.isTrue(Editor.sameContent(a, Editor.contentOf(H.output('n'))));
            assert.isFalse(Editor.sameContent(a, Editor.contentOf(H.output('m'))));
            assert.isFalse(Editor.sameContent(a, Editor.contentOf(H.output('n', false))));
        });
    });

    T.suite('Annulla/ripeti › storia (FR-EDIT-05, QA-13)', function () {
        T.test('QA-13: annullare tutto riporta al modello iniziale, ID compresi, e "modificato" si spegne', function (assert) {
            var document = sampleDocument();
            var program = document.program;
            var history = History.create();
            var main = program.functions[0];
            var start = snapshot(program);
            var edit = editor(document, history);

            edit.insert({ ownerId: main.id, list: 'body', index: 0 }, 'output');
            edit.edit(main.body[0].id, function (block) { Model.setFieldText(block, 'expression', '"Ciao"'); });
            var loop = main.body.filter(function (block) { return block.kind === 'do'; })[0];
            edit.edit(main.body[1].id, function (block) { Model.setProperty(block, 'type', 'Real'); });
            edit.remove(loop.id);
            var test = H.when('x', [], []);
            edit.insert({ ownerId: main.id, list: 'body', index: 1 }, test);
            edit.insert({ ownerId: test.id, list: 'then', index: 0 }, 'assign');
            var end = snapshot(program);
            assert.isTrue(document.isModified());
            assert.notEqual(end, start);

            undoAll(document, history);
            assert.equal(snapshot(program), start, 'modello iniziale');
            assert.isFalse(document.isModified(), '"modificato" si azzera');
            assert.isFalse(history.canUndo());
            assert.isTrue(history.canRedo());

            redoAll(document, history);
            assert.equal(snapshot(program), end, 'modello finale');
            assert.isTrue(document.isModified());
            assert.isFalse(history.canRedo());
        });

        T.test('un passo alla volta, nei due versi', function (assert) {
            var program = H.program([H.output('1')]);
            var main = program.functions[0];
            var history = History.create();
            var block = Editor.createNewBlock('input');
            var slot = { ownerId: main.id, list: 'body', index: 1 };
            Editor.insertAt(program, slot, block);
            history.record({ kind: 'insert', block: block, slot: slot, revisions: { before: 0, after: 1 } });
            assert.equal(history.last().block, block);
            assert.equal(history.undo(program).block, block);
            assert.equal(main.body.length, 1);
            assert.equal(history.undo(program), null, 'niente da annullare');
            assert.equal(history.redo(program).block, block);
            assert.equal(main.body[1], block, 'lo stesso blocco, nello stesso punto');
            assert.equal(history.redo(program), null, 'niente da ripetere');
        });

        T.test('una modifica nuova cancella quello che si poteva ripetere', function (assert) {
            var document = sampleDocument();
            var history = History.create();
            var main = document.program.functions[0];
            var edit = editor(document, history);
            edit.insert({ ownerId: main.id, list: 'body', index: 0 }, 'output');
            history.undo(document.program);
            assert.isTrue(history.canRedo());
            edit.insert({ ownerId: main.id, list: 'body', index: 0 }, 'input');
            assert.isFalse(history.canRedo());
            assert.equal(history.redo(document.program), null);
        });

        T.test('oltre il limite si dimenticano i passi più vecchi', function (assert) {
            assert.equal(History.LIMIT, 100, 'D-02');
            var document = sampleDocument();
            var history = History.create({ limit: 3 });
            var main = document.program.functions[0];
            var edit = editor(document, history);
            var inserted = [];
            for (var i = 0; i < 5; i++) {
                inserted.push(edit.insert({ ownerId: main.id, list: 'body', index: 0 }, 'output').block);
            }
            var undone = 0;
            while (history.undo(document.program)) {
                undone++;
            }
            assert.equal(undone, 3);
            assert.equal(main.body[1], inserted[0], 'restano i due inserimenti più vecchi');
            assert.equal(main.body[0], inserted[1]);
            assert.equal(main.body.indexOf(inserted[4]), -1, 'il più recente si è annullato');
        });

        T.test('passi sconosciuti rifiutati', function (assert) {
            assert.throws(function () { History.create().record({ kind: 'move' }); }, TypeError);
        });
    });

    T.suite('Annulla/ripeti › documento (FR-FILE-11, QA-13)', function () {
        T.test('si torna "salvato" annullando fino al salvataggio, e "modificato" ripetendo oltre', function (assert) {
            var document = sampleDocument();
            var history = History.create();
            var main = document.program.functions[0];
            var edit = editor(document, history);
            edit.insert({ ownerId: main.id, list: 'body', index: 0 }, 'output');
            document.save('somma-massimo-minimo.fprg', new Date(2026, 9, 23, 10, 0, 0));
            assert.isFalse(document.isModified());
            edit.insert({ ownerId: main.id, list: 'body', index: 0 }, 'input');
            assert.isTrue(document.isModified());
            document.setRevision(history.undo(document.program).revisions.before);
            assert.isFalse(document.isModified(), 'di nuovo come il file salvato');
            document.setRevision(history.undo(document.program).revisions.before);
            assert.isTrue(document.isModified(), 'prima del salvataggio');
            document.setRevision(history.redo(document.program).revisions.after);
            assert.isFalse(document.isModified());
        });

        T.test('le versioni nuove non coincidono mai con una già vista', function (assert) {
            var document = sampleDocument();
            document.markChanged();
            var first = document.revision();
            document.setRevision(0);
            document.markChanged();
            assert.notEqual(document.revision(), first, 'dopo un annulla, una modifica nuova è una versione nuova');
            assert.notEqual(document.revision(), 0);
            assert.isTrue(document.isModified());
        });
    });
})();
