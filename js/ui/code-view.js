/*
 * OnoFlow — pannello del codice generato (fase 3, passo 22, FR-GEN-01, DEC-093).
 *
 * Dipendenze: js/namespace.js.
 * Definisce: OnoFlow.CodeView.{create, highlight, LANGUAGES}
 *
 * Un pannello, non una finestra modale (B1), come la finestra di modifica: sul computer prende
 * il posto della console, con il diagramma accanto; sul telefono è a tutto schermo. In alto le
 * schede C++ e Python e Chiudi; in mezzo il codice, colorato e con i numeri di riga; in fondo
 * Copia e Scarica. Il codice lo dà chi apre il pannello (app.js), che lo rigenera quando il
 * diagramma cambia; se il diagramma ha errori, al posto del codice c'è la spiegazione.
 *
 *     create(host, { t, onLanguage(language), onCopy(language), onDownload(language), onClose() }) →
 *         { open({ focus }), close(), isOpen(), language(), showCode(text), showProblem(message),
 *           copied(ok), element }
 *
 * Ogni testo entra come testo, mai come HTML (NFR-SEC-01).
 */
(function (OnoFlow) {
    'use strict';

    var LANGUAGES = ['cpp', 'python'];

    var KEYWORDS = {
        cpp: ['bool', 'break', 'case', 'catch', 'char', 'const', 'continue', 'do', 'double', 'else', 'false', 'for',
            'if', 'int', 'return', 'sizeof', 'static_cast', 'std', 'true', 'try', 'void', 'while', 'auto'],
        python: ['False', 'None', 'True', 'and', 'as', 'break', 'continue', 'def', 'elif', 'else', 'except', 'for',
            'from', 'if', 'import', 'in', 'is', 'not', 'or', 'pass', 'return', 'try', 'while']
    };

    /*
     * Pezzi colorati di una riga: [{ text, kind }] con kind 'keyword', 'string', 'number',
     * 'comment', 'directive' oppure '' (testo normale). Basta per il codice che genera OnoFlow:
     * testi tra virgolette senza a capo, commenti di riga, numeri, parole chiave.
     */
    function highlight(line, language) {
        var pieces = [];
        var comment = language === 'python' ? '#' : '//';
        var keywords = KEYWORDS[language] || [];
        var i = 0;
        var plain = '';
        function flush() {
            if (plain) {
                pieces.push({ text: plain, kind: '' });
                plain = '';
            }
        }
        if (language === 'cpp' && /^\s*#/.test(line)) {
            return [{ text: line, kind: 'directive' }];
        }
        while (i < line.length) {
            var rest = line.slice(i);
            var match;
            if (rest.indexOf(comment) === 0) {
                flush();
                pieces.push({ text: rest, kind: 'comment' });
                break;
            }
            if ((match = /^"(?:[^"\\]|\\.)*"?|^'(?:[^'\\]|\\.)*'?/.exec(rest))) {
                flush();
                pieces.push({ text: match[0], kind: 'string' });
                i += match[0].length;
                continue;
            }
            if ((match = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest))) {
                if (keywords.indexOf(match[0]) !== -1) {
                    flush();
                    pieces.push({ text: match[0], kind: 'keyword' });
                } else {
                    plain += match[0];
                }
                i += match[0].length;
                continue;
            }
            if ((match = /^[0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?/.exec(rest))) {
                flush();
                pieces.push({ text: match[0], kind: 'number' });
                i += match[0].length;
                continue;
            }
            plain += line.charAt(i);
            i++;
        }
        flush();
        return pieces;
    }

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

    var idCount = 0;

    function create(host, options) {
        var t = options.t;
        var current = 'cpp';
        var codeText = '';
        var number = ++idCount;

        var panel = element('section', 'code-view');
        panel.hidden = true;
        panel.setAttribute('role', 'region');
        panel.setAttribute('aria-labelledby', 'code-title-' + number);

        var header = element('div', 'code-header');
        var title = element('h2', 'code-title', t('ui.code.title'));
        title.id = 'code-title-' + number;
        var tabList = element('div', 'code-tabs');
        tabList.setAttribute('role', 'tablist');
        tabList.setAttribute('aria-label', t('ui.code.languages'));
        var tabs = {};
        LANGUAGES.forEach(function (language) {
            var tab = element('button', 'code-tab', t('ui.code.language.' + language));
            tab.type = 'button';
            tab.id = 'code-tab-' + language + '-' + number;
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-controls', 'code-body-' + number);
            tab.setAttribute('data-language', language);
            tab.addEventListener('click', function () { choose(language, false); });
            tab.addEventListener('keydown', function (event) {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    choose(LANGUAGES[(LANGUAGES.indexOf(language) + 1) % LANGUAGES.length], true);
                }
            });
            tabs[language] = tab;
            tabList.appendChild(tab);
        });
        var close = element('button', 'button button--quiet code-close', t('ui.notice.close'));
        close.type = 'button';
        header.appendChild(title);
        header.appendChild(tabList);
        header.appendChild(close);

        var body = element('div', 'code-body');
        body.id = 'code-body-' + number;
        body.setAttribute('role', 'tabpanel');
        body.tabIndex = 0;
        var pre = element('pre', 'code-text');
        var code = element('code');
        pre.appendChild(code);
        var problem = element('p', 'code-problem');
        problem.hidden = true;
        body.appendChild(pre);
        body.appendChild(problem);

        var footer = element('div', 'code-actions');
        var copy = element('button', 'button code-copy');
        copy.type = 'button';
        var copyLabel = element('span', 'button-label', t('ui.code.copy'));
        copy.appendChild(icon('M7 7V4.5A1.5 1.5 0 0 1 8.5 3h7A1.5 1.5 0 0 1 17 4.5v7a1.5 1.5 0 0 1-1.5 1.5H13M4.5 7h7A1.5 1.5 0 0 1 13 8.5v7a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 3 15.5v-7A1.5 1.5 0 0 1 4.5 7z'));
        copy.appendChild(copyLabel);
        var download = element('button', 'button code-download');
        download.type = 'button';
        var downloadLabel = element('span', 'button-label');
        download.appendChild(icon('M10 3v10M6 9l4 4 4-4M4 16.5h12'));
        download.appendChild(downloadLabel);
        var status = element('p', 'code-status');
        status.setAttribute('role', 'status');
        footer.appendChild(copy);
        footer.appendChild(download);
        footer.appendChild(status);

        panel.appendChild(header);
        panel.appendChild(body);
        panel.appendChild(footer);
        host.appendChild(panel);

        function icon(path) {
            var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('class', 'icon');
            svg.setAttribute('viewBox', '0 0 20 20');
            svg.setAttribute('aria-hidden', 'true');
            var shape = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            shape.setAttribute('d', path);
            svg.appendChild(shape);
            return svg;
        }

        function markTabs() {
            LANGUAGES.forEach(function (language) {
                var selected = language === current;
                tabs[language].setAttribute('aria-selected', selected ? 'true' : 'false');
                tabs[language].tabIndex = selected ? 0 : -1;
            });
            body.setAttribute('aria-labelledby', tabs[current].id);
            downloadLabel.textContent = t('ui.code.download.' + current);
        }

        function choose(language, focus) {
            if (language !== current) {
                current = language;
                markTabs();
                status.textContent = '';
                if (options.onLanguage) {
                    options.onLanguage(language);
                }
            }
            if (focus) {
                tabs[language].focus();
            }
        }

        function showCode(text) {
            codeText = text;
            problem.hidden = true;
            pre.hidden = false;
            copy.disabled = false;
            download.disabled = false;
            code.textContent = '';
            text.replace(/\n$/, '').split('\n').forEach(function (line) {
                var row = element('span', 'code-line');
                highlight(line, current).forEach(function (piece) {
                    row.appendChild(piece.kind ? element('span', 'code-' + piece.kind, piece.text) : document.createTextNode(piece.text));
                });
                row.appendChild(document.createTextNode('\n'));
                code.appendChild(row);
            });
        }

        function showProblem(message) {
            codeText = '';
            pre.hidden = true;
            code.textContent = '';
            problem.hidden = false;
            problem.textContent = message;
            copy.disabled = true;
            download.disabled = true;
        }

        function open(openOptions) {
            markTabs();
            status.textContent = '';
            panel.hidden = false;
            if (!openOptions || openOptions.focus !== false) {
                tabs[current].focus({ preventScroll: true });
            }
        }

        function hide() {
            if (panel.hidden) {
                return;
            }
            panel.hidden = true;
            if (options.onClose) {
                options.onClose();
            }
        }

        close.addEventListener('click', hide);
        panel.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                hide();
            }
        });
        copy.addEventListener('click', function () { options.onCopy(current, codeText); });
        download.addEventListener('click', function () { options.onDownload(current, codeText); });

        return {
            open: open,
            close: hide,
            isOpen: function () { return !panel.hidden; },
            language: function () { return current; },
            showCode: showCode,
            showProblem: showProblem,
            /* Esito di Copia, detto a voce e scritto accanto ai pulsanti. */
            copied: function (ok) {
                status.textContent = t(ok ? 'ui.code.copied' : 'ui.code.copyFailed');
            },
            element: panel
        };
    }

    OnoFlow.CodeView = { create: create, highlight: highlight, LANGUAGES: LANGUAGES };
})(window.OnoFlow);
