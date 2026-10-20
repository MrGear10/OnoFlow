/*
 * OnoFlow — applicazione: collega i moduli alla pagina (§10.2, §11.1).
 *
 * Dipendenze: tutti gli script di js/, caricati prima da index.html.
 * Definisce: OnoFlow.App.start
 *
 * Tiene lo stato del diagramma aperto (programma, formato del file, testo di origine,
 * nome del file, salvato o no) e lo collega a:
 *   - barra superiore: nome del file (B2), stato dell'esecuzione, Esegui, Pausa, Ferma, menu;
 *   - zona del diagramma: schema provvisorio fino al passo 7 (js/ui/diagram-outline.js);
 *   - console (js/ui/console-view.js) e scheduler (js/core/scheduler.js);
 *   - avvisi in linea sotto la barra, mai finestre modali (B1, FR-CON-03);
 *   - schede Diagramma e Console sul telefono (D-11, FR-MOB-01, FR-MOB-02);
 *   - copia di sessione per il ripristino (FR-MOB-15, NFR-PRIV-08).
 * Ogni testo viene dal catalogo (NFR-I18N-01) e ogni dato del file entra come testo (NFR-SEC-01).
 */
(function (OnoFlow) {
    'use strict';

    var Localization = OnoFlow.Localization;
    var Model = OnoFlow.Model;
    var Format = OnoFlow.Format;
    var StaticCheck = OnoFlow.StaticCheck;
    var Scheduler = OnoFlow.Scheduler;
    var NumberFormat = OnoFlow.NumberFormat;
    var Examples = OnoFlow.Examples;
    var BlockText = OnoFlow.BlockText;
    var DiagramOutline = OnoFlow.DiagramOutline;
    var ConsoleView = OnoFlow.ConsoleView;
    var SessionCopy = OnoFlow.SessionCopy;

    var DEFAULT_EXTENSION = '.fprg';
    var MAX_FILE_BYTES = 5 * 1024 * 1024; // NFR-PERF-02
    var HOSTING_PRIVACY_URL = 'https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement';
    // Differenza di altezza oltre la quale si considera aperta la tastiera del telefono.
    var KEYBOARD_THRESHOLD_PX = 120;
    var ACTIVE_STATES = ['running', 'paused', 'waitingInput'];

    var t = Localization.t;
    var formatError = Localization.formatError;

    function byId(id) {
        return document.getElementById(id);
    }

    /* Testi della pagina: data-i18n → testo, data-i18n-label → aria-label. */
    function translatePage(root) {
        Array.prototype.forEach.call(root.querySelectorAll('[data-i18n]'), function (node) {
            node.textContent = t(node.getAttribute('data-i18n'));
        });
        Array.prototype.forEach.call(root.querySelectorAll('[data-i18n-label]'), function (node) {
            node.setAttribute('aria-label', t(node.getAttribute('data-i18n-label')));
        });
    }

    /* Nome del file da proporre al salvataggio: mai vuoto, sempre con l'estensione .fprg. */
    function normalizeFileName(name) {
        var text = String(name || '').trim();
        if (text === '') {
            return t('ui.fileName.default');
        }
        return /\.fprg$/i.test(text) ? text : text + DEFAULT_EXTENSION;
    }

    function start() {
        var language = Localization.init(window.location.search, window.navigator.languages);
        document.documentElement.lang = language;
        translatePage(document);

        var numberFormat = Localization.numberFormat();
        var session = SessionCopy.create(SessionCopy.defaultStorage());
        var narrow = window.matchMedia('(max-width: 55.99rem)');

        var app = byId('app');
        var fileNameField = byId('file-name');
        var modifiedMark = byId('modified');
        var statusLabel = byId('status');
        var runButton = byId('run');
        var pauseButton = byId('pause');
        var pauseLabel = byId('pause-label');
        var stopButton = byId('stop');
        var menuButton = byId('menu-button');
        var menu = byId('menu');
        var fileInput = byId('file-input');
        var notices = byId('notices');
        var diagram = byId('diagram');
        var diagramSummary = byId('diagram-summary');
        var consoleEmpty = byId('console-empty');
        var tabs = { diagram: byId('tab-diagram'), console: byId('tab-console') };
        var commands = {
            'new': byId('cmd-new'),
            open: byId('cmd-open'),
            save: byId('cmd-save'),
            undo: byId('cmd-undo'),
            redo: byId('cmd-redo')
        };

        var state = {
            program: null,
            format: Format.DEFAULT_FILE_FORMAT,
            sourceText: '',
            fileName: t('ui.fileName.default'),
            saved: true,
            staticErrors: [],
            scheduler: null,
            outcome: null,
            outline: null
        };

        function formatValue(value) {
            var text = NumberFormat.formatValue(value.type, value.value, numberFormat);
            return value.type === 'String' ? '"' + text + '"' : text;
        }

        function describeBlock(nodeId) {
            var found = state.program ? Model.findById(state.program, nodeId) : null;
            if (!found) {
                return null;
            }
            if (found.node.kind === undefined) { // è una funzione, non un blocco
                return t('ui.diagram.function', { name: found.node.name });
            }
            return BlockText.plainText(found.node, t, 'head');
        }

        // --- Schede sul telefono (D-11) ---------------------------------------------

        function showTab(name, options) {
            app.setAttribute('data-tab', name);
            Object.keys(tabs).forEach(function (key) {
                var selected = key === name;
                tabs[key].setAttribute('aria-selected', selected ? 'true' : 'false');
                tabs[key].tabIndex = selected ? 0 : -1;
            });
            if (name === 'console') {
                tabs.console.removeAttribute('data-badge');
            }
            if (options && options.focus) {
                tabs[name].focus();
            }
        }

        /* Segno sulla scheda Console quando arriva qualcosa che non si vede (solo telefono). */
        function badgeConsole(kind) {
            if (narrow.matches && app.getAttribute('data-tab') !== 'console') {
                if (kind === 'error' || tabs.console.getAttribute('data-badge') !== 'error') {
                    tabs.console.setAttribute('data-badge', kind);
                }
            }
        }

        Object.keys(tabs).forEach(function (key) {
            tabs[key].addEventListener('click', function () { showTab(key); });
            tabs[key].addEventListener('keydown', function (event) {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    showTab(key === 'diagram' ? 'console' : 'diagram', { focus: true });
                }
            });
        });

        // --- Avvisi in linea (B1) --------------------------------------------------

        function clearNotices() {
            notices.textContent = '';
        }

        /* Barra non bloccante sotto la barra superiore; kind: 'error', 'warning', 'info'. */
        function notice(kind, message, items) {
            var bar = document.createElement('div');
            bar.className = 'notice notice--' + kind;
            bar.setAttribute('role', kind === 'error' ? 'alert' : 'status');
            var body = document.createElement('div');
            body.className = 'notice-body';
            var text = document.createElement('p');
            text.textContent = message;
            body.appendChild(text);
            if (items && items.length) {
                var list = document.createElement('ul');
                items.forEach(function (item) {
                    var entry = document.createElement('li');
                    entry.textContent = item;
                    list.appendChild(entry);
                });
                body.appendChild(list);
            }
            bar.appendChild(body);
            var close = document.createElement('button');
            close.type = 'button';
            close.className = 'button button--quiet notice-close';
            close.textContent = t('ui.notice.close');
            close.addEventListener('click', function () {
                bar.parentNode.removeChild(bar);
            });
            bar.appendChild(close);
            notices.appendChild(bar);
        }

        // --- Diagramma aperto ------------------------------------------------------

        function storeSessionCopy() {
            session.save({ text: state.sourceText, fileName: state.fileName, saved: state.saved });
        }

        function updateFileState() {
            fileNameField.value = state.fileName;
            modifiedMark.hidden = state.saved;
        }

        function showStaticErrors() {
            state.outline.setErrors(state.staticErrors);
            var count = state.staticErrors.length;
            diagramSummary.hidden = count === 0;
            diagramSummary.textContent = count === 1
                ? t('ui.diagram.errorsOne')
                : t('ui.diagram.errors', { count: NumberFormat.formatInteger(count, numberFormat) });
        }

        /* Mostra un programma caricato; options: { saved }. */
        function useProgram(program, format, sourceText, fileName, options) {
            state.program = program;
            state.format = format;
            state.sourceText = sourceText;
            state.fileName = normalizeFileName(fileName);
            state.saved = options.saved;
            state.outcome = null;
            state.outline = DiagramOutline.render(diagram, program, { t: t, formatError: formatError });
            // Errori che impediscono l'esecuzione già all'apertura (FR-ERR-04, L-12).
            state.staticErrors = StaticCheck.check(program);
            showStaticErrors();
            consoleView.clear();
            consoleEmpty.hidden = false;
            updateFileState();
            updateControls();
            storeSessionCopy();
        }

        function newProgram() {
            var program = Model.createEmptyProgram();
            useProgram(program, Format.DEFAULT_FILE_FORMAT, Format.exportFprg(program), '', { saved: true });
        }

        /* Apre un testo .fprg; se non si apre, il diagramma di prima resta (FR-FILE-04). */
        function openText(text, fileName) {
            var result = Format.importFprg(text);
            clearNotices();
            if (!result.ok) {
                notice('error', t('ui.notice.openFailed', { name: fileName, message: formatError(result.error) }));
                return false;
            }
            useProgram(result.program, result.format, text, fileName, { saved: true });
            if (result.warnings.length) {
                notice('warning', t('ui.notice.warnings', { name: state.fileName }), result.warnings.map(formatError));
            }
            if (narrow.matches) {
                showTab('diagram');
            }
            return true;
        }

        function openFile(file) {
            if (isActive()) {
                return;
            }
            if (file.size > MAX_FILE_BYTES) {
                clearNotices();
                notice('error', t('ui.notice.openFailed', {
                    name: file.name,
                    message: formatError({ code: 'ERR_LOAD_FILE_TOO_LARGE', params: { max: '5' } })
                }));
                return;
            }
            var reader = new FileReader();
            reader.onload = function () {
                openText(String(reader.result), file.name);
            };
            reader.onerror = function () {
                clearNotices();
                notice('error', t('ui.notice.readFailed', { name: file.name }));
            };
            reader.readAsText(file);
        }

        /* Salvataggio come download, con il nome del campo nella barra (FR-FILE-02, FR-MOB-12). */
        function save() {
            var name = normalizeFileName(fileNameField.value);
            var text = Format.exportFprg(state.program, { format: state.format, now: new Date() });
            // application/octet-stream: su iOS il file arriva con il suo nome e .fprg (FR-MOB-20, da verificare).
            var blob = new Blob([text], { type: 'application/octet-stream' });
            var link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = name;
            link.hidden = true;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 10000);
            state.fileName = name;
            state.sourceText = text;
            state.saved = true;
            updateFileState();
            storeSessionCopy();
        }

        // --- Esecuzione ------------------------------------------------------------

        function schedulerState() {
            return state.scheduler ? state.scheduler.state() : 'idle';
        }

        function isActive() {
            return ACTIVE_STATES.indexOf(schedulerState()) !== -1;
        }

        function statusText() {
            var current = schedulerState();
            if (current !== 'finished') {
                return current === 'idle' ? '' : t('ui.status.' + current);
            }
            if (!state.outcome) {
                return '';
            }
            if (state.outcome.status === 'error') {
                return t(state.outcome.error.code === 'ERR_STOPPED' ? 'ui.status.stopped' : 'ui.status.error');
            }
            return t('ui.status.' + state.outcome.status);
        }

        /* Nome dello stato per i segni della barra; Ferma non è un errore (niente penna rossa). */
        function runStateName(current) {
            if (current !== 'finished' || !state.outcome) {
                return current;
            }
            if (state.outcome.status === 'error' && state.outcome.error.code === 'ERR_STOPPED') {
                return 'finished-stopped';
            }
            return 'finished-' + state.outcome.status;
        }

        function updateControls() {
            var current = schedulerState();
            var active = isActive();
            runButton.disabled = active;
            stopButton.disabled = !active;
            // Pausa non ha effetto mentre si attende un valore (§11.1).
            pauseButton.disabled = current !== 'running' && current !== 'paused';
            pauseLabel.textContent = t(current === 'paused' ? 'ui.resume' : 'ui.pause');
            pauseButton.setAttribute('aria-pressed', current === 'paused' ? 'true' : 'false');
            commands['new'].disabled = active;
            commands.open.disabled = active;
            Array.prototype.forEach.call(menu.querySelectorAll('[data-example]'), function (item) {
                item.disabled = active;
            });
            app.setAttribute('data-run-state', runStateName(current));
            statusLabel.textContent = statusText();
            statusLabel.hidden = statusLabel.textContent === '';
        }

        function finish(outcome) {
            state.outcome = outcome;
            consoleView.flush();
            state.outline.setRunning(null);
            if (outcome.status === 'done') {
                consoleView.showDone();
                badgeConsole('new');
            } else if (outcome.status === 'invalid') {
                consoleView.showInvalid(outcome.errors);
                state.outline.setErrors(outcome.errors);
                badgeConsole('error');
            } else if (outcome.error.code === 'ERR_STOPPED') {
                consoleView.showStopped(outcome.error);
            } else {
                consoleView.showRuntimeError(outcome.error);
                state.outline.setErrors([outcome.error]);
                badgeConsole('error');
            }
            updateControls();
        }

        function run() {
            if (isActive()) {
                return;
            }
            closeMenu();
            consoleView.clear();
            consoleEmpty.hidden = true;
            showStaticErrors();
            state.outcome = null;
            // All'avvio la console viene in primo piano (FR-MOB-02, D-11).
            showTab('console');
            state.scheduler = Scheduler.create(state.program, {
                numberFormat: numberFormat,
                invalidInput: 'retry',
                onOutput: function (event) {
                    consoleView.write(event.text, event.newline);
                },
                onStep: function (nodeId) {
                    consoleView.flush();
                    state.outline.setRunning(nodeId);
                },
                onInput: function (event) {
                    state.outline.setRunning(event.nodeId);
                    state.outline.reveal(event.nodeId, { quiet: true });
                    consoleView.requestInput(event);
                    if (narrow.matches) {
                        showTab('console');
                    }
                    updateControls();
                },
                onStateChange: updateControls,
                onLongRun: function () {
                    consoleView.flush();
                    consoleView.showLongRun();
                    if (narrow.matches) {
                        showTab('console');
                    }
                },
                onFinish: finish
            });
            state.scheduler.start();
        }

        function togglePause() {
            var current = schedulerState();
            if (current === 'running') {
                state.scheduler.pause();
                state.outline.reveal(state.scheduler.currentNodeId(), { quiet: true });
            } else if (current === 'paused') {
                consoleView.hideLongRun();
                state.scheduler.resume();
            }
        }

        function stop() {
            if (isActive()) {
                state.scheduler.stop();
            }
        }

        var consoleView = ConsoleView.create(byId('console-log'), {
            t: t,
            formatError: formatError,
            formatValue: formatValue,
            describeBlock: describeBlock,
            scroller: byId('console-scroll'),
            trimmedNotice: byId('console-trimmed'),
            onSubmitInput: function (text) {
                state.scheduler.provideInput(text);
            },
            onContinue: function () {
                consoleView.hideLongRun();
                state.scheduler.resume();
            },
            onStop: stop,
            onReveal: function (nodeId) {
                showTab('diagram');
                state.outline.reveal(nodeId);
            }
        });

        runButton.addEventListener('click', run);
        pauseButton.addEventListener('click', togglePause);
        stopButton.addEventListener('click', stop);

        // --- Menu ------------------------------------------------------------------

        function menuItems() {
            return Array.prototype.filter.call(menu.querySelectorAll('[role="menuitem"]'), function (item) {
                return !item.disabled;
            });
        }

        function openMenu() {
            menu.hidden = false;
            menuButton.setAttribute('aria-expanded', 'true');
            var items = menuItems();
            if (items.length) {
                items[0].focus();
            }
        }

        function closeMenu(options) {
            if (menu.hidden) {
                return;
            }
            menu.hidden = true;
            menuButton.setAttribute('aria-expanded', 'false');
            if (options && options.restoreFocus) {
                menuButton.focus();
            }
        }

        menuButton.addEventListener('click', function () {
            if (menu.hidden) {
                openMenu();
            } else {
                closeMenu();
            }
        });

        menu.addEventListener('keydown', function (event) {
            var items = menuItems();
            var index = items.indexOf(document.activeElement);
            if (event.key === 'Escape') {
                event.preventDefault();
                closeMenu({ restoreFocus: true });
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                var step = event.key === 'ArrowDown' ? 1 : -1;
                items[(index + step + items.length) % items.length].focus();
            } else if (event.key === 'Home' || event.key === 'End') {
                event.preventDefault();
                items[event.key === 'Home' ? 0 : items.length - 1].focus();
            } else if (event.key === 'Tab') {
                closeMenu();
            }
        });

        document.addEventListener('pointerdown', function (event) {
            if (!menu.hidden && !menu.contains(event.target) && !menuButton.contains(event.target)) {
                closeMenu();
            }
        });

        Examples.list.forEach(function (example) {
            var item = document.createElement('button');
            item.type = 'button';
            item.className = 'menu-item';
            item.setAttribute('role', 'menuitem');
            item.setAttribute('data-example', example.id);
            item.textContent = t(example.titleKey);
            item.addEventListener('click', function () {
                closeMenu();
                openText(example.text, example.fileName);
            });
            byId('examples-list').appendChild(item);
        });

        commands['new'].addEventListener('click', function () {
            closeMenu();
            clearNotices();
            newProgram();
        });
        commands.open.addEventListener('click', function () {
            closeMenu();
            fileInput.click();
        });
        commands.save.addEventListener('click', function () {
            closeMenu();
            save();
        });
        // Annulla e Ripeti arrivano con l'editor (passo 12): per ora restano disabilitati.
        commands.undo.disabled = true;
        commands.redo.disabled = true;

        fileInput.addEventListener('change', function () {
            if (fileInput.files && fileInput.files[0]) {
                openFile(fileInput.files[0]);
            }
            fileInput.value = '';
        });

        // Trascinamento di un file sulla pagina: solo una comodità da computer (FR-MOB-11).
        document.addEventListener('dragover', function (event) {
            if (event.dataTransfer && Array.prototype.indexOf.call(event.dataTransfer.types, 'Files') !== -1) {
                event.preventDefault();
            }
        });
        document.addEventListener('drop', function (event) {
            if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                event.preventDefault();
                openFile(event.dataTransfer.files[0]);
            }
        });

        fileNameField.addEventListener('change', function () {
            state.fileName = normalizeFileName(fileNameField.value);
            updateFileState();
            storeSessionCopy();
        });

        // --- Piè di pagina (FR-INFO-01, FR-INFO-03, FR-INFO-04) ------------------------

        var hosting = byId('footer-hosting');
        if (window.location.protocol === 'file:') {
            hosting.textContent = t('ui.footer.local');
        } else {
            hosting.textContent = t('ui.footer.hosting') + ' ';
            var link = document.createElement('a');
            link.href = HOSTING_PRIVACY_URL;
            link.rel = 'noopener';
            link.textContent = t('ui.footer.hostingLink');
            hosting.appendChild(link);
        }

        // --- Tastiera del telefono (FR-MOB-19) -----------------------------------------

        // Su iOS la tastiera non ridimensiona la pagina: l'altezza utile viene da visualViewport.
        // Su Android (interactive-widget=resizes-content) si riduce anche la pagina: per questo il
        // confronto è con l'altezza più grande vista alla stessa larghezza, non con innerHeight.
        var viewport = window.visualViewport;
        if (viewport) {
            var fullHeight = 0;
            var fullWidth = 0;
            var keyboardOpen = false;
            var syncViewport = function () {
                if (viewport.width !== fullWidth) {
                    fullWidth = viewport.width; // rotazione: si riparte da capo
                    fullHeight = 0;
                }
                fullHeight = Math.max(fullHeight, viewport.height);
                document.documentElement.style.setProperty('--viewport-height', viewport.height + 'px');
                var open = fullHeight - viewport.height > KEYBOARD_THRESHOLD_PX;
                app.classList.toggle('keyboard-open', open);
                if (viewport.offsetTop > 0) {
                    window.scrollTo(0, 0);
                }
                if (open && !keyboardOpen) {
                    consoleView.focusInput(); // il campo resta sopra la tastiera (FR-MOB-02)
                }
                keyboardOpen = open;
            };
            viewport.addEventListener('resize', syncViewport);
            viewport.addEventListener('scroll', syncViewport);
            syncViewport();
        }

        // --- Avvio: copia di sessione, altrimenti un foglio vuoto ----------------------

        showTab('diagram');
        var copy = session.load();
        var restored = copy ? Format.importFprg(copy.text) : null;
        if (restored && restored.ok) {
            useProgram(restored.program, restored.format, copy.text, copy.fileName, { saved: copy.saved });
            notice('info', t(copy.saved ? 'ui.notice.restored.saved' : 'ui.notice.restored.unsaved'));
        } else {
            newProgram();
        }
        app.removeAttribute('data-loading');
    }

    OnoFlow.App = { start: start, normalizeFileName: normalizeFileName };
})(window.OnoFlow);
