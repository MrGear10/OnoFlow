/*
 * OnoFlow — elenco numerato degli errori sopra il foglio (FR-ERR-01, FR-RUN-02, DEC-057).
 *
 * Dipendenze: js/namespace.js.
 * Definisce: OnoFlow.DiagramErrors.render
 *
 * Sul disegno ogni errore ha solo i suoi segni (cerchio di penna rossa, numero, onda); il
 * messaggio sta qui, con lo stesso numero e il testo del blocco. Un tocco su un messaggio
 * inquadra il suo blocco nel diagramma.
 *
 *     render(container, errori, { t, formatError, describeBlock(id), formatCount(n), onSelect(id), runtime })
 * runtime: l'errore ha fermato l'esecuzione (non è uno di quelli che la impediscono).
 * Con un elenco vuoto container si nasconde. Ogni testo entra come testo (NFR-SEC-01).
 */
(function (OnoFlow) {
    'use strict';

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

    function render(container, errors, options) {
        var t = options.t;
        container.textContent = '';
        container.hidden = errors.length === 0;
        if (errors.length === 0) {
            return;
        }
        var summary;
        if (options.runtime) {
            summary = t('ui.diagram.runtimeError');
        } else if (errors.length === 1) {
            summary = t('ui.diagram.errorsOne');
        } else {
            summary = t('ui.diagram.errors', { count: options.formatCount(errors.length) });
        }
        container.appendChild(element('p', 'diagram-errors-summary', summary));
        var list = element('ol', 'diagram-errors-list');
        errors.forEach(function (error, index) {
            var item = element('li', 'diagram-error');
            var content = element(error.nodeId ? 'button' : 'div', 'diagram-error-entry');
            if (error.nodeId) {
                content.type = 'button';
                content.addEventListener('click', function () {
                    options.onSelect(error.nodeId);
                });
            }
            content.appendChild(element('span', 'diagram-error-number', String(index + 1)));
            var body = element('span', 'diagram-error-body');
            body.appendChild(element('span', 'diagram-error-message', options.formatError(error)));
            var described = error.nodeId ? options.describeBlock(error.nodeId) : null;
            if (described) {
                body.appendChild(element('span', 'diagram-error-block', described));
            }
            content.appendChild(body);
            item.appendChild(content);
            list.appendChild(item);
        });
        container.appendChild(list);
    }

    OnoFlow.DiagramErrors = { render: render };
})(window.OnoFlow);
