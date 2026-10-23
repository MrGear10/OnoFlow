/*
 * OnoFlow — test dello spostamento dei blocchi (passo 19, FR-EDIT-12, D-03).
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var OnoFlow = window.OnoFlow;
    var Editor = OnoFlow.Editor;

    function texts(list) {
        return list.map(function (block) { return block.fields.expression ? block.fields.expression.text : block.kind; });
    }

    T.suite('Spostamento › dove si può (FR-EDIT-12)', function () {
        T.test('non dentro sé stesso o un suo figlio, non nei punti attorno a sé', function (assert) {
            var inner = H.output('"dentro"');
            var loop = H.loop('true', [inner]);
            var program = H.program([H.output('"a"'), loop, H.output('"b"')]);
            var main = program.functions[0].id;
            assert.isFalse(Editor.canMoveTo(program, loop.id, { ownerId: loop.id, list: 'body', index: 0 }), 'dentro sé stesso');
            assert.isFalse(Editor.canMoveTo(program, loop.id, { ownerId: main, list: 'body', index: 1 }), 'il punto prima');
            assert.isFalse(Editor.canMoveTo(program, loop.id, { ownerId: main, list: 'body', index: 2 }), 'il punto dopo');
            assert.isTrue(Editor.canMoveTo(program, loop.id, { ownerId: main, list: 'body', index: 0 }));
            assert.isTrue(Editor.canMoveTo(program, loop.id, { ownerId: main, list: 'body', index: 3 }));
            assert.isTrue(Editor.canMoveTo(program, inner.id, { ownerId: main, list: 'body', index: 0 }), 'un figlio esce');
            assert.isFalse(Editor.canMoveTo(program, program.functions[0].id, { ownerId: main, list: 'body', index: 0 }), 'una funzione no');
        });

        T.test('dentro un if annidato no, se è figlio del blocco spostato', function (assert) {
            var deep = H.when('x', [], []);
            var outer = H.when('y', [deep], []);
            var program = H.program([outer]);
            assert.isFalse(Editor.canMoveTo(program, outer.id, { ownerId: deep.id, list: 'else', index: 0 }));
        });
    });

    T.suite('Spostamento › il blocco va dove si è scelto', function () {
        T.test('in avanti e indietro nello stesso elenco, con gli indici giusti', function (assert) {
            var program = H.program([H.output('"a"'), H.output('"b"'), H.output('"c"'), H.output('"d"')]);
            var main = program.functions[0];
            var a = main.body[0];
            var moved = Editor.moveBlock(program, a.id, { ownerId: main.id, list: 'body', index: 3 });
            assert.deepEqual(texts(main.body), ['"b"', '"c"', '"a"', '"d"'], 'il punto tra c e d');
            assert.deepEqual(moved.from, { ownerId: main.id, list: 'body', index: 0 });
            assert.deepEqual(moved.to, { ownerId: main.id, list: 'body', index: 2 });
            Editor.moveBlock(program, main.body[3].id, { ownerId: main.id, list: 'body', index: 0 });
            assert.deepEqual(texts(main.body), ['"d"', '"b"', '"c"', '"a"']);
        });

        T.test('con il contenuto, in un ramo, in un\'altra funzione; gli ID non cambiano', function (assert) {
            var body = [H.output('"x"')];
            var loop = H.loop('true', body);
            var test = H.when('k', [], []);
            var other = H.fn('F', 'None');
            var program = H.program([loop, test], [other]);
            var id = loop.id;
            Editor.moveBlock(program, id, { ownerId: test.id, list: 'else', index: 0 });
            assert.equal(test['else'][0], loop);
            assert.equal(loop.body[0], body[0], 'il contenuto viaggia con lui');
            Editor.moveBlock(program, id, { ownerId: other.id, list: 'body', index: 0 });
            assert.equal(other.body[0].id, id);
            assert.equal(test['else'].length, 0);
        });

        T.test('dove non si può, non cambia niente', function (assert) {
            var program = H.program([H.output('"a"'), H.output('"b"')]);
            var main = program.functions[0];
            var before = JSON.stringify(program);
            assert.equal(Editor.moveBlock(program, main.body[0].id, { ownerId: main.id, list: 'body', index: 1 }), null);
            assert.equal(JSON.stringify(program), before);
        });
    });

    T.suite('Spostamento › annulla/ripeti (FR-EDIT-05)', function () {
        T.test('uno spostamento è un passo: si annulla e si ripete, anche in fila', function (assert) {
            var inner = H.output('"dentro"');
            var program = H.program([H.output('"a"'), H.loop('true', [inner]), H.output('"b"')]);
            var main = program.functions[0];
            var start = JSON.stringify(program);
            var history = OnoFlow.History.create();
            [
                [main.body[0].id, { ownerId: main.id, list: 'body', index: 3 }],
                [inner.id, { ownerId: main.id, list: 'body', index: 0 }],
                [main.body[1].id, { ownerId: main.id, list: 'body', index: 0 }]
            ].forEach(function (move) {
                var done = Editor.moveBlock(program, move[0], move[1]);
                history.record({ kind: 'move', blockId: move[0], from: done.from, to: done.to });
            });
            var end = JSON.stringify(program);
            assert.notEqual(end, start);
            while (history.undo(program)) { /* fino all'inizio */ }
            assert.equal(JSON.stringify(program), start, 'modello iniziale, ID compresi');
            while (history.redo(program)) { /* fino alla fine */ }
            assert.equal(JSON.stringify(program), end);
        });
    });
    T.suite('Spostamento › disegno (D-03, FR-MOB-04)', function () {
        T.test('i + vietati sono spenti, fuori dal Tab e non si colpiscono col tocco', function (assert) {
            var target = H.output('"a"');
            var program = H.program([target, H.output('"b"')]);
            var container = document.createElement('div');
            var view = OnoFlow.DiagramRenderer.render(container, program, {
                t: OnoFlow.Localization.t,
                measurer: OnoFlow.DiagramRenderer.createMeasurer(document),
                editable: function () { return true; }
            });
            view.setMoving(target.id, function (slot) { return Editor.canMoveTo(program, target.id, slot); });
            var points = container.querySelectorAll('[data-slot]');
            assert.equal(container.querySelectorAll('.dg-slot.is-disabled').length, 2);
            assert.equal(points[0].getAttribute('tabindex'), '-1');
            assert.equal(points[2].getAttribute('tabindex'), '0');
            assert.isTrue(container.querySelector('[data-id="' + target.id + '"]').classList.contains('is-moving'));
            var box = view.slotBox(0);
            var center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
            var hit = view.hitTest(center, 22);
            assert.isTrue(!hit || hit.slot !== 0, 'un + spento non si colpisce');
            view.setMoving(null);
            assert.equal(container.querySelectorAll('.dg-slot.is-disabled, .is-moving').length, 0);
            assert.deepEqual(view.hitTest(center, 22), { slot: 0 });
        });
    });
})();
