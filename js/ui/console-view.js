/*
 * OnoFlow — console: output, input in linea, errori con le variabili (FR-CON-01…05, FR-ERR-01…03).
 *
 * Dipendenze: js/namespace.js.
 * Definisce: OnoFlow.ConsoleView.{create, MAX_CHARACTERS}
 *
 * create(log, options) usa l'elemento log (role="log") e restituisce
 *     write(testo, aCapo)       output del programma; si accumula e si disegna con flush()
 *     flush()                   disegna l'output accumulato (una volta per turno dello scheduler)
 *     requestInput(evento)      campo in linea dopo l'ultimo output, sulla stessa riga (FR-CON-02)
 *     focusInput()              rimette il cursore nel campo, se c'è
 *     showLongRun() / hideLongRun()   domanda dopo 5 secondi, con Continua e Ferma (FR-RUN-04)
 *     showDone(), showStopped(errore), showRuntimeError(errore), showInvalid(errori)
 *     clear()                   a ogni nuova esecuzione (FR-CON-04)
 * options: t, formatError, formatValue(valore tipizzato), describeBlock(nodeId) → testo | null,
 *     onSubmitInput(testo), onContinue(), onStop(), onReveal(nodeId), scroller (l'elemento che
 *     scorre), trimmedNotice (elemento mostrato quando si tolgono righe), maxCharacters.
 *
 * Niente finestre modali (FR-CON-03): input, domande ed errori stanno nel flusso della console.
 * Il testo del programma entra come testo, mai come HTML (NFR-SEC-01).
 */
(function (OnoFlow) {
    'use strict';

    // FR-CON-05, NFR-PERF-02: circa 200.000 caratteri; oltre si tolgono i più vecchi.
    var MAX_CHARACTERS = 200000;
    // Elementi mostrati al massimo per ogni array nella tabella delle variabili.
    var MAX_ELEMENTS_SHOWN = 20;
    // Distanza dal fondo entro cui la console segue l'output che arriva.
    var FOLLOW_THRESHOLD_PX = 48;

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

    function create(log, options) {
        var t = options.t;
        var maxCharacters = options.maxCharacters || MAX_CHARACTERS;
        var scroller = options.scroller || log;
        var pending = '';
        var characters = 0;
        var trimmed = false;
        var input = null;
        var question = null;

        function nearBottom() {
            return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < FOLLOW_THRESHOLD_PX;
        }

        function followIfNeeded(wasNearBottom) {
            if (wasNearBottom) {
                scroller.scrollTop = scroller.scrollHeight;
            }
        }

        /* Toglie dall'inizio il testo in più; lo dice una volta sola per esecuzione. */
        function trim() {
            while (characters > maxCharacters && log.firstChild) {
                var first = log.firstChild;
                var excess = characters - maxCharacters;
                if (first.nodeType === 3 && first.data.length > excess) {
                    first.data = first.data.slice(excess);
                    characters -= excess;
                } else {
                    characters -= first.textContent.length;
                    log.removeChild(first);
                }
            }
            if (!trimmed && options.trimmedNotice) {
                trimmed = true;
                options.trimmedNotice.hidden = false;
            }
        }

        function append(node, countsAs) {
            var wasNearBottom = nearBottom();
            log.appendChild(node);
            characters += countsAs;
            if (characters > maxCharacters) {
                trim();
            }
            followIfNeeded(wasNearBottom);
        }

        function write(text, newline) {
            pending += text + (newline ? '\n' : '');
        }

        function flush() {
            if (pending === '') {
                return;
            }
            var text = pending;
            pending = '';
            // Testi uniti nello stesso nodo: un ciclo che stampa non riempie la pagina di nodi.
            var last = log.lastChild;
            if (last && last.nodeType === 3) {
                var wasNearBottom = nearBottom();
                last.appendData(text);
                characters += text.length;
                if (characters > maxCharacters) {
                    trim();
                }
                followIfNeeded(wasNearBottom);
            } else {
                append(document.createTextNode(text), text.length);
            }
        }

        /* Un blocco della console (errore, domanda, fine) va sempre a capo. */
        function note(className) {
            flush();
            var box = element('div', 'console-note ' + className);
            return box;
        }

        function removeInput() {
            if (input) {
                input.wrapper.parentNode.removeChild(input.wrapper);
                input = null;
            }
        }

        function requestInput(event) {
            flush();
            removeInput();
            if (event.error) {
                var problem = note('console-note--input-error');
                problem.appendChild(element('p', 'console-message', options.formatError(event.error)));
                append(problem, 0);
            }
            var wrapper = element('span', 'console-input');
            var field = element('input', 'console-field');
            field.type = 'text';
            field.setAttribute('autocomplete', 'off');
            field.setAttribute('autocapitalize', 'off');
            field.setAttribute('autocorrect', 'off');
            field.setAttribute('spellcheck', 'false');
            field.setAttribute('enterkeyhint', 'done');
            field.setAttribute('aria-label', t('ui.console.inputLabel', { type: event.valueType }));
            field.placeholder = event.valueType;
            field.addEventListener('keydown', function (keyEvent) {
                if (keyEvent.key !== 'Enter' || keyEvent.isComposing) {
                    return;
                }
                keyEvent.preventDefault();
                var text = field.value;
                removeInput();
                // Il valore digitato resta visibile, in giallo, e si va a capo (FR-CON-02).
                append(element('span', 'console-typed', text), text.length);
                append(document.createTextNode('\n'), 1);
                options.onSubmitInput(text);
            });
            wrapper.appendChild(field);
            input = { wrapper: wrapper, field: field };
            append(wrapper, 0);
            focusInput();
        }

        function focusInput() {
            if (input) {
                input.field.focus({ preventScroll: true });
                input.wrapper.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            }
        }

        function showLongRun() {
            hideLongRun();
            question = note('console-note--question');
            question.appendChild(element('p', 'console-message', t('ui.console.longRun')));
            var actions = element('div', 'console-actions');
            var keepGoing = element('button', 'button button--chalk', t('ui.console.continue'));
            keepGoing.type = 'button';
            keepGoing.addEventListener('click', function () { options.onContinue(); });
            var stop = element('button', 'button button--chalk', t('ui.stop'));
            stop.type = 'button';
            stop.addEventListener('click', function () { options.onStop(); });
            actions.appendChild(keepGoing);
            actions.appendChild(stop);
            question.appendChild(actions);
            append(question, 0);
            keepGoing.focus({ preventScroll: true });
        }

        function hideLongRun() {
            if (question) {
                question.parentNode.removeChild(question);
                question = null;
            }
        }

        function finishNote(className, key) {
            removeInput();
            hideLongRun();
            var box = note(className);
            box.appendChild(element('p', 'console-message', t(key)));
            append(box, 0);
        }

        function showDone() {
            finishNote('console-note--done', 'ui.console.done');
        }

        /* Blocco coinvolto: testo della riga e, fuori da Main, la funzione (FR-ERR-01). */
        function blockLine(box, nodeId, functionName) {
            var text = nodeId ? options.describeBlock(nodeId) : null;
            if (text === null) {
                return;
            }
            var key = functionName && functionName !== 'Main' ? 'ui.error.blockInFunction' : 'ui.error.block';
            box.appendChild(element('p', 'console-block', t(key, { text: text, name: functionName })));
            var reveal = element('button', 'button button--chalk button--small', t('ui.error.showInDiagram'));
            reveal.type = 'button';
            reveal.addEventListener('click', function () { options.onReveal(nodeId); });
            box.appendChild(reveal);
        }

        /* Valore grezzo di una variabile o di un elemento; undefined = non ancora assegnato. */
        function valueText(type, value) {
            return value === null || value === undefined ? t('ui.value.none') : options.formatValue({ type: type, value: value });
        }

        /* Variabili della funzione al momento dell'errore (FR-ERR-03). */
        function variablesTable(box, variables, functionName) {
            box.appendChild(element('p', 'console-caption', t('ui.error.variables', { name: functionName || 'Main' })));
            if (variables.length === 0) {
                box.appendChild(element('p', 'console-muted', t('ui.error.noVariables')));
                return;
            }
            var table = element('table', 'console-variables');
            var head = element('thead');
            var headRow = element('tr');
            ['ui.variables.name', 'ui.variables.type', 'ui.variables.value'].forEach(function (key) {
                var cell = element('th', '', t(key));
                cell.scope = 'col';
                headRow.appendChild(cell);
            });
            head.appendChild(headRow);
            table.appendChild(head);
            var body = element('tbody');
            variables.forEach(function (variable) {
                var row = element('tr');
                row.appendChild(element('th', 'console-variable-name', variable.name));
                row.lastChild.scope = 'row';
                var type = variable.array
                    ? t('ui.variables.arrayType', { type: variable.type, size: String(variable.elements.length) })
                    : variable.type;
                row.appendChild(element('td', '', type));
                var value;
                if (variable.array) {
                    // Gli elementi mai assegnati sono buchi dell'array: map li salterebbe.
                    var shown = [];
                    for (var i = 0; i < Math.min(variable.elements.length, MAX_ELEMENTS_SHOWN); i++) {
                        shown.push(valueText(variable.type, variable.elements[i]));
                    }
                    value = '[' + shown.join('; ') + ']';
                    if (variable.elements.length > MAX_ELEMENTS_SHOWN) {
                        value += ' ' + t('ui.value.more', { count: String(variable.elements.length - MAX_ELEMENTS_SHOWN) });
                    }
                } else {
                    value = valueText(variable.type, variable.value);
                }
                row.appendChild(element('td', 'console-variable-value', value));
                body.appendChild(row);
            });
            table.appendChild(body);
            box.appendChild(table);
        }

        function runtimeNote(error, className) {
            removeInput();
            hideLongRun();
            var box = note(className);
            box.appendChild(element('p', 'console-message', options.formatError(error)));
            blockLine(box, error.nodeId, error.functionName);
            if (error.variables) {
                variablesTable(box, error.variables, error.functionName);
            }
            append(box, 0);
        }

        function showRuntimeError(error) {
            runtimeNote(error, 'console-note--error');
        }

        function showStopped(error) {
            runtimeNote(error, 'console-note--stopped');
        }

        /* Errori che impediscono l'esecuzione, tutti e nell'ordine dei blocchi (FR-RUN-02). */
        function showInvalid(errors) {
            removeInput();
            var box = note('console-note--error');
            box.appendChild(element('p', 'console-message', t('ui.console.invalid')));
            var list = element('ol', 'console-error-list');
            errors.forEach(function (error) {
                var item = element('li');
                item.appendChild(element('p', 'console-message', options.formatError(error)));
                blockLine(item, error.nodeId, null);
                list.appendChild(item);
            });
            box.appendChild(list);
            append(box, 0);
        }

        function clear() {
            pending = '';
            characters = 0;
            trimmed = false;
            input = null;
            question = null;
            log.textContent = '';
            if (options.trimmedNotice) {
                options.trimmedNotice.hidden = true;
            }
        }

        return {
            write: write,
            flush: flush,
            requestInput: requestInput,
            focusInput: focusInput,
            showLongRun: showLongRun,
            hideLongRun: hideLongRun,
            showDone: showDone,
            showStopped: showStopped,
            showRuntimeError: showRuntimeError,
            showInvalid: showInvalid,
            clear: clear,
            characters: function () { return characters; },
            hasInput: function () { return input !== null; }
        };
    }

    OnoFlow.ConsoleView = { create: create, MAX_CHARACTERS: MAX_CHARACTERS };
})(window.OnoFlow);
