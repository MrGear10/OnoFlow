/*
 * OnoFlow — test dei moduli dell'interfaccia (passo 6): testo dei blocchi, schema del
 * diagramma, console, copia di sessione, nome del file.
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*, js/i18n/*, js/ui/*, js/app.js.
 * I moduli che disegnano lavorano su elementi staccati dalla pagina.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var OnoFlow = window.OnoFlow;
    var Model = OnoFlow.Model;
    var BlockText = OnoFlow.BlockText;
    var t = OnoFlow.Localization.t;
    var formatError = OnoFlow.Localization.formatError;

    function block(kind, values) {
        return Model.createBlock(kind, values);
    }

    function text(target) {
        return BlockText.plainText(target, t);
    }

    T.suite('Interfaccia › testo dei blocchi (FR-VIEW-05)', function () {
        T.test('ogni tipo di blocco ha il suo modello nel catalogo', function (assert) {
            Model.BLOCK_KINDS.forEach(function (kind) {
                var sample = block(kind, {});
                var keys = [BlockText.templateKey(sample)];
                if (kind === 'declare') {
                    keys.push('block.declare.array');
                } else if (kind === 'output') {
                    keys.push('block.output.noNewline');
                } else if (kind === 'do') {
                    keys.push('block.do.tail');
                } else if (kind === 'for') {
                    keys = ['block.for.inc', 'block.for.inc.step', 'block.for.dec', 'block.for.dec.step'];
                }
                keys.forEach(function (key) {
                    assert.notEqual(t(key), key, 'manca ' + key);
                });
            });
        });

        T.test('il testo di ogni blocco', function (assert) {
            assert.equal(text(H.declare('n, i', 'Integer')), 'Integer n, i');
            assert.equal(text(H.declare('v', 'Real', '10')), 'Real v[10]');
            assert.equal(text(H.assign('x', 'x + 1')), 'x = x + 1');
            assert.equal(text(H.input('a[i]')), 'Input a[i]');
            assert.equal(text(H.output('"ciao"')), 'Output "ciao"');
            assert.equal(text(H.output('x', false)), 'Output x (senza a capo)');
            assert.equal(text(H.when('x > 0')), 'if x > 0');
            assert.equal(text(H.loop('i < 10')), 'while i < 10');
            assert.equal(text(block('call', { expression: 'Stampa(x)' })), 'Call Stampa(x)');
            assert.equal(text(block('comment', { text: 'nota' })), '// nota');
        });

        T.test('il do si legge su due righe', function (assert) {
            var loop = block('do', { expression: 'x < 3' });
            assert.equal(BlockText.plainText(loop, t, 'head'), 'do');
            assert.equal(BlockText.plainText(loop, t, 'tail'), 'while x < 3');
        });

        T.test('for: il passo compare solo se non è 1', function (assert) {
            assert.equal(text(block('for', { variable: 'i', start: '1', end: '10' })), 'for i = 1 to 10');
            assert.equal(text(block('for', { variable: 'i', start: '1', end: '10', step: ' 1 ' })), 'for i = 1 to 10');
            assert.equal(text(block('for', { variable: 'i', start: '10', end: '1', step: '2', direction: 'dec' })),
                'for i = 10 down to 1 step 2');
            assert.equal(text(block('for', { variable: 'i', start: '10', end: '1', direction: 'dec' })), 'for i = 10 down to 1');
        });

        T.test('i campi restano come sono scritti, anche con errori', function (assert) {
            var assignment = H.assign('x', 'a  +b');
            assert.equal(text(assignment), 'x = a  +b');
            var wrong = H.assign('x', '2,5');
            var parts = BlockText.segments(wrong, t);
            var expression = parts.filter(function (part) { return part.field === 'expression'; })[0];
            assert.equal(expression.text, '2,5');
            assert.equal(expression.role, 'field');
            assert.equal(expression.error.code, 'ERR_SYNTAX_UNEXPECTED_TOKEN');
            assert.equal(parts[0].field, 'variable');
        });
    });

    T.suite('Interfaccia › schema del diagramma (FR-VIEW-02, FR-VIEW-03)', function () {
        function draw(program) {
            var container = document.createElement('div');
            var view = OnoFlow.DiagramOutline.render(container, program, { t: t, formatError: formatError });
            return { container: container, view: view };
        }

        T.test('ogni blocco ha una riga con il suo ID, anche dentro if e cicli', function (assert) {
            var inner = H.output('i');
            var branch = H.assign('x', '1');
            var program = H.program([H.loop('i < 3', [inner]), H.when('x > 0', [branch], [])]);
            var drawn = draw(program);
            Model.walk(program, function (target) {
                assert.isTrue(drawn.container.querySelector('[data-id="' + target.id + '"]') !== null, 'riga di ' + target.id);
                assert.isTrue(drawn.view.hasNode(target.id));
            });
            var row = drawn.container.querySelector('[data-id="' + inner.id + '"] .row-text');
            assert.equal(row.textContent, 'Output i');
        });

        T.test('i testi del file entrano come testo, mai come HTML (NFR-SEC-01)', function (assert) {
            var drawn = draw(H.program([H.output('"<b>x</b>"')]));
            assert.equal(drawn.container.querySelector('b'), null);
            assert.isTrue(drawn.container.textContent.indexOf('"<b>x</b>"') !== -1);
        });

        T.test('evidenziatore su un solo blocco alla volta', function (assert) {
            var first = H.output('1');
            var second = H.output('2');
            var drawn = draw(H.program([first, second]));
            drawn.view.setRunning(first.id);
            drawn.view.setRunning(second.id);
            var running = drawn.container.querySelectorAll('.is-running');
            assert.equal(running.length, 1);
            assert.equal(running[0].parentNode.getAttribute('data-id'), second.id);
            drawn.view.setRunning(null);
            assert.equal(drawn.container.querySelectorAll('.is-running').length, 0);
        });

        T.test('penna rossa sul blocco e onda sotto il punto esatto', function (assert) {
            var wrong = H.assign('x', 'a + 2,5');
            var program = H.program([wrong]);
            var drawn = draw(program);
            drawn.view.setErrors(OnoFlow.StaticCheck.check(program));
            var row = drawn.container.querySelector('[data-id="' + wrong.id + '"] > .row-line');
            assert.isTrue(row.classList.contains('is-error'));
            var wave = row.querySelector('[data-field="expression"] .pen-wave');
            assert.isTrue(wave !== null, 'sottolineatura presente');
            assert.equal(wave.textContent, '2,5', 'tutto il numero scritto con la virgola');
            assert.equal(row.querySelector('[data-field="expression"]').textContent, 'a + 2,5', 'il testo non cambia');
            assert.equal(drawn.container.querySelectorAll('.row-error').length, 1);

            drawn.view.setErrors([]);
            assert.isFalse(row.classList.contains('is-error'));
            assert.equal(drawn.container.querySelectorAll('.pen-wave, .row-error').length, 0);
            assert.equal(row.querySelector('[data-field="expression"]').textContent, 'a + 2,5');
        });

        T.test('un errore alla fine del campo ha comunque il suo segno', function (assert) {
            var wrong = H.output('"a" +');
            var program = H.program([wrong]);
            var drawn = draw(program);
            drawn.view.setErrors(OnoFlow.StaticCheck.check(program));
            assert.isTrue(drawn.container.querySelector('.pen-wave--point') !== null);
        });

        T.test('più errori sullo stesso blocco restano in ordine', function (assert) {
            var target = H.output('x');
            var drawn = draw(H.program([target]));
            drawn.view.setErrors([
                { code: 'ERR_DIVISION_BY_ZERO', params: {}, nodeId: target.id },
                { code: 'ERR_STOPPED', params: {}, nodeId: target.id }
            ]);
            var notes = drawn.container.querySelectorAll('.row-error');
            assert.equal(notes.length, 2);
            assert.equal(notes[0].textContent, t('ERR_DIVISION_BY_ZERO'));
            assert.equal(notes[1].textContent, t('ERR_STOPPED'));
        });

        T.test('diagramma vuoto: Inizio, Fine e il messaggio', function (assert) {
            var drawn = draw(Model.createEmptyProgram());
            assert.equal(drawn.container.querySelectorAll('.row--terminal').length, 2);
            assert.equal(drawn.container.querySelector('.outline-empty').textContent, t('ui.diagram.empty'));
        });

        T.test('con più funzioni compare il nome di ognuna', function (assert) {
            var program = Model.createProgram({
                functions: [Model.createFunction({ name: 'Main' }), Model.createFunction({ name: 'Doppio' })]
            });
            var names = Array.prototype.map.call(draw(program).container.querySelectorAll('.outline-function-name'),
                function (node) { return node.textContent; });
            assert.deepEqual(names, [t('ui.diagram.function', { name: 'Main' }), t('ui.diagram.function', { name: 'Doppio' })]);
        });
    });

    T.suite('Interfaccia › console (FR-CON-01…05, FR-ERR-03)', function () {
        function setup(options) {
            var log = document.createElement('div');
            var notice = document.createElement('p');
            notice.hidden = true;
            var submitted = [];
            var settings = {
                t: t,
                formatError: formatError,
                formatValue: function (value) {
                    return OnoFlow.NumberFormat.formatValue(value.type, value.value, OnoFlow.Localization.numberFormat());
                },
                describeBlock: function () { return 'Output x'; },
                onSubmitInput: function (value) { submitted.push(value); },
                onContinue: function () {},
                onStop: function () {},
                onReveal: function () {},
                trimmedNotice: notice
            };
            Object.keys(options || {}).forEach(function (key) { settings[key] = options[key]; });
            return { log: log, notice: notice, submitted: submitted, view: OnoFlow.ConsoleView.create(log, settings) };
        }

        T.test('l\'output si accumula e si disegna in un solo testo', function (assert) {
            var c = setup();
            c.view.write('a', false);
            c.view.write('b', true);
            assert.equal(c.log.textContent, '', 'niente prima di flush');
            c.view.flush();
            c.view.write('c', true);
            c.view.flush();
            assert.equal(c.log.textContent, 'ab\nc\n');
            assert.equal(c.log.childNodes.length, 1);
        });

        T.test('input in linea: il valore resta, poi si va a capo (FR-CON-02)', function (assert) {
            var c = setup();
            c.view.write('Numero? ', false);
            c.view.requestInput({ valueType: 'Integer', nodeId: 'n1', error: null });
            var field = c.log.querySelector('input');
            assert.isTrue(field !== null);
            assert.equal(field.placeholder, 'Integer');
            assert.equal(field.getAttribute('autocapitalize'), 'off');
            assert.equal(field.getAttribute('spellcheck'), 'false');
            assert.equal(c.log.lastChild.querySelector('input'), field, 'subito dopo l\'ultimo output');
            field.value = '42';
            field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            assert.deepEqual(c.submitted, ['42']);
            assert.equal(c.log.querySelector('input'), null);
            assert.equal(c.log.querySelector('.console-typed').textContent, '42');
            assert.equal(c.log.textContent, 'Numero? 42\n');
        });

        T.test('un valore non valido: messaggio e nuova richiesta (DEC-040)', function (assert) {
            var c = setup();
            c.view.requestInput({
                valueType: 'Integer', nodeId: 'n1',
                error: { code: 'ERR_INPUT_NOT_CONVERTIBLE', params: { reason: 'decimal', type: 'Integer', text: '2,5' } }
            });
            assert.equal(c.log.querySelector('.console-note--input-error').textContent,
                formatError({ code: 'ERR_INPUT_NOT_CONVERTIBLE', params: { reason: 'decimal', type: 'Integer', text: '2,5' } }));
            assert.isTrue(c.view.hasInput());
        });

        T.test('oltre il limite si tolgono le righe più vecchie, segnalandolo (FR-CON-05)', function (assert) {
            var c = setup({ maxCharacters: 50 });
            for (var i = 0; i < 12; i++) {
                c.view.write('riga ' + i, true);
                c.view.flush();
            }
            assert.isTrue(c.view.characters() <= 50, 'caratteri conservati: ' + c.view.characters());
            assert.isTrue(c.log.textContent.length <= 50);
            assert.isTrue(/riga 11\n$/.test(c.log.textContent), 'resta il testo più recente');
            assert.isFalse(c.notice.hidden);
            c.view.clear();
            assert.isTrue(c.notice.hidden);
            assert.equal(c.log.textContent, '');
        });

        T.test('il limite vale anche per i valori digitati', function (assert) {
            var c = setup({ maxCharacters: 10 });
            c.view.write('abc', false);
            c.view.flush();
            c.view.requestInput({ valueType: 'String', nodeId: 'n1', error: null });
            var field = c.log.querySelector('input');
            field.value = 'un testo molto lungo';
            field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            assert.isTrue(c.view.characters() <= 10, 'caratteri conservati: ' + c.view.characters());
            var full = 'abcun testo molto lungo\n';
            assert.equal(full.slice(full.length - c.log.textContent.length), c.log.textContent, 'resta la parte più recente');
        });

        T.test('errore di runtime con blocco e variabili (FR-ERR-01, FR-ERR-03)', function (assert) {
            var c = setup();
            var elements = new Array(3); // l'elemento 1 non è mai stato assegnato: è un buco
            elements[0] = 4;
            elements[2] = 6;
            c.view.showRuntimeError({
                code: 'ERR_DIVISION_BY_ZERO', params: {}, nodeId: 'n7', functionName: 'Main',
                variables: [
                    { name: 'a', type: 'Integer', array: false, value: 10, elements: null },
                    { name: 'b', type: 'Real', array: false, value: undefined, elements: null },
                    { name: 'v', type: 'Integer', array: true, value: undefined, elements: elements }
                ]
            });
            var box = c.log.querySelector('.console-note--error');
            assert.equal(box.querySelector('.console-message').textContent, t('ERR_DIVISION_BY_ZERO'));
            assert.equal(box.querySelector('.console-block').textContent, t('ui.error.block', { text: 'Output x' }));
            var values = Array.prototype.map.call(box.querySelectorAll('.console-variable-value'), function (cell) {
                return cell.textContent;
            });
            assert.deepEqual(values, ['10', t('ui.value.none'), '[4; ' + t('ui.value.none') + '; 6]']);
        });

        T.test('errori che impediscono l\'esecuzione: tutti, in ordine (FR-RUN-02)', function (assert) {
            var c = setup();
            c.view.showInvalid([
                { code: 'ERR_SYNTAX_EMPTY_EXPRESSION', params: {}, nodeId: 'n1' },
                { code: 'ERR_MAIN_SIGNATURE', params: {}, nodeId: 'n2' }
            ]);
            var items = c.log.querySelectorAll('.console-error-list > li > .console-message');
            assert.equal(items.length, 2);
            assert.equal(items[0].textContent, t('ERR_SYNTAX_EMPTY_EXPRESSION'));
            assert.equal(items[1].textContent, t('ERR_MAIN_SIGNATURE'));
        });

        T.test('domanda dopo 5 secondi con Continua e Ferma (FR-RUN-04)', function (assert) {
            var calls = [];
            var c = setup({
                onContinue: function () { calls.push('continua'); },
                onStop: function () { calls.push('ferma'); }
            });
            c.view.showLongRun();
            var buttons = c.log.querySelectorAll('.console-note--question button');
            assert.deepEqual(Array.prototype.map.call(buttons, function (b) { return b.textContent; }),
                [t('ui.console.continue'), t('ui.stop')]);
            buttons[0].click();
            buttons[1].click();
            assert.deepEqual(calls, ['continua', 'ferma']);
            c.view.hideLongRun();
            assert.equal(c.log.querySelector('.console-note--question'), null);
        });
    });

    T.suite('Interfaccia › copia di sessione (NFR-PRIV-08, FR-MOB-15)', function () {
        function memoryStorage() {
            var data = {};
            return {
                data: data,
                getItem: function (key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null; },
                setItem: function (key, value) { data[key] = String(value); },
                removeItem: function (key) { delete data[key]; }
            };
        }

        T.test('salva e rilegge testo, nome e stato', function (assert) {
            var storage = memoryStorage();
            var copy = OnoFlow.SessionCopy.create(storage);
            assert.isTrue(copy.save({ text: '<flowgorithm/>', fileName: 'a.fprg', saved: false }));
            assert.deepEqual(copy.load(), { text: '<flowgorithm/>', fileName: 'a.fprg', saved: false });
            assert.deepEqual(Object.keys(storage.data), [OnoFlow.SessionCopy.KEY], 'una sola chiave, niente altro');
            copy.clear();
            assert.equal(copy.load(), null);
        });

        T.test('senza storage o con dati rovinati l\'app va avanti senza ripristino', function (assert) {
            assert.equal(OnoFlow.SessionCopy.create(null).load(), null);
            assert.isFalse(OnoFlow.SessionCopy.create(null).save({ text: '', fileName: '', saved: true }));

            var broken = memoryStorage();
            broken.data[OnoFlow.SessionCopy.KEY] = '{non json';
            assert.equal(OnoFlow.SessionCopy.create(broken).load(), null);
            broken.data[OnoFlow.SessionCopy.KEY] = JSON.stringify({ text: 'x', fileName: 'a.fprg' });
            assert.equal(OnoFlow.SessionCopy.create(broken).load(), null, 'manca saved');

            var full = memoryStorage();
            full.setItem = function () { throw new Error('QuotaExceededError'); };
            full.getItem = function () { throw new Error('SecurityError'); };
            var copy = OnoFlow.SessionCopy.create(full);
            assert.isFalse(copy.save({ text: 'x', fileName: 'a.fprg', saved: true }));
            assert.equal(copy.load(), null);
        });
    });

    T.suite('Interfaccia › nome del file (B2, FR-FILE-02)', function () {
        T.test('mai vuoto, sempre con .fprg', function (assert) {
            var normalize = OnoFlow.App.normalizeFileName;
            assert.equal(normalize(''), t('ui.fileName.default'));
            assert.equal(normalize('   '), t('ui.fileName.default'));
            assert.equal(normalize(' esercizio '), 'esercizio.fprg');
            assert.equal(normalize('Media.FPRG'), 'Media.FPRG');
            assert.equal(normalize('note.txt'), 'note.txt.fprg');
        });
    });
})();
