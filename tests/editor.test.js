/*
 * OnoFlow — test dell'editor (passo 9): blocchi nuovi, inserimento nei punti delle frecce e
 * con "Inserisci dopo", punti e selezione nel disegno, menu dei blocchi.
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*, js/i18n/*, js/ui/*.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var OnoFlow = window.OnoFlow;
    var Model = OnoFlow.Model;
    var Editor = OnoFlow.Editor;
    var Renderer = OnoFlow.DiagramRenderer;
    var t = OnoFlow.Localization.t;

    function kinds(list) {
        return list.map(function (block) { return block.kind; });
    }

    T.suite('Editor › blocchi nuovi (D-09, FR-EDIT-01)', function () {
        T.test('il menu offre gli otto blocchi della §7.3', function (assert) {
            assert.deepEqual(Editor.INSERTABLE_KINDS, ['declare', 'assign', 'input', 'output', 'if', 'while', 'do', 'for']);
        });

        T.test('un blocco nuovo parte vuoto (DEC-063)', function (assert) {
            Editor.INSERTABLE_KINDS.forEach(function (kind) {
                var block = Editor.createNewBlock(kind);
                Object.keys(block.fields).forEach(function (name) {
                    var expected = kind === 'for' && name === 'step' ? '1' : '';
                    assert.equal(block.fields[name].text, expected, kind + '.' + name);
                });
            });
            var declare = Editor.createNewBlock('declare');
            assert.equal(declare.type, 'Integer');
            assert.isFalse(declare.array);
            assert.isTrue(Editor.createNewBlock('output').newline);
        });

        T.test('chiamate e commenti non si inseriscono nella fase 1', function (assert) {
            assert.throws(function () { Editor.createNewBlock('call'); }, TypeError);
            assert.throws(function () { Editor.createNewBlock('comment'); }, TypeError);
        });

        T.test('un blocco vuoto è un errore che impedisce l\'esecuzione (FR-EDIT-03)', function (assert) {
            var program = H.program([]);
            var block = Editor.createNewBlock('output');
            Editor.insertAt(program, { ownerId: program.functions[0].id, list: 'body', index: 0 }, block);
            var errors = OnoFlow.StaticCheck.check(program);
            assert.equal(errors.length, 1);
            assert.equal(errors[0].nodeId, block.id);
            assert.equal(errors[0].code, 'ERR_SYNTAX_EMPTY_EXPRESSION');
        });
    });

    T.suite('Editor › inserimento (FR-EDIT-01, B3)', function () {
        T.test('nel punto scelto: Main, rami dell\'if, corpo dei cicli', function (assert) {
            var test = H.when('x > 0', [H.output('1')], []);
            var loop = H.repeat([], 'x < 3');
            var program = H.program([H.declare('x', 'Integer'), test, loop]);
            var main = program.functions[0];
            Editor.insertAt(program, { ownerId: main.id, list: 'body', index: 1 }, Editor.createNewBlock('input'));
            Editor.insertAt(program, { ownerId: test.id, list: 'then', index: 0 }, Editor.createNewBlock('assign'));
            Editor.insertAt(program, { ownerId: test.id, list: 'else', index: 0 }, Editor.createNewBlock('output'));
            Editor.insertAt(program, { ownerId: loop.id, list: 'body', index: 0 }, Editor.createNewBlock('for'));
            assert.deepEqual(kinds(main.body), ['declare', 'input', 'if', 'do']);
            assert.deepEqual(kinds(test.then), ['assign', 'output']);
            assert.deepEqual(kinds(test['else']), ['output']);
            assert.deepEqual(kinds(loop.body), ['for']);
        });

        T.test('restituisce blocco e punto, per annulla/ripeti', function (assert) {
            var program = H.program([]);
            var block = Editor.createNewBlock('assign');
            var slot = { ownerId: program.functions[0].id, list: 'body', index: 0 };
            var done = Editor.insertAt(program, slot, block);
            assert.equal(done.block, block);
            assert.deepEqual(done.slot, slot);
        });

        T.test('punti non validi: posizione, elenco, proprietario', function (assert) {
            var test = H.when('x', [], []);
            var program = H.program([test]);
            var main = program.functions[0].id;
            assert.throws(function () { Editor.insertAt(program, { ownerId: main, list: 'body', index: 5 }, Editor.createNewBlock('input')); }, RangeError);
            assert.throws(function () { Editor.insertAt(program, { ownerId: main, list: 'body', index: -1 }, Editor.createNewBlock('input')); }, RangeError);
            assert.throws(function () { Editor.insertAt(program, { ownerId: test.id, list: 'body', index: 0 }, Editor.createNewBlock('input')); }, RangeError);
            assert.throws(function () { Editor.insertAt(program, { ownerId: 'n-nessuno', list: 'body', index: 0 }, Editor.createNewBlock('input')); }, RangeError);
            assert.throws(function () { Editor.insertAt(program, { ownerId: main, list: 'body', index: 2 }, Editor.createNewBlock('input')); }, RangeError,
                'una posizione oltre l\'ultima');
            assert.equal(program.functions[0].body.length, 1, 'il programma non cambia');
            Editor.insertAt(program, { ownerId: main, list: 'body', index: 1 }, Editor.createNewBlock('input'));
            assert.equal(program.functions[0].body.length, 2, 'in fondo si può');
        });

        T.test('si modifica solo Main (DEC-004)', function (assert) {
            var other = H.fn('Doppio', 'Integer', 'r', [['n', 'Integer']], [H.assign('r', 'n * 2')]);
            var program = H.program([], [other]);
            assert.isTrue(Editor.canEdit(program, program.functions[0].id));
            assert.isFalse(Editor.canEdit(program, other.id));
            assert.isFalse(Editor.canEdit(program, other.body[0].id));
            assert.throws(function () {
                Editor.insertAt(program, { ownerId: other.id, list: 'body', index: 0 }, Editor.createNewBlock('input'));
            }, RangeError);
        });

        T.test('Inserisci dopo: subito dopo il blocco, nello stesso elenco', function (assert) {
            var inThen = H.output('1');
            var inElse = H.output('2');
            var inLoop = H.assign('i', 'i + 1');
            var test = H.when('x', [inThen], [inElse]);
            var loop = H.loop('i < 3', [inLoop]);
            var top = H.declare('x', 'Integer');
            var program = H.program([top, test, loop]);
            assert.deepEqual(Editor.slotAfter(program, top.id), { ownerId: program.functions[0].id, list: 'body', index: 1 });
            assert.deepEqual(Editor.slotAfter(program, inThen.id), { ownerId: test.id, list: 'then', index: 1 });
            assert.deepEqual(Editor.slotAfter(program, inElse.id), { ownerId: test.id, list: 'else', index: 1 });
            assert.deepEqual(Editor.slotAfter(program, inLoop.id), { ownerId: loop.id, list: 'body', index: 1 });
            assert.deepEqual(Editor.slotAfter(program, loop.id), { ownerId: program.functions[0].id, list: 'body', index: 3 });
            assert.throws(function () { Editor.slotAfter(program, program.functions[0].id); }, RangeError);
        });
    });

    T.suite('Editor › cancellazione (FR-EDIT-04)', function () {
        T.test('toglie il blocco e dice dove stava', function (assert) {
            var first = H.declare('x', 'Integer');
            var inElse = H.output('2');
            var test = H.when('x > 0', [H.output('1')], [inElse]);
            var program = H.program([first, test, H.output('x')]);
            var main = program.functions[0];
            var removed = Editor.removeAt(program, inElse.id);
            assert.equal(removed.block, inElse);
            assert.deepEqual(removed.slot, { ownerId: test.id, list: 'else', index: 0 });
            assert.deepEqual(test['else'], []);
            removed = Editor.removeAt(program, first.id);
            assert.deepEqual(removed.slot, { ownerId: main.id, list: 'body', index: 0 });
            assert.deepEqual(kinds(main.body), ['if', 'output']);
        });

        T.test('if e cicli si cancellano con tutto il contenuto', function (assert) {
            var inner = H.loop('i < 3', [H.assign('i', 'i + 1'), H.output('i')]);
            var test = H.when('x', [inner], [H.output('0')]);
            var program = H.program([test, H.output('fine')]);
            assert.equal(Editor.countInside(test), 4);
            assert.equal(Editor.countInside(inner), 2);
            assert.equal(Editor.countInside(test['else'][0]), 0);
            Editor.removeAt(program, test.id);
            assert.deepEqual(kinds(program.functions[0].body), ['output']);
            assert.equal(Model.findById(program, inner.id), null, 'il contenuto non resta nel programma');
            assert.equal(OnoFlow.StaticCheck.check(program).length, 0);
        });

        T.test('rimesso con insertAt torna com\'era, con gli stessi ID', function (assert) {
            var source = H.program([H.declare('x', 'Integer'), H.when('x > 0', [H.output('1')], [H.output('2')]), H.output('x')]);
            var before = OnoFlow.Format.exportFprg(source);
            var test = source.functions[0].body[1];
            var ids = [test.id, test.then[0].id, test['else'][0].id];
            var removed = Editor.removeAt(source, test.id);
            assert.notEqual(OnoFlow.Format.exportFprg(source), before);
            Editor.insertAt(source, removed.slot, removed.block);
            assert.equal(OnoFlow.Format.exportFprg(source), before);
            var back = source.functions[0].body[1];
            assert.deepEqual([back.id, back.then[0].id, back['else'][0].id], ids);
        });

        T.test('si cancella solo in Main, e solo un blocco', function (assert) {
            var other = H.fn('Doppio', 'Integer', 'r', [['n', 'Integer']], [H.assign('r', 'n * 2')]);
            var program = H.program([H.output('1')], [other]);
            assert.throws(function () { Editor.removeAt(program, other.body[0].id); }, RangeError);
            assert.throws(function () { Editor.removeAt(program, program.functions[0].id); }, RangeError, 'non una funzione');
            assert.throws(function () { Editor.removeAt(program, 'n-nessuno'); }, RangeError);
            assert.equal(other.body.length, 1);
            assert.equal(program.functions[0].body.length, 1);
        });
    });

    T.suite('Editor › punti di inserimento e selezione nel disegno (DEC-063, FR-MOB-04)', function () {
        var measurer = Renderer.createMeasurer(document);

        function draw(program) {
            var container = document.createElement('div');
            var view = Renderer.render(container, program, {
                t: t,
                measurer: measurer,
                editable: function (functionId) { return Editor.canEdit(program, functionId); },
                describeSlot: function (slot) { return 'punto ' + slot.list + ' ' + slot.index; }
            });
            return { container: container, view: view };
        }

        T.test('un punto per freccia, solo in Main, raggiungibile da tastiera', function (assert) {
            var test = H.when('x', [H.output('1')], []);
            var other = H.fn('Doppio', 'Integer', 'r', [['n', 'Integer']], [H.assign('r', 'n * 2')]);
            var program = H.program([test], [other]);
            var drawn = draw(program);
            var points = drawn.container.querySelectorAll('[data-slot]');
            assert.equal(points.length, 2 + 2 + 1, 'Main: 2; ramo Vero: 2; ramo Falso: 1');
            assert.equal(drawn.view.slots.length, points.length);
            drawn.view.slots.forEach(function (slot) {
                assert.equal(slot.functionId, program.functions[0].id, 'nessun punto nell\'altra funzione');
            });
            assert.equal(points[0].getAttribute('tabindex'), '0');
            assert.equal(points[0].getAttribute('role'), 'button');
            assert.equal(points[0].getAttribute('aria-label'), 'punto body 0');
        });

        T.test('si selezionano solo i blocchi di Main', function (assert) {
            var mine = H.output('1');
            var other = H.fn('Doppio', 'Integer', 'r', [], [H.assign('r', '2')]);
            var program = H.program([mine], [other]);
            var drawn = draw(program);
            var group = function (id) { return drawn.container.querySelector('[data-id="' + id + '"]'); };
            assert.isTrue(group(mine.id).classList.contains('is-selectable'));
            assert.equal(group(mine.id).getAttribute('tabindex'), '0');
            assert.isFalse(group(other.body[0].id).classList.contains('is-selectable'));
            assert.isFalse(group(program.functions[0].id).classList.contains('is-selectable'), 'Inizio non si seleziona');

            drawn.view.setSelected(mine.id);
            assert.isTrue(group(mine.id).classList.contains('is-selected'));
            assert.equal(group(mine.id).getAttribute('aria-pressed'), 'true');
            assert.equal(drawn.container.querySelectorAll('.dg-selected').length, 1);
            drawn.view.setSelected(other.body[0].id);
            assert.equal(drawn.container.querySelectorAll('.is-selected, .dg-selected').length, 0, 'fuori da Main: nessuna selezione');
            drawn.view.setSelected(mine.id);
            drawn.view.setSelected(null);
            assert.equal(drawn.container.querySelectorAll('.is-selected, .dg-selected').length, 0);
        });

        T.test('il tocco trova blocchi e punti, con un\'area che non dipende dal disegno', function (assert) {
            var target = H.output('1');
            var drawn = draw(H.program([target]));
            var box = drawn.view.nodeBox(target.id);
            assert.deepEqual(drawn.view.hitTest({ x: box.x + box.width / 2, y: box.y + box.height / 2 }, 22), { block: target.id });
            var point = drawn.view.slotBox(1);
            var center = { x: point.x + point.width / 2, y: point.y + point.height / 2 };
            assert.deepEqual(drawn.view.hitTest({ x: center.x + 15, y: center.y }, 22), { slot: 1 }, 'vicino al punto');
            assert.equal(drawn.view.hitTest({ x: center.x + 30, y: center.y }, 22), null, 'troppo lontano');
            assert.deepEqual(drawn.view.hitTest({ x: center.x + 30, y: center.y }, 44), { slot: 1 }, 'a metà zoom il raggio raddoppia');
        });
    });

    T.suite('Editor › menu dei blocchi (FR-EDIT-01, B1)', function () {
        function menu() {
            var host = document.createElement('div');
            host.style.cssText = 'position:relative;width:600px;height:400px';
            document.body.appendChild(host);
            var chosen = [];
            var created = OnoFlow.BlockMenu.create(host, { t: t, onChoose: function (kind) { chosen.push(kind); } });
            return { host: host, menu: created, chosen: chosen };
        }

        function anchor() {
            return { left: 10, right: 30, top: 10, bottom: 30, width: 20, height: 20 };
        }

        T.test('otto voci con forma e nome, nell\'ordine dell\'editor', function (assert) {
            var m = menu();
            try {
                var items = m.host.querySelectorAll('[role="menuitem"]');
                assert.equal(items.length, 8);
                assert.equal(items[4].getAttribute('data-kind'), 'if');
                assert.equal(items[4].textContent, t('block.name.if'));
                assert.isTrue(items[0].querySelector('svg.block-icon .dg-block--declare') !== null, 'forma e tinta del tipo');
            } finally {
                document.body.removeChild(m.host);
            }
        });

        T.test('una scelta chiude il menu e la comunica', function (assert) {
            var m = menu();
            try {
                m.menu.open(anchor(), {});
                assert.isTrue(m.menu.isOpen());
                assert.equal(document.activeElement.getAttribute('data-kind'), 'declare', 'il focus va sulla prima voce');
                m.host.querySelector('[data-kind="while"]').click();
                assert.deepEqual(m.chosen, ['while']);
                assert.isFalse(m.menu.isOpen());
            } finally {
                document.body.removeChild(m.host);
            }
        });

        T.test('tastiera: frecce, Esc, e il focus torna da dove si era partiti', function (assert) {
            var m = menu();
            var origin = document.createElement('button');
            m.host.appendChild(origin);
            try {
                m.menu.open(anchor(), { returnFocus: origin });
                var key = function (name) {
                    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
                };
                key('ArrowDown');
                assert.equal(document.activeElement.getAttribute('data-kind'), 'assign');
                key('ArrowUp');
                key('ArrowUp');
                assert.equal(document.activeElement.getAttribute('data-kind'), 'for', 'dalla prima si torna all\'ultima');
                key('Escape');
                assert.isFalse(m.menu.isOpen());
                assert.equal(document.activeElement, origin);
                assert.deepEqual(m.chosen, []);
            } finally {
                document.body.removeChild(m.host);
            }
        });

        T.test('sul telefono è un pannello in basso, sul computer accanto al punto', function (assert) {
            var m = menu();
            try {
                m.menu.open(anchor(), { sheet: true });
                assert.isTrue(m.menu.element.classList.contains('block-menu--sheet'));
                m.menu.close();
                m.menu.open(anchor(), { sheet: false });
                assert.isFalse(m.menu.element.classList.contains('block-menu--sheet'));
                assert.isTrue(m.menu.element.style.left !== '', 'posizionato vicino all\'ancora');
            } finally {
                document.body.removeChild(m.host);
            }
        });
    });
})();
