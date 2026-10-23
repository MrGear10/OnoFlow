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
 * Dal passo 18 apre anche una funzione (FR-EDIT-11, DEC-078): nome, valore restituito,
 * variabile restituita, parametri (nome, tipo, array) da aggiungere e togliere.
 *
 *     create(host, { t, formatError, onChange(block), onClose(), fieldIssue(block, campo, parametro) }) →
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
        ],
        // Passo 17 (FR-EDIT-10): il commento è un testo libero, non un'espressione.
        call: [{ name: 'expression', control: 'text', label: 'call' }],
        comment: [{ name: 'text', control: 'comment', label: 'comment' }],
        // Passo 18: la firma di una funzione; la variabile restituita solo se c'è un valore.
        'function': [
            { name: 'name', control: 'property', label: 'functionName' },
            { name: 'type', control: 'returnType', label: 'returnType' },
            { name: 'variable', control: 'property', label: 'returnVariable', onlyIf: function (fn) { return fn.type !== 'None'; } },
            { name: 'parameters', control: 'parameters', label: 'parameters' }
        ]
    };

    /* Il tipo di ciò che si modifica: una funzione non ha kind. */
    function kindOf(target) {
        return target.kind || 'function';
    }

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
                if (row.error) {
                    // Un campo vuoto mai lasciato resta senza errore, come quello in cui si scrive.
                    showFieldError(row, !row.left || row.input === document.activeElement);
                }
            });
        }

        /* Errore di un campo: messaggio della §8.4 e il testo con l'onda nel punto esatto. */
        function showFieldError(row, focused) {
            // Un campo di un blocco ha il suo errore di sintassi; il nome di una funzione o di un parametro no.
            var field = block.fields ? block.fields[row.spec.name] : null;
            var text = row.text ? row.text() : field.text;
            var error = field ? field.error : null;
            if (!error && options.fieldIssue) {
                error = options.fieldIssue(block, row.spec.field || row.spec.name, row.parameter);
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
            if (error.position && text !== '') {
                var mirror = element('code', 'edit-mirror');
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
                    row.root.hidden = typeof row.spec.onlyIf === 'function' ? !row.spec.onlyIf(block) : !block[row.spec.onlyIf];
                }
            });
        }

        /* Un campo di testo per una proprietà semplice: nome della funzione o di un parametro. */
        function propertyInput(id, value, hintKey) {
            var input = element('input', 'edit-input');
            input.type = 'text';
            input.id = id;
            input.value = value;
            input.placeholder = t(hintKey);
            ['autocomplete', 'autocorrect', 'autocapitalize'].forEach(function (name) { input.setAttribute(name, 'off'); });
            input.setAttribute('spellcheck', 'false');
            input.setAttribute('enterkeyhint', 'done');
            return input;
        }

        function errorBox(id, input) {
            var error = element('div', 'edit-error');
            error.id = id + '-error';
            error.setAttribute('aria-live', 'polite');
            input.setAttribute('aria-describedby', error.id);
            return error;
        }

        /* Riga con un campo, l'errore sotto e i soliti tasti (Invio avanti, focus per i simboli). */
        function wireTextRow(row, onText) {
            row.input.addEventListener('focus', function () { lastText = row.input; });
            row.input.addEventListener('input', function () {
                onText(row.input.value);
                notifyChange();
            });
            row.input.addEventListener('blur', function () {
                if (block && rows.indexOf(row) !== -1) {
                    row.left = true;
                    showFieldError(row, false);
                }
            });
            row.input.addEventListener('keydown', function (event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    focusNext(row);
                }
            });
            return row;
        }

        /* Nome della funzione o variabile restituita: errori dall'analisi statica (fieldIssue). */
        function propertyRow(spec, id) {
            var root = element('div', 'edit-row');
            var label = element('label', 'edit-label', t('ui.edit.' + spec.label));
            label.htmlFor = id;
            var input = propertyInput(id, block[spec.name], 'ui.edit.hint.function.' + spec.name);
            var error = errorBox(id, input);
            root.appendChild(label);
            root.appendChild(input);
            root.appendChild(error);
            var row = { spec: spec, root: root, input: input, error: error, left: false, text: function () { return block[spec.name]; } };
            return wireTextRow(row, function (value) { block[spec.name] = value; });
        }

        /* Parametri: una riga per parametro (nome, tipo, array, Togli) e Aggiungi parametro. */
        function parametersRows(spec, id) {
            var root = element('fieldset', 'edit-row edit-parameters');
            root.appendChild(element('legend', 'edit-label', t('ui.edit.' + spec.label)));
            var created = [{ spec: spec, root: root, input: null }];
            if (block.parameters.length === 0) {
                root.appendChild(element('p', 'edit-note', t('ui.edit.noParameters')));
            }
            block.parameters.forEach(function (parameter, index) {
                var line = element('div', 'edit-parameter');
                var nameId = id + '-' + index + '-name';
                var nameInput = propertyInput(nameId, parameter.name, 'ui.edit.hint.function.parameter');
                nameInput.setAttribute('aria-label', t('ui.edit.parameterName', { position: String(index + 1) }));
                var typeSelect = element('select', 'edit-select');
                typeSelect.setAttribute('aria-label', t('ui.edit.parameterType', { position: String(index + 1) }));
                Model.TYPES.forEach(function (type) {
                    var option = element('option', '', type);
                    option.value = type;
                    typeSelect.appendChild(option);
                });
                typeSelect.value = parameter.type;
                typeSelect.addEventListener('change', function () {
                    parameter.type = typeSelect.value;
                    notifyChange();
                });
                var arrayLabel = element('label', 'edit-parameter-array');
                var arrayInput = element('input', 'edit-check');
                arrayInput.type = 'checkbox';
                arrayInput.checked = parameter.array;
                arrayInput.addEventListener('change', function () {
                    parameter.array = arrayInput.checked;
                    notifyChange();
                });
                arrayLabel.appendChild(arrayInput);
                arrayLabel.appendChild(document.createTextNode(t('ui.edit.array')));
                var remove = element('button', 'button button--quiet edit-parameter-remove', t('ui.edit.removeParameter'));
                remove.type = 'button';
                remove.setAttribute('aria-label', t('ui.edit.removeParameterNamed', { position: String(index + 1) }));
                remove.addEventListener('click', function () {
                    block.parameters.splice(index, 1);
                    notifyChange();
                    rebuild(id + '-add');
                });
                var error = errorBox(nameId, nameInput);
                line.appendChild(nameInput);
                line.appendChild(typeSelect);
                line.appendChild(arrayLabel);
                line.appendChild(remove);
                root.appendChild(line);
                root.appendChild(error);
                created.push(wireTextRow({
                    spec: { name: 'parameter', field: 'parameters', control: 'text' },
                    root: line, input: nameInput, error: error, left: false, parameter: index,
                    text: function () { return parameter.name; }
                }, function (value) { parameter.name = value; }));
            });
            var add = element('button', 'button edit-parameter-add', t('ui.edit.addParameter'));
            add.type = 'button';
            add.id = id + '-add';
            add.addEventListener('click', function () {
                block.parameters.push({ name: '', type: 'Integer', array: false });
                notifyChange();
                rebuild(id + '-' + (block.parameters.length - 1) + '-name');
            });
            root.appendChild(add);
            return created;
        }

        /* Ridisegna i campi (dopo Aggiungi o Togli parametro) e rimette il focus. */
        function rebuild(focusId) {
            buildForm();
            var target = document.getElementById(focusId);
            if (target) {
                target.focus();
            }
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

        /*
         * Testo di un commento (proprietà text, non analizzata). Un'area di testo, perché gli a
         * capo di un file importato si conservino; Invio passa avanti come negli altri campi.
         */
        function commentRow(spec, id) {
            var root = element('div', 'edit-row');
            var label = element('label', 'edit-label', t('ui.edit.' + spec.label));
            label.htmlFor = id;
            var input = element('textarea', 'edit-input edit-comment');
            input.id = id;
            input.rows = 2;
            input.value = block.text;
            input.placeholder = t('ui.edit.hint.comment.text');
            // Come gli altri campi (FR-MOB-09): un commento cita spesso i nomi delle variabili.
            input.setAttribute('autocomplete', 'off');
            input.setAttribute('autocorrect', 'off');
            input.setAttribute('autocapitalize', 'off');
            input.setAttribute('spellcheck', 'false');
            input.setAttribute('enterkeyhint', 'done');
            root.appendChild(label);
            root.appendChild(input);
            var row = { spec: spec, root: root, input: input };
            input.addEventListener('focus', function () { lastText = input; });
            input.addEventListener('input', function () {
                var straight = straightenQuotes(input.value);
                if (straight !== input.value) {
                    var caret = input.selectionStart;
                    input.value = straight;
                    input.setSelectionRange(caret, caret);
                }
                Model.setProperty(block, 'text', input.value);
                notifyChange();
            });
            input.addEventListener('keydown', function (event) {
                if (event.key === 'Enter' && !event.shiftKey) {
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
                var option = element('option', '', labelKeys && labelKeys[index] ? t(labelKeys[index]) : value);
                option.value = value;
                select.appendChild(option);
            });
            select.value = block[spec.name];
            select.addEventListener('change', function () {
                if (kindOf(block) === 'function') {
                    // Valore restituito di una funzione: senza valore non c'è variabile (§6.8).
                    block.type = select.value;
                    if (block.type === 'None') {
                        block.variable = '';
                    }
                    updateVisibility();
                } else {
                    Model.setProperty(block, spec.name, select.value);
                }
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

        function buildForm() {
            form.textContent = '';
            rows = [];
            (FIELDS[kindOf(block)] || []).forEach(function (spec) {
                var id = 'edit-' + idCount + '-' + spec.name;
                var row;
                if (spec.control === 'parameters') {
                    parametersRows(spec, id).forEach(function (created, index) {
                        if (index === 0) {
                            form.appendChild(created.root);
                        } else {
                            rows.push(created);
                        }
                    });
                    return;
                }
                if (spec.control === 'property') {
                    row = propertyRow(spec, id);
                } else if (spec.control === 'returnType') {
                    row = choiceRow(spec, id, OnoFlow.Editor.RETURN_TYPES, OnoFlow.Editor.RETURN_TYPES.map(function (type) {
                        return type === 'None' ? 'ui.edit.returnNone' : null;
                    }));
                } else if (spec.control === 'text') {
                    row = textRow(spec, id);
                } else if (spec.control === 'type') {
                    row = choiceRow(spec, id, Model.TYPES, null);
                } else if (spec.control === 'comment') {
                    row = commentRow(spec, id);
                } else if (spec.control === 'direction') {
                    row = choiceRow(spec, id, Model.DIRECTIONS, ['ui.edit.direction.inc', 'ui.edit.direction.dec']);
                } else {
                    row = checkRow(spec, id);
                }
                form.appendChild(row.root);
                rows.push(row);
            });
            updateVisibility();
            rows.forEach(function (row) {
                if (row.error) {
                    showFieldError(row, true);
                }
            });
        }

        function open(target, openOptions) {
            block = target;
            returnFocus = openOptions && openOptions.returnFocus ? openOptions.returnFocus : null;
            lastText = null;
            icon.textContent = '';
            icon.appendChild(DiagramRenderer.blockIcon(kindOf(block)));
            title.textContent = t('block.name.' + kindOf(block));
            buildForm(); // gli errori di ciò che esiste già si vedono subito; quelli di un campo vuoto no
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
