/*
 * OnoFlow — finestra di modifica di un blocco (FR-EDIT-02, FR-EDIT-08, FR-MOB-07…09,
 * FR-MOB-16, FR-MOB-17, passo 10).
 *
 * Dipendenze: js/namespace.js, js/core/model.js, js/ui/diagram-renderer.js.
 * Definisce: OnoFlow.BlockEditor.{create, straightenQuotes, insertText, FIELDS}
 *
 * Un pannello, non una finestra modale (B1): sul computer prende il posto della console,
 * con il diagramma accanto; sul telefono è a tutto schermo, con i campi in alto e la barra
 * dei simboli in fondo, cioè subito sopra la tastiera (FR-MOB-07, FR-MOB-08).
 *
 * Le modifiche si applicano mentre si scrive (DEC-066): ogni campo si rianalizza a ogni
 * tasto e il diagramma si aggiorna; l'errore di sintassi compare sotto il campo con il
 * messaggio della §8.4 e l'onda nel punto esatto. "Fatto" (o Esc) chiude il pannello.
 * Un campo vuoto non si segnala mentre lo si sta scrivendo, ma solo quando si lascia.
 * Senza errori di sintassi, sotto il campo compare l'errore dell'analisi statica di quel campo
 * (fieldIssue, passo 16): «b = True» si vede subito, anche a tutto schermo sul telefono.
 *
 *     create(host, { t, formatError, onChange(block), onClose(), fieldIssue(block, campo) }) →
 *         { open(block, { returnFocus }), close(), isOpen(), blockId(), element }
 * Ogni testo del blocco entra come testo, mai come HTML (NFR-SEC-01).
 */
(function (OnoFlow) {
    'use strict';

    var Model = OnoFlow.Model;
    var DiagramRenderer = OnoFlow.DiagramRenderer;
    if (!Model || !DiagramRenderer) {
        throw new Error('block-editor.js richiede model.js e diagram-renderer.js, da caricare prima');
    }

    // Simboli scomodi sulle tastiere dei telefoni (FR-MOB-08); le virgolette sono sempre dritte.
    var SYMBOLS = ['"', '&', '<', '>', '=', '[', ']', '(', ')', '^', '*', '/'];

    /*
     * Campi di ogni tipo di blocco, nell'ordine in cui si mostrano.
     *   text:     campo di testo analizzato (con il suggerimento di D-09, DEC-063)
     *   type:     tipo della dichiarazione;  check: proprietà vero/falso;  direction: verso del for
     * label e hint sono chiavi del catalogo: ui.edit.<label>, ui.edit.hint.<kind>.<name>.
     */
    var FIELDS = {
        declare: [
            { name: 'names', control: 'text', label: 'names' },
            { name: 'type', control: 'type', label: 'type' },
            { name: 'array', control: 'check', label: 'array' },
            { name: 'size', control: 'text', label: 'size', onlyIf: 'array' }
        ],
        assign: [
            { name: 'variable', control: 'text', label: 'variable' },
            { name: 'expression', control: 'text', label: 'expression' }
        ],
        input: [{ name: 'variable', control: 'text', label: 'variable' }],
        output: [
            { name: 'expression', control: 'text', label: 'expression' },
            { name: 'newline', control: 'check', label: 'newline' }
        ],
        'if': [{ name: 'expression', control: 'text', label: 'condition' }],
        'while': [{ name: 'expression', control: 'text', label: 'condition' }],
        'do': [{ name: 'expression', control: 'text', label: 'condition' }],
        'for': [
            { name: 'variable', control: 'text', label: 'variable' },
            { name: 'start', control: 'text', label: 'from' },
            { name: 'end', control: 'text', label: 'to' },
            { name: 'direction', control: 'direction', label: 'direction' },
            { name: 'step', control: 'text', label: 'step' }
        ]
    };

    /*
     * Virgolette tipografiche → dritte (FR-MOB-16): la tastiera di iOS può sostituirle
     * anche con la correzione disattivata. Un carattere per un carattere: il cursore non si sposta.
     */
    function straightenQuotes(text) {
        return text.replace(/[\u201C\u201D\u201E\u201F\u00AB\u00BB]/g, '"').replace(/[\u2018\u2019\u201A\u201B]/g, '\'');
    }

    /* Inserisce testo al posto della selezione di un campo, con il cursore subito dopo. */
    function insertText(input, text) {
        var start = input.selectionStart === null ? input.value.length : input.selectionStart;
        var end = input.selectionEnd === null ? start : input.selectionEnd;
        input.value = input.value.slice(0, start) + text + input.value.slice(end);
        var caret = start + text.length;
        input.setSelectionRange(caret, caret);
    }

    var idCount = 0;

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) {
            node.className = className;
        }
        if (text !== undefined) {
            node.textContent = text;
        }
        return node;
    }

    function create(host, options) {
        var t = options.t;
        var formatError = options.formatError;
        var panel = element('section', 'block-editor');
        panel.hidden = true;
        panel.setAttribute('role', 'region');
        var titleId = 'edit-title-' + (++idCount);
        panel.setAttribute('aria-labelledby', titleId);

        var header = element('div', 'edit-header');
        var icon = element('span', 'edit-icon');
        var title = element('h2', 'edit-title');
        title.id = titleId;
        var done = element('button', 'button button--primary edit-done', t('ui.edit.done'));
        done.type = 'button';
        header.appendChild(icon);
        header.appendChild(title);
        header.appendChild(done);
        panel.appendChild(header);

        var form = element('div', 'edit-fields');
        panel.appendChild(form);

        var symbols = element('div', 'edit-symbols');
        symbols.setAttribute('role', 'toolbar');
        symbols.setAttribute('aria-label', t('ui.edit.symbols'));
        SYMBOLS.forEach(function (symbol) {
            var button = element('button', 'edit-symbol', symbol);
            button.type = 'button';
            button.setAttribute('data-symbol', symbol);
            // Il campo non deve perdere il focus, altrimenti la tastiera del telefono si chiude.
            button.addEventListener('pointerdown', function (event) { event.preventDefault(); });
            button.addEventListener('mousedown', function (event) { event.preventDefault(); });
            button.addEventListener('click', function () {
                if (lastText) {
                    insertText(lastText, symbol);
                    lastText.dispatchEvent(new Event('input', { bubbles: true }));
                    lastText.focus();
                }
            });
            symbols.appendChild(button);
        });
        panel.appendChild(symbols);
        host.appendChild(panel);

        var block = null;
        var returnFocus = null;
        var lastText = null;
        var rows = [];

        /* Dopo ogni modifica: l'app rianalizza, poi si aggiornano gli errori di tutti i campi. */
        function notifyChange() {
            if (options.onChange) {
                options.onChange(block);
            }
            rows.forEach(function (row) {
                if (row.spec.control === 'text') {
                    // Un campo vuoto mai lasciato resta senza errore, come quello in cui si scrive.
                    showFieldError(row, !row.left || row.input === document.activeElement);
                }
            });
        }

        /* Errore di un campo: messaggio della §8.4 e il testo con l'onda nel punto esatto. */
        function showFieldError(row, focused) {
            var field = block.fields[row.spec.name];
            var error = field.error;
            if (!error && options.fieldIssue) {
                error = options.fieldIssue(block, row.spec.name);
            }
            if (error && error.code === 'ERR_SYNTAX_EMPTY_EXPRESSION' && focused) {
                error = null; // un campo vuoto si segnala quando lo si lascia, non mentre lo si scrive
            }
            row.error.textContent = '';
            row.error.hidden = !error;
            row.input.setAttribute('aria-invalid', error ? 'true' : 'false');
            if (!error) {
                return;
            }
            row.error.appendChild(element('span', 'edit-error-message', formatError(error)));
            if (error.position && field.text !== '') {
                var mirror = element('code', 'edit-mirror');
                var text = field.text;
                var start = Math.max(0, Math.min(error.position.start, text.length));
                var end = Math.max(start, Math.min(error.position.end, text.length));
                mirror.appendChild(document.createTextNode(text.slice(0, start)));
                var wave = element('span', start === end ? 'pen-wave pen-wave--point' : 'pen-wave', text.slice(start, end));
                mirror.appendChild(wave);
                mirror.appendChild(document.createTextNode(text.slice(end)));
                row.error.appendChild(mirror);
            }
        }

        function updateVisibility() {
            rows.forEach(function (row) {
                if (row.spec.onlyIf) {
                    row.root.hidden = !block[row.spec.onlyIf];
                }
            });
        }

        function textRow(spec, id) {
            var root = element('div', 'edit-row');
            var label = element('label', 'edit-label', t('ui.edit.' + spec.label));
            label.htmlFor = id;
            var input = element('input', 'edit-input');
            input.type = 'text';
            input.id = id;
            input.value = block.fields[spec.name].text;
            input.placeholder = t('ui.edit.hint.' + block.kind + '.' + spec.name);
            // Niente correzione, maiuscole o suggerimenti nelle espressioni (FR-MOB-09).
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('autocapitalize', 'off');
            input.setAttribute('spellcheck', 'false');
            input.setAttribute('enterkeyhint', 'done');
            var error = element('div', 'edit-error');
            error.id = id + '-error';
            error.setAttribute('aria-live', 'polite');
            input.setAttribute('aria-describedby', error.id);
            root.appendChild(label);
            root.appendChild(input);
            root.appendChild(error);
            var row = { spec: spec, root: root, input: input, error: error, left: false };
            input.addEventListener('focus', function () { lastText = input; });
            input.addEventListener('input', function () {
                var straight = straightenQuotes(input.value);
                if (straight !== input.value) {
                    var caret = input.selectionStart;
                    input.value = straight;
                    input.setSelectionRange(caret, caret);
                }
                Model.setFieldText(block, spec.name, input.value);
                notifyChange(); // aggiorna anche l'errore di questo campo
            });
            input.addEventListener('blur', function () {
                // Anche chiudendo la finestra il campo perde il focus: allora non c'è più nulla da segnare.
                if (block && rows.indexOf(row) !== -1) {
                    row.left = true;
                    showFieldError(row, false);
                }
            });
            input.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    focusNext(row);
                }
            });
            return row;
        }

        function choiceRow(spec, id, values, labelKeys) {
            var root = element('div', 'edit-row');
            var label = element('label', 'edit-label', t('ui.edit.' + spec.label));
            label.htmlFor = id;
            var select = element('select', 'edit-select');
            select.id = id;
            values.forEach(function (value, index) {
                var option = element('option', '', labelKeys ? t(labelKeys[index]) : value);
                option.value = value;
                select.appendChild(option);
            });
            select.value = block[spec.name];
            select.addEventListener('change', function () {
                Model.setProperty(block, spec.name, select.value);
                notifyChange();
            });
            root.appendChild(label);
            root.appendChild(select);
            return { spec: spec, root: root, input: select };
        }

        function checkRow(spec, id) {
            var root = element('div', 'edit-row edit-row--check');
            var input = element('input', 'edit-check');
            input.type = 'checkbox';
            input.id = id;
            input.checked = Boolean(block[spec.name]);
            var label = element('label', 'edit-label', t('ui.edit.' + spec.label));
            label.htmlFor = id;
            input.addEventListener('change', function () {
                Model.setProperty(block, spec.name, input.checked);
                updateVisibility();
                notifyChange();
            });
            root.appendChild(input);
            root.appendChild(label);
            return { spec: spec, root: root, input: input };
        }

        /* Invio passa al campo successivo; dall'ultimo chiude, come "Fatto". */
        function focusNext(row) {
            var visible = rows.filter(function (candidate) { return !candidate.root.hidden; });
            var next = visible[visible.indexOf(row) + 1];
            if (next) {
                next.input.focus();
            } else {
                close();
            }
        }

        function open(target, openOptions) {
            block = target;
            returnFocus = openOptions && openOptions.returnFocus ? openOptions.returnFocus : null;
            lastText = null;
            icon.textContent = '';
            icon.appendChild(DiagramRenderer.blockIcon(block.kind));
            title.textContent = t('block.name.' + block.kind);
            form.textContent = '';
            rows = (FIELDS[block.kind] || []).map(function (spec) {
                var id = 'edit-' + idCount + '-' + spec.name;
                var row;
                if (spec.control === 'text') {
                    row = textRow(spec, id);
                } else if (spec.control === 'type') {
                    row = choiceRow(spec, id, Model.TYPES, null);
                } else if (spec.control === 'direction') {
                    row = choiceRow(spec, id, Model.DIRECTIONS, ['ui.edit.direction.inc', 'ui.edit.direction.dec']);
                } else {
                    row = checkRow(spec, id);
                }
                form.appendChild(row.root);
                return row;
            });
            updateVisibility();
            // Gli errori di un blocco che esiste già si vedono subito; quelli di un campo vuoto no.
            rows.forEach(function (row) {
                if (row.spec.control === 'text') {
                    showFieldError(row, true);
                }
            });
            panel.hidden = false;
            var first = rows[0];
            if (first) {
                first.input.focus({ preventScroll: true });
                if (first.input.select && first.input.value !== '') {
                    first.input.setSelectionRange(first.input.value.length, first.input.value.length);
                }
            }
        }

        function close() {
            if (panel.hidden) {
                return;
            }
            panel.hidden = true;
            block = null;
            rows = [];
            form.textContent = '';
            var target = returnFocus;
            returnFocus = null;
            if (options.onClose) {
                options.onClose();
            }
            if (target && target.isConnected) {
                target.focus({ preventScroll: true });
            }
        }

        done.addEventListener('click', close);
        panel.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                close();
            }
        });

        return {
            open: open,
            close: close,
            isOpen: function () { return !panel.hidden; },
            blockId: function () { return block ? block.id : null; },
            setReturnFocus: function (target) { returnFocus = target; },
            element: panel
        };
    }

    OnoFlow.BlockEditor = { create: create, straightenQuotes: straightenQuotes, insertText: insertText, FIELDS: FIELDS };
})(window.OnoFlow);
