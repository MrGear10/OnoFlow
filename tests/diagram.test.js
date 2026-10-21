/*
 * OnoFlow — test del diagramma disegnato (passo 7): disposizione, disegno SVG, elenco degli
 * errori, zoom e inquadratura.
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*, js/i18n/*, js/ui/*, js/examples/*.
 * La disposizione si prova con una misura finta dei testi (10 px per carattere), così le
 * coordinate attese sono note; il disegno usa la misura vera in un SVG nascosto.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var OnoFlow = window.OnoFlow;
    var Model = OnoFlow.Model;
    var Layout = OnoFlow.DiagramLayout;
    var Renderer = OnoFlow.DiagramRenderer;
    var Viewport = OnoFlow.DiagramViewport;
    var BlockText = OnoFlow.BlockText;
    var t = OnoFlow.Localization.t;
    var formatError = OnoFlow.Localization.formatError;

    var S = 20; // quadretto della disposizione di prova

    function fakeMeasure(text) {
        return text.length * 10;
    }

    function lay(program) {
        return Layout.layout(program, { t: t, measure: fakeMeasure, square: S, fontSize: 18 });
    }

    function shapes(result) {
        return result.items.filter(function (item) { return item.type === 'shape'; });
    }

    function shapeOf(result, id) {
        return shapes(result).filter(function (item) { return item.id === id; })[0];
    }

    function center(item) {
        return item.x + item.width / 2;
    }

    function overlap(a, b) {
        return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    }

    /* Nessuna forma si sovrappone a un'altra e tutto sta dentro il disegno. */
    function assertTidy(assert, result) {
        var all = shapes(result);
        for (var i = 0; i < all.length; i++) {
            var item = all[i];
            assert.isTrue(item.x >= 0 && item.y >= 0 && item.x + item.width <= result.width + 1e-6 &&
                item.y + item.height <= result.height + 1e-6, 'forma dentro il disegno: ' + (item.id || item.color));
            for (var j = i + 1; j < all.length; j++) {
                assert.isFalse(overlap(item, all[j]), 'forme sovrapposte: ' + (item.id || item.color) + ' e ' + (all[j].id || all[j].color));
            }
        }
        result.items.filter(function (entry) { return entry.type === 'line'; }).forEach(function (entry) {
            entry.points.forEach(function (point) {
                assert.isTrue(point[0] >= 0 && point[0] <= result.width + 1e-6 && point[1] >= 0 && point[1] <= result.height + 1e-6,
                    'linea dentro il disegno');
            });
        });
    }

    /* Programma con un po' di tutto, annidato. */
    function nestedProgram() {
        var inner = H.when('x > 10', [H.output('"grande"')], [H.when('x > 5', [H.output('"medio"')], [])]);
        return H.program([
            H.declare('x, i', 'Integer'),
            H.input('x'),
            H.forLoop('i', '1', 'x', [inner, H.assign('x', 'x - 1')]),
            H.loop('x > 0', [H.repeat([H.assign('x', 'x - 2')], 'x > 3')]),
            H.comment('fine')
        ]);
    }

    T.suite('Diagramma › disposizione (FR-VIEW-01)', function () {
        T.test('ogni blocco ha la sua forma e il suo rettangolo; la funzione è il suo Inizio', function (assert) {
            var program = nestedProgram();
            var result = lay(program);
            Model.walk(program, function (target) {
                assert.isTrue(shapeOf(result, target.id) !== undefined, 'forma di ' + target.id);
                assert.isTrue(result.nodes[target.id] !== undefined, 'rettangolo di ' + target.id);
            });
            var main = program.functions[0];
            var start = shapeOf(result, main.id);
            assert.equal(start.shape, 'terminal');
            assert.equal(start.text.segments[0].text, t('ui.diagram.start'));
        });

        T.test('forma e tinta fisse per tipo', function (assert) {
            var program = nestedProgram();
            var result = lay(program);
            var seen = {};
            Model.walk(program, function (target) {
                var item = shapeOf(result, target.id);
                seen[target.kind] = item.shape + '/' + item.color;
            });
            assert.deepEqual(seen, {
                declare: 'declare/declare', input: 'parallelogram/input', 'for': 'hexagon/loop', 'if': 'diamond/if',
                output: 'parallelogram/output', assign: 'rect/assign', 'while': 'hexagon/loop', 'do': 'hexagon/loop',
                comment: 'comment/comment'
            });
        });

        T.test('una sequenza sta in colonna su un asse, con una freccia di due quadretti tra i blocchi', function (assert) {
            var first = H.declare('x', 'Integer');
            var second = H.assign('x', '1');
            var third = H.output('x');
            var program = H.program([first, second, third]);
            var result = lay(program);
            var items = [shapeOf(result, program.functions[0].id), shapeOf(result, first.id), shapeOf(result, second.id), shapeOf(result, third.id)];
            for (var i = 1; i < items.length; i++) {
                assert.equal(center(items[i]), center(items[0]), 'stesso asse');
                assert.equal(items[i].y - (items[i - 1].y + items[i - 1].height), 2 * S, 'freccia di due quadretti');
            }
            var arrows = result.items.filter(function (item) { return item.type === 'line' && item.arrow; });
            assert.equal(arrows.length, 4, 'una freccia verso ogni blocco e verso Fine');
        });

        T.test('le frecce dove si inserirà un blocco: n + 1 per una sequenza di n blocchi', function (assert) {
            var whenTrue = H.output('1');
            var test = H.when('x > 0', [whenTrue], []);
            var program = H.program([H.declare('x', 'Integer'), test]);
            var slots = lay(program).slots;
            var mainId = program.functions[0].id;
            function count(owner, list) {
                return slots.filter(function (slot) { return slot.ownerId === owner && slot.list === list; }).length;
            }
            assert.equal(count(mainId, 'body'), 3);
            assert.equal(count(test.id, 'then'), 2);
            assert.equal(count(test.id, 'else'), 1, 'anche un ramo vuoto ha il suo punto');
            slots.forEach(function (slot) {
                assert.equal(slot.y2 - slot.y1, 2 * S);
            });
        });

        T.test('if: Falso a sinistra, Vero a destra, riuniti sotto il rombo (DEC-057)', function (assert) {
            var yes = H.output('"si"');
            var no = H.output('"no"');
            var test = H.when('x > 0', [yes], [no]);
            var result = lay(H.program([test]));
            var diamond = shapeOf(result, test.id);
            assert.equal(diamond.shape, 'diamond');
            assert.isTrue(center(shapeOf(result, yes.id)) > center(diamond) + diamond.width / 2 - 1e-6, 'Vero a destra del rombo');
            assert.isTrue(center(shapeOf(result, no.id)) < center(diamond) - diamond.width / 2 + 1e-6, 'Falso a sinistra del rombo');
            var labels = result.items.filter(function (item) { return item.type === 'label'; });
            var vero = labels.filter(function (item) { return item.text === t('ui.diagram.then'); })[0];
            var falso = labels.filter(function (item) { return item.text === t('ui.diagram.else'); })[0];
            assert.isTrue(vero.x > center(diamond) && falso.x < center(diamond), 'etichette dalla parte giusta');
            var junctions = result.items.filter(function (item) { return item.type === 'junction'; });
            assert.equal(junctions.length, 1);
            assert.equal(junctions[0].x, center(diamond), 'i rami si riuniscono sull\'asse');
            assert.isTrue(junctions[0].y > shapeOf(result, yes.id).y + shapeOf(result, yes.id).height, 'sotto i rami');
        });

        T.test('if annidati: i rami si allargano senza sovrapporsi', function (assert) {
            function deep() {
                return H.when('a', [H.output('"aaaaaaaaaaaaaaaaaaaa"')], [H.output('"bbbbbbbbbbbbbbbbbbbbbbbb"')]);
            }
            var program = H.program([H.when('x', [deep(), H.loop('k', [deep()])], [H.when('y', [deep()], [H.output('"cccccccccccc"')])])]);
            assertTidy(assert, lay(program));
        });

        T.test('while: corpo sotto l\'esagono, ritorno a sinistra con la freccia, uscita a destra', function (assert) {
            var body = H.assign('x', 'x - 1');
            var loop = H.loop('x > 0', [body]);
            var result = lay(H.program([loop]));
            var hexagon = shapeOf(result, loop.id);
            var inside = shapeOf(result, body.id);
            assert.equal(hexagon.shape, 'hexagon');
            assert.isTrue(inside.y > hexagon.y + hexagon.height, 'corpo sotto la condizione');
            var back = result.items.filter(function (item) {
                var last = item.type === 'line' && item.points[item.points.length - 1];
                return last && last[0] === hexagon.x && last[1] === hexagon.y + hexagon.height / 2;
            })[0];
            assert.isTrue(back !== undefined && back.arrow, 'il ritorno entra nella punta sinistra con una freccia');
            assert.isTrue(back.points[1][0] < inside.x, 'il ritorno passa a sinistra del corpo');
            var exit = result.items.filter(function (item) {
                return item.type === 'line' && item.points[0][0] === hexagon.x + hexagon.width;
            })[0];
            assert.isTrue(exit.points[1][0] > inside.x + inside.width, 'l\'uscita passa a destra del corpo');
        });

        T.test('do: corpo in alto, condizione in fondo con il while, ritorno all\'inizio', function (assert) {
            var body = H.output('x');
            var loop = H.repeat([body], 'x < 3');
            var result = lay(H.program([loop]));
            var hexagon = shapeOf(result, loop.id);
            assert.isTrue(hexagon.y > shapeOf(result, body.id).y, 'condizione sotto il corpo');
            var text = hexagon.text.segments.map(function (segment) { return segment.text; }).join('');
            assert.equal(text, BlockText.plainText(loop, t, 'tail'));
            var junction = result.items.filter(function (item) { return item.type === 'junction'; })[0];
            assert.isTrue(junction.y < shapeOf(result, body.id).y, 'il ritorno arriva sopra il corpo');
        });

        T.test('il testo resta esattamente come è scritto (FR-VIEW-05)', function (assert) {
            var odd = H.assign('v[ i ]', '  a+b  ');
            var result = lay(H.program([odd]));
            var item = shapeOf(result, odd.id);
            assert.equal(item.text.segments.map(function (segment) { return segment.text; }).join(''), BlockText.plainText(odd, t, 'head'));
            var field = item.text.segments.filter(function (segment) { return segment.field === 'expression'; })[0];
            assert.equal(field.text, '  a+b  ');
            assert.equal(field.width, 70, 'larghezza dalla misura, spazi compresi');
        });

        T.test('larghezze a multipli di due quadretti: gli assi cadono sulle righe del foglio', function (assert) {
            var result = lay(nestedProgram());
            shapes(result).forEach(function (item) {
                assert.equal(item.width % (2 * S), 0, 'larghezza di ' + (item.id || item.color));
                assert.equal(center(item) % S, 0, 'asse di ' + (item.id || item.color));
            });
        });

        T.test('un testo lungo allarga il blocco invece di uscirne', function (assert) {
            var long = H.output('"' + new Array(60).join('x') + '"');
            var item = shapeOf(lay(H.program([long])), long.id);
            assert.isTrue(item.text.x >= item.x + item.inset, 'il testo comincia dentro la forma');
            var textWidth = item.text.segments.reduce(function (sum, segment) { return sum + segment.width; }, 0);
            assert.isTrue(item.text.x + textWidth <= item.x + item.width - item.inset, 'e finisce dentro');
        });

        T.test('il programma dell\'Appendice A si dispone in ordine', function (assert) {
            var program = OnoFlow.Format.importFprg(OnoFlow.Examples.byId('somma-massimo-minimo').text).program;
            assertTidy(assert, lay(program));
        });

        T.test('più funzioni: una sotto l\'altra, ognuna con il suo nome', function (assert) {
            var program = H.program([H.output('Doppio(2)')], [H.fn('Doppio', 'Integer', 'r', [['n', 'Integer']], [H.assign('r', 'n * 2')])]);
            var result = lay(program);
            var titles = result.items.filter(function (item) { return item.type === 'title'; });
            assert.deepEqual(titles.map(function (item) { return item.text; }),
                [t('ui.diagram.function', { name: 'Main' }), t('ui.diagram.function', { name: 'Doppio' })]);
            assert.isTrue(titles[1].y > shapeOf(result, program.functions[0].id).y, 'la seconda sta sotto');
            assertTidy(assert, result);
        });
    });

    T.suite('Diagramma › disegno SVG (FR-VIEW-02, FR-VIEW-03)', function () {
        var measurer = Renderer.createMeasurer(document);

        function draw(program) {
            var container = document.createElement('div');
            var view = Renderer.render(container, program, { t: t, measurer: measurer });
            return { container: container, view: view };
        }

        function group(drawn, id) {
            return drawn.container.querySelector('[data-id="' + id + '"]');
        }

        T.test('ogni blocco è un gruppo con il suo ID, anche dentro if e cicli', function (assert) {
            var program = nestedProgram();
            var drawn = draw(program);
            Model.walk(program, function (target) {
                assert.isTrue(group(drawn, target.id) !== null, 'gruppo di ' + target.id);
                assert.isTrue(drawn.view.hasNode(target.id));
            });
            assert.isTrue(drawn.container.querySelector('svg.diagram') !== null);
        });

        T.test('il testo del blocco è quello scritto, con i campi segnati', function (assert) {
            var target = H.assign('somma', 'somma + n');
            var drawn = draw(H.program([target]));
            var node = group(drawn, target.id);
            assert.equal(node.querySelector('text').textContent, 'somma = somma + n');
            assert.equal(node.querySelector('[data-field="expression"]').textContent, 'somma + n');
        });

        T.test('i testi del file entrano come testo, mai come HTML o SVG (NFR-SEC-01)', function (assert) {
            var drawn = draw(H.program([H.output('"<b>x</b><script>y</script>"')]));
            assert.equal(drawn.container.querySelector('b'), null);
            assert.equal(drawn.container.querySelector('script'), null);
            assert.isTrue(drawn.container.textContent.indexOf('"<b>x</b><script>y</script>"') !== -1);
        });

        T.test('una tinta per tipo, nelle classi del gruppo', function (assert) {
            var loop = H.forLoop('i', '1', '3', []);
            var drawn = draw(H.program([loop]));
            assert.isTrue(group(drawn, loop.id).classList.contains('dg-block--loop'));
        });

        T.test('evidenziatore su un solo blocco alla volta', function (assert) {
            var first = H.output('1');
            var second = H.output('2');
            var drawn = draw(H.program([first, second]));
            drawn.view.setRunning(first.id);
            drawn.view.setRunning(second.id);
            var running = drawn.container.querySelectorAll('.is-running');
            assert.equal(running.length, 1);
            assert.equal(running[0].getAttribute('data-id'), second.id);
            drawn.view.setRunning(null);
            assert.equal(drawn.container.querySelectorAll('.is-running').length, 0);
        });

        T.test('penna rossa: cerchio, numero e onda sotto il punto esatto; poi si toglie', function (assert) {
            var wrong = H.assign('x', 'a + 2,5');
            var program = H.program([wrong]);
            var drawn = draw(program);
            drawn.view.setErrors(OnoFlow.StaticCheck.check(program));
            assert.isTrue(group(drawn, wrong.id).classList.contains('is-error'));
            assert.equal(drawn.container.querySelectorAll('.dg-ring').length, 1);
            assert.equal(drawn.container.querySelector('.dg-badge text').textContent, '1');
            var waveBox = drawn.container.querySelector('.dg-wave');
            assert.isTrue(waveBox !== null, 'onda presente');
            assert.equal(group(drawn, wrong.id).querySelector('[data-field="expression"]').textContent, 'a + 2,5', 'il testo non cambia');

            drawn.view.setErrors([]);
            assert.isFalse(group(drawn, wrong.id).classList.contains('is-error'));
            assert.equal(drawn.container.querySelectorAll('.dg-ring, .dg-badge, .dg-wave, .dg-point').length, 0);
        });

        T.test('l\'onda sta sotto il pezzo sbagliato, non sotto tutto il campo', function (assert) {
            var wrong = H.assign('x', 'a + 2,5');
            var program = H.program([wrong]);
            var container = document.createElement('div');
            document.body.appendChild(container); // serve la misura vera dei testi
            try {
                var view = Renderer.render(container, program, { t: t, measurer: measurer });
                view.setErrors(OnoFlow.StaticCheck.check(program));
                var field = container.querySelector('[data-id="' + wrong.id + '"] [data-field="expression"]');
                var fieldBox = field.getBBox();
                var waveBox = container.querySelector('.dg-wave').getBBox();
                var prefix = measurer.measure('a + ', 'code');
                assert.isTrue(Math.abs(waveBox.x - (fieldBox.x + prefix)) < 2, 'comincia sotto "2,5"');
                assert.isTrue(waveBox.x + waveBox.width <= fieldBox.x + fieldBox.width + 3, 'finisce con il campo');
                assert.isTrue(waveBox.y > fieldBox.y + fieldBox.height * 0.6, 'sta sotto il testo');
            } finally {
                document.body.removeChild(container);
            }
        });

        T.test('un errore alla fine del campo ha comunque il suo segno', function (assert) {
            var wrong = H.output('"a" +');
            var program = H.program([wrong]);
            var drawn = draw(program);
            drawn.view.setErrors(OnoFlow.StaticCheck.check(program));
            assert.isTrue(drawn.container.querySelector('.dg-point') !== null);
        });

        T.test('più errori sullo stesso blocco: un cerchio, i numeri in ordine', function (assert) {
            var other = H.output('y');
            var target = H.output('x');
            var drawn = draw(H.program([other, target]));
            drawn.view.setErrors([
                { code: 'ERR_DIVISION_BY_ZERO', params: {}, nodeId: target.id },
                { code: 'ERR_STOPPED', params: {}, nodeId: other.id },
                { code: 'ERR_STOPPED', params: {}, nodeId: target.id }
            ]);
            assert.equal(drawn.container.querySelectorAll('.dg-ring').length, 2);
            var numbers = Array.prototype.map.call(drawn.container.querySelectorAll('.dg-badge'), function (badge) {
                return badge.getAttribute('data-error');
            });
            assert.deepEqual(numbers, ['1', '2', '3']);
        });

        T.test('un errore della funzione si segna sul suo Inizio', function (assert) {
            var program = H.program([]);
            var drawn = draw(program);
            drawn.view.setErrors([{ code: 'ERR_STOPPED', params: {}, nodeId: program.functions[0].id }]);
            assert.isTrue(group(drawn, program.functions[0].id).classList.contains('is-error'));
        });

        T.test('diagramma vuoto: Inizio, Fine e il messaggio', function (assert) {
            var drawn = draw(Model.createEmptyProgram());
            assert.equal(drawn.container.querySelectorAll('.dg-block--terminal').length, 2);
            assert.equal(drawn.container.querySelector('.diagram-empty').textContent, t('ui.diagram.empty'));
        });

        T.test('il rettangolo di un blocco tiene conto del margine del disegno', function (assert) {
            var target = H.output('1');
            var drawn = draw(H.program([target]));
            var box = drawn.view.nodeBox(target.id);
            assert.isTrue(box.x > 0 && box.y > 0 && box.x + box.width < drawn.view.size.width && box.y + box.height < drawn.view.size.height);
            assert.equal(drawn.view.nodeBox('n-inesistente'), null);
        });
    });

    T.suite('Diagramma › elenco degli errori (DEC-057)', function () {
        function list(errors, options) {
            var container = document.createElement('div');
            var selected = [];
            OnoFlow.DiagramErrors.render(container, errors, Object.assign({
                t: t,
                formatError: formatError,
                describeBlock: function (id) { return 'blocco ' + id; },
                formatCount: String,
                onSelect: function (id) { selected.push(id); }
            }, options || {}));
            return { container: container, selected: selected };
        }

        T.test('numeri, messaggi e testo del blocco, nell\'ordine degli errori', function (assert) {
            var shown = list([
                { code: 'ERR_DIVISION_BY_ZERO', params: {}, nodeId: 'n1' },
                { code: 'ERR_STOPPED', params: {}, nodeId: 'n2' }
            ]);
            var entries = shown.container.querySelectorAll('.diagram-error');
            assert.equal(entries.length, 2);
            assert.equal(entries[0].querySelector('.diagram-error-number').textContent, '1');
            assert.equal(entries[1].querySelector('.diagram-error-message').textContent, t('ERR_STOPPED'));
            assert.equal(entries[1].querySelector('.diagram-error-block').textContent, 'blocco n2');
            assert.equal(shown.container.querySelector('.diagram-errors-summary').textContent, t('ui.diagram.errors', { count: '2' }));
        });

        T.test('un tocco su un messaggio inquadra il suo blocco', function (assert) {
            var shown = list([{ code: 'ERR_STOPPED', params: {}, nodeId: 'n7' }]);
            shown.container.querySelector('button').click();
            assert.deepEqual(shown.selected, ['n7']);
        });

        T.test('intestazione per un errore solo e per un errore durante l\'esecuzione', function (assert) {
            var one = [{ code: 'ERR_STOPPED', params: {}, nodeId: 'n1' }];
            assert.equal(list(one).container.querySelector('p').textContent, t('ui.diagram.errorsOne'));
            assert.equal(list(one, { runtime: true }).container.querySelector('p').textContent, t('ui.diagram.runtimeError'));
        });

        T.test('senza errori l\'elenco si nasconde', function (assert) {
            var shown = list([]);
            assert.isTrue(shown.container.hidden);
            assert.equal(shown.container.childNodes.length, 0);
        });

        T.test('un errore senza blocco resta nell\'elenco, senza pulsante', function (assert) {
            var shown = list([{ code: 'ERR_STOPPED', params: {} }]);
            assert.equal(shown.container.querySelectorAll('.diagram-error').length, 1);
            assert.equal(shown.container.querySelector('button'), null);
        });
    });

    T.suite('Diagramma › zoom e inquadratura (FR-MOB-06, FR-MOB-03)', function () {
        T.test('limiti dello zoom', function (assert) {
            assert.equal(Viewport.clampZoom(0.01), Viewport.MIN_ZOOM);
            assert.equal(Viewport.clampZoom(99), Viewport.MAX_ZOOM);
            assert.equal(Viewport.clampZoom(1.5), 1.5);
        });

        T.test('adatta allo schermo: entra tutto, al massimo al 200%', function (assert) {
            assert.equal(Viewport.fitZoom({ width: 1000, height: 500 }, { width: 500, height: 500 }), 0.5, 'limita la larghezza');
            assert.equal(Viewport.fitZoom({ width: 100, height: 1000 }, { width: 500, height: 500 }), 0.5, 'limita l\'altezza');
            assert.equal(Viewport.fitZoom({ width: 100, height: 100 }, { width: 1000, height: 1000 }), 2, 'un diagramma piccolo non diventa enorme');
            assert.equal(Viewport.fitZoom({ width: 100000, height: 100 }, { width: 100, height: 100 }), Viewport.MIN_ZOOM);
        });

        T.test('quadretti meno fitti quando lo zoom li renderebbe rumore', function (assert) {
            assert.equal(Viewport.gridFactor(20, 1), 1);
            assert.equal(Viewport.gridFactor(20, 0.3), 2);
            assert.equal(Viewport.gridFactor(20, 0.25), 2);
            assert.equal(Viewport.gridFactor(10, 0.25), 4);
            assert.equal(Viewport.gridFactor(20, 0.1), 4, 'al minimo, una riga ogni 4 quadretti');
        });

        /* Foglio vero nella pagina, piccolo, con un diagramma lungo. */
        function sheetWith(program, run) {
            var scroller = document.createElement('div');
            scroller.style.cssText = 'position:absolute;left:0;top:0;width:240px;height:200px;overflow:auto';
            var content = document.createElement('div');
            content.style.cssText = 'padding:10px;width:max-content';
            var host = document.createElement('div');
            content.appendChild(host);
            scroller.appendChild(content);
            document.body.appendChild(scroller);
            var changes = [];
            try {
                var view = Renderer.render(host, program, { t: t, measurer: Renderer.createMeasurer(document) });
                var viewport = Viewport.create(scroller, { content: content, onChange: function (zoom) { changes.push(zoom); } });
                viewport.attach(view);
                run(viewport, view, scroller, changes);
            } finally {
                document.body.removeChild(scroller);
            }
        }

        function longProgram() {
            var blocks = [];
            for (var i = 0; i < 12; i++) {
                blocks.push(H.output(String(i)));
            }
            return H.program(blocks);
        }

        T.test('lo zoom cambia la misura del disegno, non quella della pagina', function (assert) {
            sheetWith(longProgram(), function (viewport, view, scroller, changes) {
                var before = view.element.getBoundingClientRect().width;
                viewport.setZoom(2);
                assert.isTrue(Math.abs(view.element.getBoundingClientRect().width - 2 * before) < 1, 'il disegno raddoppia');
                assert.equal(scroller.style.getPropertyValue('--zoom'), '2');
                assert.equal(changes[changes.length - 1], 2, 'la barra dello zoom viene avvisata');
                viewport.zoomIn();
                viewport.zoomIn();
                assert.equal(viewport.zoom(), Viewport.MAX_ZOOM, 'non oltre il massimo');
                viewport.reset();
                assert.equal(viewport.zoom(), 1);
                assert.equal(scroller.scrollTop, 0, 'riparte dall\'inizio');
            });
        });

        T.test('lo zoom tiene fermo il punto indicato', function (assert) {
            sheetWith(longProgram(), function (viewport, view, scroller) {
                var box = scroller.getBoundingClientRect();
                var anchor = { clientX: box.left + 100, clientY: box.top + 120 };
                scroller.scrollTop = 150;
                var svgBefore = view.element.getBoundingClientRect();
                var pointBefore = (anchor.clientY - svgBefore.top);
                viewport.setZoom(1.5, anchor);
                var svgAfter = view.element.getBoundingClientRect();
                assert.isTrue(Math.abs((anchor.clientY - svgAfter.top) - pointBefore * 1.5) < 2, 'stesso punto del disegno sotto il dito');
            });
        });

        T.test('inquadratura: il blocco lontano arriva al centro; uno già visibile non si sposta', function (assert) {
            var program = longProgram();
            var last = program.functions[0].body[11];
            var first = program.functions[0].body[0];
            sheetWith(program, function (viewport, view, scroller) {
                assert.isTrue(viewport.reveal(view.nodeBox(last.id)));
                var block = view.element.querySelector('[data-id="' + last.id + '"]').getBoundingClientRect();
                var visible = scroller.getBoundingClientRect();
                var middle = block.top + block.height / 2;
                assert.isTrue(Math.abs(middle - (visible.top + scroller.clientHeight / 2)) < 2, 'al centro del foglio');
                var top = scroller.scrollTop;
                var neighbour = program.functions[0].body[10]; // visibile, ma non al centro
                viewport.reveal(view.nodeBox(neighbour.id), { quiet: true });
                assert.equal(scroller.scrollTop, top, 'già visibile: non si sposta');
                viewport.reveal(view.nodeBox(first.id), { quiet: true });
                assert.isTrue(scroller.scrollTop < top, 'il primo blocco torna in vista');
            });
        });

        T.test('con il foglio nascosto l\'inquadratura si rimanda', function (assert) {
            sheetWith(longProgram(), function (viewport, view, scroller) {
                scroller.style.display = 'none';
                assert.isFalse(viewport.reveal(view.nodeBox(view.element.querySelector('[data-id]').getAttribute('data-id'))));
            });
        });
    });
})();
