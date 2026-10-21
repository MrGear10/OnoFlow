/*
 * OnoFlow — test della finestra di modifica (passo 10): campi di ogni blocco, errore mentre
 * si scrive, campi non testuali, virgolette, barra dei simboli, tastiera.
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*, js/i18n/*, js/ui/*.
 * La finestra lavora su un elemento aggiunto alla pagina e tolto alla fine di ogni test.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var OnoFlow = window.OnoFlow;
    var Model = OnoFlow.Model;
    var Editor = OnoFlow.Editor;
    var BlockEditor = OnoFlow.BlockEditor;
    var t = OnoFlow.Localization.t;
    var formatError = OnoFlow.Localization.formatError;

    /* Apre la finestra su un blocco e chiama run; poi pulisce. */
    function withEditor(block, run) {
        var host = document.createElement('div');
        document.body.appendChild(host);
        var changes = 0;
        var closed = 0;
        var editor = BlockEditor.create(host, {
            t: t, formatError: formatError,
            onChange: function () { changes++; },
            onClose: function () { closed++; }
        });
        try {
            editor.open(block);
            run({
                editor: editor,
                panel: editor.element,
                field: function (name) { return editor.element.querySelector('[id$="-' + name + '"]'); },
                changes: function () { return changes; },
                closed: function () { return closed; }
            });
        } finally {
            editor.close();
            document.body.removeChild(host);
        }
    }

    function type(input, text) {
        input.value = text;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function labels(panel) {
        return Array.prototype.map.call(panel.querySelectorAll('.edit-row:not([hidden]) .edit-label'), function (node) {
            return node.textContent;
        });
    }

    T.suite('Modifica › campi di ogni blocco (FR-EDIT-02, FR-EDIT-08)', function () {
        T.test('ogni blocco del menu ha i suoi campi, con un suggerimento (D-09)', function (assert) {
            Editor.INSERTABLE_KINDS.forEach(function (kind) {
                withEditor(Editor.createNewBlock(kind), function (e) {
                    assert.equal(e.panel.querySelector('.edit-title').textContent, t('block.name.' + kind));
                    Array.prototype.forEach.call(e.panel.querySelectorAll('.edit-input'), function (input) {
                        assert.isTrue(/^es\. /.test(input.placeholder), kind + ': suggerimento ' + input.placeholder);
                        assert.equal(input.getAttribute('autocorrect'), 'off', 'niente correzione (FR-MOB-09)');
                        assert.equal(input.getAttribute('autocapitalize'), 'off');
                        assert.equal(input.getAttribute('spellcheck'), 'false');
                    });
                });
            });
        });

        T.test('dichiarazione: nomi, tipo, array e dimensione solo se array', function (assert) {
            var block = Editor.createNewBlock('declare');
            withEditor(block, function (e) {
                assert.deepEqual(labels(e.panel), [t('ui.edit.names'), t('ui.edit.type'), t('ui.edit.array')]);
                e.field('type').value = 'Real';
                e.field('type').dispatchEvent(new Event('change'));
                assert.equal(block.type, 'Real');
                e.field('array').click();
                assert.isTrue(block.array);
                assert.deepEqual(labels(e.panel), [t('ui.edit.names'), t('ui.edit.type'), t('ui.edit.array'), t('ui.edit.size')]);
                type(e.field('size'), '10');
                assert.equal(block.fields.size.text, '10');
                assert.equal(e.changes(), 3);
            });
        });

        T.test('output: a capo; for: verso e passo', function (assert) {
            var output = Editor.createNewBlock('output');
            withEditor(output, function (e) {
                e.field('newline').click();
                assert.isFalse(output.newline);
            });
            var loop = Editor.createNewBlock('for');
            withEditor(loop, function (e) {
                assert.equal(e.field('step').value, '1');
                e.field('direction').value = 'dec';
                e.field('direction').dispatchEvent(new Event('change'));
                assert.equal(loop.direction, 'dec');
                assert.equal(OnoFlow.BlockText.plainText(loop, t), 'for  =  down to ');
            });
        });

        T.test('il testo di un blocco esistente si apre com\'è scritto', function (assert) {
            var block = H.assign('v[ i ]', '  a+b ');
            withEditor(block, function (e) {
                assert.equal(e.field('variable').value, 'v[ i ]');
                assert.equal(e.field('expression').value, '  a+b ');
                assert.equal(document.activeElement, e.field('variable'), 'il focus va sul primo campo');
            });
        });
    });

    T.suite('Modifica › errore mentre si scrive (FR-EDIT-02, §8.4)', function () {
        T.test('ogni tasto aggiorna il modello e l\'errore, con l\'onda nel punto esatto', function (assert) {
            var block = Editor.createNewBlock('assign');
            withEditor(block, function (e) {
                var input = e.field('expression');
                input.focus();
                type(input, 'a + 2,5');
                assert.equal(block.fields.expression.text, 'a + 2,5');
                var error = e.panel.querySelector('#' + input.id + '-error');
                assert.isFalse(error.hidden);
                assert.equal(input.getAttribute('aria-invalid'), 'true');
                assert.equal(error.querySelector('.edit-error-message').textContent, formatError(block.fields.expression.error));
                assert.equal(error.querySelector('.pen-wave').textContent, '2,5');
                assert.equal(error.querySelector('.edit-mirror').textContent, 'a + 2,5');
                type(input, 'a + 2.5');
                assert.isTrue(error.hidden, 'corretto: l\'errore sparisce');
                assert.equal(input.getAttribute('aria-invalid'), 'false');
                assert.equal(e.changes(), 2);
            });
        });

        T.test('un campo vuoto si segnala quando lo si lascia, non mentre si scrive', function (assert) {
            var block = Editor.createNewBlock('output');
            withEditor(block, function (e) {
                var input = e.field('expression');
                var error = e.panel.querySelector('#' + input.id + '-error');
                assert.isTrue(error.hidden, 'all\'apertura niente rosso');
                type(input, 'x');
                type(input, '');
                assert.isTrue(error.hidden, 'mentre si scrive niente rosso');
                input.dispatchEvent(new Event('blur'));
                assert.isFalse(error.hidden);
                assert.equal(error.textContent, t('ERR_SYNTAX_EMPTY_EXPRESSION'));
            });
        });

        T.test('un errore alla fine ha il suo segno', function (assert) {
            var block = Editor.createNewBlock('output');
            withEditor(block, function (e) {
                type(e.field('expression'), '"a" +');
                assert.isTrue(e.panel.querySelector('.pen-wave--point') !== null);
            });
        });

        T.test('il testo entra come testo, mai come HTML (NFR-SEC-01)', function (assert) {
            var block = Editor.createNewBlock('output');
            withEditor(block, function (e) {
                type(e.field('expression'), '<b>x</b> +');
                assert.equal(e.panel.querySelector('b'), null);
            });
        });
    });

    T.suite('Modifica › telefono: virgolette e simboli (FR-MOB-08, FR-MOB-16)', function () {
        T.test('virgolette tipografiche diventano dritte, senza spostare il cursore', function (assert) {
            assert.equal(BlockEditor.straightenQuotes('\u201Cciao\u201D & \u2018a\u2019 \u00ABb\u00BB'), '"ciao" & \'a\' "b"');
            var block = Editor.createNewBlock('output');
            withEditor(block, function (e) {
                var input = e.field('expression');
                input.focus();
                input.value = '\u201Cciao\u201D & x';
                input.setSelectionRange(6, 6);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                assert.equal(input.value, '"ciao" & x');
                assert.equal(block.fields.expression.text, '"ciao" & x');
                assert.equal(input.selectionStart, 6);
            });
        });

        T.test('la barra dei simboli inserisce dove c\'è il cursore, con le virgolette dritte', function (assert) {
            var block = Editor.createNewBlock('output');
            withEditor(block, function (e) {
                var buttons = Array.prototype.map.call(e.panel.querySelectorAll('[data-symbol]'), function (button) {
                    return button.getAttribute('data-symbol');
                });
                assert.deepEqual(buttons, ['"', '&', '<', '>', '=', '[', ']', '(', ')', '^', '*', '/']);
                var input = e.field('expression');
                input.focus();
                type(input, 'ab');
                input.setSelectionRange(1, 1);
                e.panel.querySelector('[data-symbol="&"]').click();
                assert.equal(input.value, 'a&b');
                assert.equal(input.selectionStart, 2, 'il cursore va dopo il simbolo');
                assert.equal(block.fields.expression.text, 'a&b', 'il modello si aggiorna');
                assert.equal(document.activeElement, input, 'il campo resta a fuoco: la tastiera non si chiude');
            });
        });
    });

    T.suite('Modifica › chiusura e tastiera (NFR-ACC-01)', function () {
        T.test('Fatto ed Esc chiudono la finestra', function (assert) {
            withEditor(Editor.createNewBlock('input'), function (e) {
                e.panel.querySelector('.edit-done').click();
                assert.isFalse(e.editor.isOpen());
                assert.equal(e.closed(), 1);
            });
            withEditor(Editor.createNewBlock('input'), function (e) {
                e.field('variable').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                assert.isFalse(e.editor.isOpen());
            });
        });

        T.test('Invio passa al campo dopo; dall\'ultimo chiude', function (assert) {
            withEditor(Editor.createNewBlock('assign'), function (e) {
                var enter = function () {
                    document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
                };
                enter();
                assert.equal(document.activeElement, e.field('expression'));
                enter();
                assert.isFalse(e.editor.isOpen());
            });
        });

        T.test('una proprietà sbagliata non entra nel modello', function (assert) {
            var block = Editor.createNewBlock('declare');
            assert.throws(function () { Model.setProperty(block, 'type', 'Intero'); }, TypeError);
            assert.throws(function () { Model.setProperty(block, 'newline', true); }, TypeError);
            assert.equal(block.type, 'Integer');
        });
    });
})();
