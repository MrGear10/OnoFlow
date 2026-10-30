/*
 * OnoFlow — applicazione: collega i moduli alla pagina (§10.2, §11.1).
 *
 * Dipendenze: tutti gli script di js/, caricati prima da index.html.
 * Definisce: OnoFlow.App.start
 *
 * Tiene il diagramma aperto come documento (js/core/diagram-document.js: programma, formato,
 * origine, nome del file, modificato o no) e lo collega a:
 *   - barra superiore: nome del file (B2), stato dell'esecuzione, Esegui, Pausa, Ferma, menu;
 *   - zona del diagramma: disegno SVG (js/ui/diagram-renderer.js), elenco degli errori sopra il
 *     foglio (js/ui/diagram-errors.js), scorrimento e zoom (js/ui/diagram-viewport.js);
 *   - console (js/ui/console-view.js) e scheduler (js/core/scheduler.js);
 *   - avvisi in linea sotto la barra, mai finestre modali (B1, FR-CON-03);
 *   - schede Diagramma e Console sul telefono (D-11, FR-MOB-01, FR-MOB-02);
 *   - copia di sessione per il ripristino (FR-MOB-15, NFR-PRIV-08);
 *   - avviso delle modifiche non salvate prima di Nuovo, Apri, Esempi, trascinamento e alla
 *     chiusura della pagina (FR-FILE-08);
 *   - editor: punti di inserimento sulle frecce, selezione di un blocco con "Modifica" e
 *     "Inserisci dopo", menu dei blocchi, finestra di modifica (js/ui/block-menu.js,
 *     js/ui/block-editor.js, js/core/editor.js; FR-EDIT-01…03, FR-EDIT-08, DEC-063, DEC-066),
 *     cancellazione (FR-EDIT-04, DEC-067), annulla/ripeti (js/core/history.js; FR-EDIT-05, DEC-068);
 *   - passo-passo (FR-RUN-05, DEC-074) e pannello delle variabili (js/ui/variables-view.js;
 *     FR-RUN-06, DEC-075): in cima alla console, e sul telefono una striscia sotto il diagramma.
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
    var DiagramRenderer = OnoFlow.DiagramRenderer;
    var DiagramErrors = OnoFlow.DiagramErrors;
    var DiagramViewport = OnoFlow.DiagramViewport;
    var ConsoleView = OnoFlow.ConsoleView;
    var SessionCopy = OnoFlow.SessionCopy;
    var DiagramDocument = OnoFlow.DiagramDocument;
    var Editor = OnoFlow.Editor;
    var BlockMenu = OnoFlow.BlockMenu;
    var BlockEditor = OnoFlow.BlockEditor;
    var History = OnoFlow.History;
    var VariablesView = OnoFlow.VariablesView;
    var Theme = OnoFlow.Theme;

    var DEFAULT_EXTENSION = '.fprg';
    var MAX_FILE_BYTES = 5 * 1024 * 1024; // NFR-PERF-02
    var HOSTING_PRIVACY_URL = 'https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement';
    // Differenza di altezza oltre la quale si considera aperta la tastiera del telefono.
    var KEYBOARD_THRESHOLD_PX = 120;
    var ACTIVE_STATES = ['running', 'paused', 'waitingInput'];
    // Metà dell'area di tocco minima (44 px, FR-MOB-04): vale a ogni zoom.
    var TOUCH_RADIUS_PX = 22;

    var t = Localization.t;
    var formatError = Localization.formatError;

    function byId(id) {
        return document.getElementById(id);
    }

    /* Testi della pagina: data-i18n → testo, data-i18n-label → aria-label, data-i18n-title → title. */
    function translatePage(root) {
        Array.prototype.forEach.call(root.querySelectorAll('[data-i18n]'), function (node) {
            node.textContent = t(node.getAttribute('data-i18n'));
        });
        Array.prototype.forEach.call(root.querySelectorAll('[data-i18n-label]'), function (node) {
            node.setAttribute('aria-label', t(node.getAttribute('data-i18n-label')));
        });
        Array.prototype.forEach.call(root.querySelectorAll('[data-i18n-title]'), function (node) {
            node.setAttribute('title', t(node.getAttribute('data-i18n-title')));
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

        // Tema: quello del sistema, oppure scelto dal menu o con ?tema= (DEC-080).
        var theme = Theme.create(document.documentElement, window.matchMedia('(prefers-color-scheme: dark)'),
            document.querySelectorAll('meta[name="theme-color"]'));
        var themeButton = byId('theme-toggle');
        var themeItem = byId('cmd-theme');
        function showTheme(current) {
            // La documentazione si apre con lo stesso tema, se è stato scelto a mano (DEC-081).
            var chosen = document.documentElement.getAttribute('data-theme');
            Array.prototype.forEach.call(document.querySelectorAll('[data-docs-link]'), function (link) {
                link.setAttribute('href', 'documentazione.html' + (chosen ? '?tema=' + (chosen === 'dark' ? 'scuro' : 'chiaro') : ''));
            });
            var target = current === 'dark' ? 'light' : 'dark';
            var label = t(target === 'light' ? 'ui.theme.toLight' : 'ui.theme.toDark');
            themeItem.textContent = label;
            themeButton.setAttribute('data-target', target);
            themeButton.setAttribute('aria-label', label);
            themeButton.title = label;
        }
        theme.onChange(showTheme);
        if (Theme.fromQuery(window.location.search)) {
            theme.set(Theme.fromQuery(window.location.search));
        }
        showTheme(theme.effective());
        themeButton.addEventListener('click', function () { theme.toggle(); });

        var numberFormat = Localization.numberFormat();
        var session = SessionCopy.create(SessionCopy.defaultStorage());
        var narrow = window.matchMedia('(max-width: 55.99rem)');
        // Da 80rem in su crescono testo e quadretto (css/tokens.css): il disegno va rifatto.
        var large = window.matchMedia('(min-width: 80rem)');

        var app = byId('app');
        var fileNameField = byId('file-name');
        var modifiedMark = byId('modified');
        var statusLabel = byId('status');
        var runButton = byId('run');
        var stepButtons = [byId('step'), byId('step-sheet')];
        var pauseButton = byId('pause');
        var pauseLabel = byId('pause-label');
        var stopButton = byId('stop');
        var menuButton = byId('menu-button');
        var menu = byId('menu');
        var fileInput = byId('file-input');
        var notices = byId('notices');
        var diagram = byId('diagram');
        var diagramErrors = byId('diagram-errors');
        var sheet = byId('sheet');
        var zoomButtons = { out: byId('zoom-out'), reset: byId('zoom-reset'), 'in': byId('zoom-in'), fit: byId('zoom-fit') };
        var selectionBar = byId('selection-bar');
        var insertAfterButton = byId('insert-after');
        var editButton = byId('edit-block');
        var deleteButton = byId('delete-block');
        var moveButton = byId('move-block');
        var consoleEmpty = byId('console-empty');
        var tabs = { diagram: byId('tab-diagram'), console: byId('tab-console') };
        var commands = {
            'new': byId('cmd-new'),
            open: byId('cmd-open'),
            save: byId('cmd-save'),
            undo: byId('cmd-undo'),
            redo: byId('cmd-redo')
        };
        // Annulla e Ripeti con un tocco (FR-MOB-10): nella barra da 64rem in su, altrimenti sul foglio.
        var historyButtons = {
            undo: [byId('undo'), byId('undo-sheet')],
            redo: [byId('redo'), byId('redo-sheet')]
        };

        var state = {
            document: null,         // il diagramma aperto (DiagramDocument)
            program: null,          // = state.document.program
            staticErrors: [],
            scheduler: null,
            outcome: null,
            diagram: null,          // disegno del programma aperto (DiagramRenderer)
            marked: { errors: [], runtime: false },
            runningId: null,
            selectedId: null,       // blocco selezionato (B3)
            insertSlot: null,       // punto in cui il menu dei blocchi inserirà
            undoBar: null,          // avviso "Annulla" dell'ultima cancellazione (DEC-067)
            moving: null,           // spostamento in corso: { blockId, bar } (passo 19, D-03)
            history: History.create(),
            editSession: null,      // finestra di modifica aperta: { blockId, before, revision } (DEC-068)
            pendingReveal: null     // blocco da inquadrare quando si torna al diagramma (FR-MOB-03)
        };
        var measurer = DiagramRenderer.createMeasurer(document);

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
                return t('ui.diagram.functionName', { name: found.node.name });
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
            if (name === 'diagram' && state.pendingReveal) {
                // Sul telefono il blocco dell'errore è già inquadrato quando si passa al diagramma.
                if (revealNode(state.pendingReveal)) {
                    state.pendingReveal = null;
                }
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

        /*
         * Barra non bloccante sotto la barra superiore; kind: 'error', 'warning', 'info'.
         * actions: pulsanti [{ label, run }] prima di Chiudi; ognuno chiude la barra e poi agisce.
         * onClose: chiamato se si chiude con Chiudi (lo spostamento rinuncia, passo 19).
         */
        function notice(kind, message, items, actions, onClose) {
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
            (actions || []).forEach(function (action) {
                var button = document.createElement('button');
                button.type = 'button';
                button.className = 'button notice-action';
                button.textContent = action.label;
                button.addEventListener('click', function () {
                    if (bar.parentNode) {
                        bar.parentNode.removeChild(bar);
                    }
                    action.run();
                });
                bar.appendChild(button);
            });
            var close = document.createElement('button');
            close.type = 'button';
            close.className = 'button button--quiet notice-close';
            close.textContent = t('ui.notice.close');
            close.addEventListener('click', function () {
                bar.parentNode.removeChild(bar);
                if (onClose) {
                    onClose();
                }
            });
            bar.appendChild(close);
            notices.appendChild(bar);
            return bar;
        }

        // --- Diagramma aperto ------------------------------------------------------

        function storeSessionCopy() {
            session.save(state.document.sessionCopy(new Date()));
        }

        function updateFileState() {
            fileNameField.value = state.document.fileName;
            modifiedMark.hidden = !state.document.isModified();
        }

        /*
         * Prima di lasciare un diagramma con modifiche non salvate (FR-FILE-08): una barra in
         * linea, non una finestra modale (B1), con Salva, Non salvare e Chiudi (che rinuncia).
         * Senza modifiche proceed parte subito.
         */
        var unsavedBar = null;
        function confirmLeave(proceed) {
            if (unsavedBar && unsavedBar.parentNode) {
                unsavedBar.parentNode.removeChild(unsavedBar);
            }
            unsavedBar = null;
            if (!state.document.isModified()) {
                proceed();
                return;
            }
            unsavedBar = notice('warning', t('ui.unsaved.message', { name: state.document.fileName }), null, [
                { label: t('ui.unsaved.save'), run: function () { save(); proceed(); } },
                { label: t('ui.unsaved.discard'), run: proceed }
            ]);
            unsavedBar.querySelector('.notice-action').focus();
        }

        /* Segni sul disegno ed elenco numerato sopra il foglio, con gli stessi numeri (DEC-057). */
        function showErrors(errors, runtime) {
            state.marked = { errors: errors, runtime: Boolean(runtime) };
            state.diagram.setErrors(errors);
            DiagramErrors.render(diagramErrors, errors, {
                t: t,
                formatError: formatError,
                describeBlock: describeBlock,
                runtime: runtime,
                formatCount: function (count) { return NumberFormat.formatInteger(count, numberFormat); },
                onSelect: function (nodeId) { revealNode(nodeId); }
            });
        }

        function showStaticErrors() {
            showErrors(state.staticErrors, false);
        }

        function setRunning(nodeId) {
            state.runningId = nodeId;
            state.diagram.setRunning(nodeId);
        }

        /* Inquadra un blocco; false se il foglio non si vede (scheda Console sul telefono). */
        function revealNode(nodeId, options) {
            return state.diagram ? sheetView.reveal(state.diagram.nodeBox(nodeId), options) : false;
        }

        /* Nome di un punto di inserimento per i lettori di schermo e la tastiera. */
        function describeSlot(slot) {
            var where;
            if (slot.index > 0) {
                var owner = Model.findById(state.program, slot.ownerId).node;
                where = t('ui.insert.where.after', { text: BlockText.plainText(owner[slot.list][slot.index - 1], t, 'tail') });
            } else if (slot.ownerId === slot.functionId) {
                where = t('ui.insert.where.start');
            } else {
                var block = Model.findById(state.program, slot.ownerId).node;
                var key = slot.list === 'body' ? 'ui.insert.where.body' : 'ui.insert.where.' + slot.list;
                where = t(key, { text: BlockText.plainText(block, t, block.kind === 'do' ? 'tail' : 'head') });
            }
            return t('ui.insert.point', { where: where });
        }

        /* Disegna il programma aperto, con gli stati di adesso (errori, esecuzione, selezione). */
        function drawDiagram() {
            state.diagram = DiagramRenderer.render(diagram, state.program, {
                t: t,
                measurer: measurer,
                // Si modifica in ogni funzione dal passo 18 (DEC-078).
                editable: function (functionId) { return Editor.canEdit(state.program, functionId); },
                describeSlot: describeSlot
            });
            sheetView.attach(state.diagram);
            state.diagram.setErrors(state.marked.errors);
            state.diagram.setRunning(state.runningId);
            state.diagram.setSelected(state.selectedId);
            if (state.moving) {
                showMoving();
            }
        }

        // --- Editor: inserimento (passo 9, DEC-063) ---------------------------------

        function select(nodeId) {
            state.selectedId = nodeId;
            state.diagram.setSelected(nodeId);
            selectionBar.hidden = !nodeId || isActive();
            editButton.disabled = !nodeId || !canOpenEditor(nodeId);
            deleteButton.disabled = !nodeId;
            // Una funzione non si sposta: si sposta un blocco (FR-EDIT-12).
            var selectedNode = nodeId ? Model.findById(state.program, nodeId) : null;
            moveButton.disabled = !selectedNode || isFunction(selectedNode.node);
        }

        function blockGroup(nodeId) {
            return diagram.querySelector('[data-id="' + nodeId + '"]');
        }

        // --- Editor: finestra di modifica (passo 10, DEC-066) ------------------------

        /* Chiamate e commenti si modificano nella fase 2 (FR-EDIT-10). */
        function canOpenEditor(nodeId) {
            var found = Model.findById(state.program, nodeId);
            if (found && isFunction(found.node)) {
                return found.node.name !== 'Main'; // la firma di Main non si cambia (§6.8)
            }
            return Boolean(found) && Boolean(BlockEditor.FIELDS[found.node.kind]) && Editor.canEdit(state.program, nodeId);
        }

        /* Una funzione non ha kind (passo 18). */
        function isFunction(node) {
            return node.kind === undefined;
        }

        var redrawFrame = 0;
        var sessionTimer = 0;

        /* Modifica mentre si scrive: documento, errori e disegno subito; copia di sessione poco dopo. */
        function afterFieldChange() {
            dropUndo();
            hideVariables();
            state.document.markChanged();
            state.outcome = null;
            state.runningId = null;
            state.staticErrors = StaticCheck.check(state.program);
            state.marked = { errors: [], runtime: false };
            updateFileState();
            if (!redrawFrame) {
                redrawFrame = window.requestAnimationFrame(function () {
                    redrawFrame = 0;
                    drawDiagram();
                    showStaticErrors();
                });
            }
            window.clearTimeout(sessionTimer);
            sessionTimer = window.setTimeout(storeSessionCopy, 400);
        }

        var blockEditor = BlockEditor.create(byId('work'), {
            t: t,
            formatError: formatError,
            onChange: afterFieldChange,
            // Errori dell'analisi statica di un campo, già calcolati da afterFieldChange (passo 16).
            fieldIssue: function (block, fieldName, parameter) {
                var found = null;
                state.staticErrors.forEach(function (error) {
                    if (!found && error.nodeId === block.id && error.field === fieldName &&
                            (parameter === undefined || error.parameter === parameter)) {
                        found = error;
                    }
                });
                return found;
            },
            onClose: function () {
                commitEdit();
                app.classList.remove('is-editing');
                window.clearTimeout(sessionTimer);
                storeSessionCopy();
                var group = state.selectedId ? blockGroup(state.selectedId) : null;
                if (group) {
                    group.focus({ preventScroll: true });
                }
            }
        });

        function openEditor(nodeId) {
            if (isActive() || !canOpenEditor(nodeId)) {
                return;
            }
            blockMenu.close({ restoreFocus: false });
            commitEdit(); // un altro blocco mentre la finestra è aperta: il primo è un passo a sé
            select(nodeId);
            app.classList.add('is-editing');
            var block = Model.findById(state.program, nodeId).node;
            state.editSession = isFunction(block)
                ? { functionId: nodeId, before: Editor.signatureOf(block), revision: state.document.revision() }
                : { blockId: nodeId, before: Editor.contentOf(block), revision: state.document.revision() };
            blockEditor.open(block);
            revealNode(nodeId, { quiet: true });
        }

        var blockMenu = BlockMenu.create(byId('panel-diagram'), {
            t: t,
            onChoose: function (kind) {
                if (!state.insertSlot || isActive()) {
                    return;
                }
                var block = Editor.createNewBlock(kind);
                var slot = state.insertSlot;
                var before = state.document.revision();
                Editor.insertAt(state.program, slot, block);
                state.insertSlot = null;
                afterEdit(block.id);
                // Il primo riempimento nella finestra fa parte dello stesso passo (DEC-068).
                recordStep({ kind: 'insert', block: block, slot: slot, fresh: true }, before);
                openEditor(block.id);
            }
        });

        function openInsertMenu(slot, anchor) {
            state.insertSlot = slot;
            blockMenu.open(anchor.getBoundingClientRect(), { sheet: narrow.matches, returnFocus: anchor });
        }

        /* Dopo ogni modifica: documento modificato, errori, disegno, copia di sessione (FR-EDIT-06). */
        function afterEdit(focusId) {
            state.document.markChanged();
            refresh(focusId, { focus: true });
        }

        /*
         * Disegno e stato dopo un cambiamento del programma (modifica, annulla, ripeti).
         * options.focus: il focus va sul blocco; altrimenti resta dov'è (Annulla premuto più volte).
         */
        function refresh(focusId, options) {
            dropUndo();
            cancelMove();
            hideVariables();
            state.outcome = null;
            state.runningId = null;
            state.staticErrors = StaticCheck.check(state.program);
            state.marked = { errors: [], runtime: false };
            state.selectedId = focusId;
            drawDiagram();
            showStaticErrors();
            select(focusId);
            var group = diagram.querySelector('[data-id="' + focusId + '"]');
            if (group && options.focus) {
                group.focus({ preventScroll: true });
            }
            revealNode(focusId, { quiet: true });
            updateFileState();
            updateControls();
            storeSessionCopy();
        }

        // --- Editor: annulla/ripeti (passo 12, FR-EDIT-05, DEC-068) ------------------------

        /* Registra una modifica già fatta; before è la versione del documento di prima. */
        function recordStep(step, before) {
            step.revisions = { before: before, after: state.document.revision() };
            state.history.record(step);
            updateControls();
        }

        /*
         * Chiude il passo della finestra di modifica: tutto quello che è cambiato in una stessa
         * apertura è un solo passo (DEC-066). Se il blocco è appena stato inserito, il passo è
         * quello dell'inserimento: annullando sparisce il blocco, già riempito.
         */
        function commitEdit() {
            var session = state.editSession;
            state.editSession = null;
            if (!session) {
                return;
            }
            if (session.functionId) {
                commitFunction(session);
                return;
            }
            var found = Model.findById(state.program, session.blockId);
            var last = state.history.last();
            var fresh = last && last.kind === 'insert' && last.fresh && last.block.id === session.blockId;
            if (last && last.kind === 'insert') {
                last.fresh = false;
            }
            if (!found) {
                return;
            }
            var after = Editor.contentOf(found.node);
            if (fresh) {
                last.revisions.after = state.document.revision();
            } else if (!Editor.sameContent(session.before, after)) {
                recordStep({ kind: 'edit', blockId: session.blockId, before: session.before, after: after }, session.revision);
            }
        }

        // --- Editor: spostamento (passo 19, FR-EDIT-12, D-03, DEC-079) ---------------------------

        /* Il blocco tratteggiato e i + dove può andare. */
        function showMoving() {
            var blockId = state.moving.blockId;
            state.diagram.setMoving(blockId, function (slot) { return Editor.canMoveTo(state.program, blockId, slot); });
        }

        /* Sposta: il blocco aspetta un tocco su un +; un tocco altrove, Esc o Non spostare rinunciano. */
        function startMove(nodeId) {
            var found = nodeId ? Model.findById(state.program, nodeId) : null;
            if (isActive() || !found || isFunction(found.node)) {
                return;
            }
            if (blockEditor.isOpen()) {
                blockEditor.close();
            }
            blockMenu.close({ restoreFocus: false });
            cancelMove();
            dropUndo();
            var text = BlockText.plainText(found.node, t, found.node.kind === 'do' ? 'tail' : 'head');
            state.moving = { blockId: nodeId, bar: null };
            state.moving.bar = notice('info', t('ui.move.prompt', { text: text }), null, [{
                label: t('ui.move.cancel'),
                run: function () { cancelMove(); }
            }], function () { cancelMove(); });
            selectionBar.hidden = true;
            showMoving();
            // Il primo + dove può andare, per chi usa la tastiera.
            var first = diagram.querySelector('.dg-slot:not(.is-disabled)');
            if (first) {
                first.focus({ preventScroll: true });
            }
        }

        function cancelMove() {
            if (!state.moving) {
                return;
            }
            var moving = state.moving;
            state.moving = null;
            if (moving.bar && moving.bar.parentNode) {
                moving.bar.parentNode.removeChild(moving.bar);
            }
            if (state.diagram) {
                state.diagram.setMoving(null);
                select(state.selectedId);
            }
        }

        function finishMove(slot) {
            var blockId = state.moving.blockId;
            cancelMove();
            var before = state.document.revision();
            var moved = Editor.moveBlock(state.program, blockId, slot);
            if (!moved) {
                return;
            }
            afterEdit(blockId);
            recordStep({ kind: 'move', blockId: blockId, from: moved.from, to: moved.to }, before);
        }

        // --- Editor: funzioni (passo 18, FR-EDIT-11, DEC-078) ------------------------------

        /* Un nome che le chiamate possono prendere: valido, non predefinito, non già di un'altra funzione. */
        function canTakeName(name, programFunction) {
            if (name === 'Main' || OnoFlow.Builtins.get(name) || OnoFlow.Expressions.parseName(name).error) {
                return false;
            }
            return state.program.functions.every(function (other) { return other === programFunction || other.name !== name; });
        }

        /*
         * Chiude il passo della firma: un solo passo, con le chiamate rinominate se il nome è
         * cambiato (alla chiusura, non a ogni tasto: a metà parola il nome può coincidere con un
         * altro, e le sue chiamate verrebbero rinominate per sbaglio). Una funzione appena creata
         * resta un passo solo con la sua creazione.
         */
        function commitFunction(session) {
            var found = Model.findById(state.program, session.functionId);
            var last = state.history.last();
            var fresh = last && last.kind === 'addFunction' && last.fresh && last.fn.id === session.functionId;
            if (last && last.kind === 'addFunction') {
                last.fresh = false;
            }
            if (!found) {
                return;
            }
            var programFunction = found.node;
            var after = Editor.signatureOf(programFunction);
            if (fresh) {
                last.revisions.after = state.document.revision();
                return;
            }
            if (Editor.sameSignature(session.before, after)) {
                return;
            }
            var calls = [];
            if (after.name !== session.before.name && canTakeName(after.name, programFunction)) {
                calls = Editor.renameCalls(state.program, session.before.name, after.name);
            }
            if (calls.length) {
                state.document.markChanged();
                refresh(session.functionId, { focus: false });
            }
            recordStep({ kind: 'editFunction', functionId: session.functionId, before: session.before, after: after, calls: calls }, session.revision);
        }

        /* Menu → Nuova funzione: in fondo al programma, con la sua firma subito aperta. */
        function newFunction() {
            if (isActive()) {
                return;
            }
            if (blockEditor.isOpen()) {
                blockEditor.close();
            }
            var before = state.document.revision();
            var created = Editor.newFunction(state.program);
            var placed = Editor.insertFunction(state.program, null, created);
            afterEdit(created.id);
            recordStep({ kind: 'addFunction', fn: created, index: placed.index, fresh: true }, before);
            openEditor(created.id);
        }

        /* Elimina su una funzione: con tutto il corpo, Annulla nell'avviso come per i blocchi. */
        function deleteFunction(functionId) {
            var before = state.document.revision();
            var removed = Editor.removeFunction(state.program, functionId);
            var inside = removed.fn.body.reduce(function (sum, block) { return sum + 1 + Editor.countInside(block); }, 0);
            afterEdit(null);
            recordStep({ kind: 'removeFunction', fn: removed.fn, index: removed.index }, before);
            var name = removed.fn.name;
            var message = inside === 0 ? t('ui.deleteFunction.done', { name: name })
                : inside === 1 ? t('ui.deleteFunction.doneOne', { name: name })
                : t('ui.deleteFunction.doneMany', { name: name, count: NumberFormat.formatInteger(inside, numberFormat) });
            state.undoBar = notice('info', message, null, [{
                label: t('ui.delete.undo'),
                run: function () {
                    state.undoBar = null;
                    travel(true);
                }
            }]);
        }

        /* Annulla (backwards) o Ripeti. Il blocco toccato resta selezionato e inquadrato. */
        function travel(backwards) {
            if (isActive()) {
                return;
            }
            blockMenu.close({ restoreFocus: false });
            if (blockEditor.isOpen()) {
                blockEditor.close(); // chiude anche il passo della finestra
            }
            var step = backwards ? state.history.undo(state.program) : state.history.redo(state.program);
            if (!step) {
                return;
            }
            state.document.setRevision(backwards ? step.revisions.before : step.revisions.after);
            var adding = step.kind === 'insert' || step.kind === 'addFunction';
            var removing = step.kind === 'remove' || step.kind === 'removeFunction';
            var gone = adding ? backwards : removing ? !backwards : false;
            var touched = step.blockId || step.functionId || (step.block || step.fn).id;
            var focusInside = diagram.contains(document.activeElement) || document.activeElement === document.body;
            refresh(gone ? null : touched, { focus: focusInside });
            if (gone && focusInside && step.slot) {
                focusSlot(step.slot);
            }
        }

        // --- Editor: cancellazione (passo 11, FR-EDIT-04) ------------------------------

        /*
         * Annulla nell'avviso di una cancellazione: una scorciatoia di Annulla (DEC-068), che vale
         * finché la cancellazione è l'ultimo passo; sparisce alla modifica successiva.
         */
        function dropUndo() { // DEC-067
            if (state.undoBar && state.undoBar.parentNode) {
                state.undoBar.parentNode.removeChild(state.undoBar);
            }
            state.undoBar = null;
        }

        /* Il punto di inserimento rimasto dove c'era il blocco, per tenere lì il focus. */
        function focusSlot(slot) {
            var index = -1;
            state.diagram.slots.forEach(function (candidate, i) {
                if (candidate.ownerId === slot.ownerId && candidate.list === slot.list && candidate.index === slot.index) {
                    index = i;
                }
            });
            var point = index === -1 ? null : diagram.querySelector('[data-slot="' + index + '"]');
            if (point) {
                point.focus({ preventScroll: true });
            }
        }

        /*
         * Cancella un blocco con il suo contenuto, senza chiedere conferma (B1): l'avviso offre
         * Annulla. Dopo la cancellazione non resta selezionato nulla, così un secondo Canc non
         * cancella il blocco vicino togliendo l'Annulla del primo.
         */
        function deleteBlock(nodeId) {
            if (isActive() || !nodeId || !Editor.canEdit(state.program, nodeId)) {
                return;
            }
            if (blockEditor.isOpen()) {
                blockEditor.close();
            }
            blockMenu.close({ restoreFocus: false });
            var found = Model.findById(state.program, nodeId);
            if (found && isFunction(found.node)) {
                if (found.node.name !== 'Main') {
                    deleteFunction(nodeId);
                }
                return;
            }
            var before = state.document.revision();
            var removed = Editor.removeAt(state.program, nodeId);
            var block = removed.block;
            var inside = Editor.countInside(block);
            afterEdit(null);
            recordStep({ kind: 'remove', block: block, slot: removed.slot }, before);
            focusSlot(removed.slot);
            var text = BlockText.plainText(block, t, block.kind === 'do' ? 'tail' : 'head');
            var message = inside === 0 ? t('ui.delete.done', { text: text })
                : inside === 1 ? t('ui.delete.doneOne', { text: text })
                : t('ui.delete.doneMany', { text: text, count: NumberFormat.formatInteger(inside, numberFormat) });
            state.undoBar = notice('info', message, null, [{
                label: t('ui.delete.undo'),
                run: function () {
                    state.undoBar = null;
                    travel(true); // l'avviso sparisce a ogni modifica: l'ultimo passo è questa cancellazione
                }
            }]);
        }

        /* Tocco o clic sul foglio: un punto di inserimento, un blocco, oppure niente (toglie la selezione). */
        function activate(event, target) {
            if (isActive()) {
                return;
            }
            var hit = null;
            if (target && target.hasAttribute('data-slot')) {
                hit = { slot: Number(target.getAttribute('data-slot')) };
            } else if (target) {
                hit = { block: target.getAttribute('data-id') };
            } else if (state.diagram) {
                var point = sheetView.pointAt(event);
                hit = point ? state.diagram.hitTest(point, TOUCH_RADIUS_PX / sheetView.zoom()) : null;
            }
            if (state.moving) {
                // Durante uno spostamento un + lo conclude (quelli spenti il disegno non li dà); altro tocco rinuncia.
                if (hit && hit.slot !== undefined) {
                    finishMove(state.diagram.slots[hit.slot]);
                } else {
                    cancelMove();
                }
                return;
            }
            if (hit && hit.slot !== undefined) {
                openInsertMenu(state.diagram.slots[hit.slot], diagram.querySelector('[data-slot="' + hit.slot + '"]'));
            } else if (hit) {
                // Secondo tocco sul blocco selezionato, o un altro blocco mentre si modifica: si apre la modifica (B3).
                if (hit.block === state.selectedId || blockEditor.isOpen()) {
                    openEditor(hit.block);
                } else {
                    select(hit.block);
                }
            } else {
                select(null);
            }
        }

        /* Al tocco alcuni browser spostano il bersaglio, e le coordinate del clic, sull'elemento cliccabile
           più vicino: un tocco accanto a un + finiva sul blocco vicino. Per il tocco conta il punto
           di pointerdown, che non è spostato, e decide sempre hitTest (M-01). */
        var touchStart = null;
        sheet.addEventListener('pointerdown', function (event) {
            touchStart = event.pointerType === 'touch' && event.isPrimary ? { clientX: event.clientX, clientY: event.clientY } : null;
        });
        sheet.addEventListener('pointercancel', function () {
            touchStart = null;
        });

        sheet.addEventListener('click', function (event) {
            var touch = touchStart;
            touchStart = null;
            if (!diagram.contains(event.target) && event.target !== sheet && !event.target.classList.contains('sheet-content')) {
                return; // piè di pagina e altro: non è il disegno
            }
            if (touch) {
                activate(touch, null);
            } else {
                activate(event, event.target.closest ? event.target.closest('[data-slot], .is-selectable') : null);
            }
        });

        diagram.addEventListener('keydown', function (event) {
            var target = event.target.closest ? event.target.closest('[data-slot], .is-selectable') : null;
            if (target && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                activate(event, target);
            } else if (event.key === 'Escape' && state.moving) {
                cancelMove();
            } else if (event.key === 'Escape' && state.selectedId) {
                select(null);
            } else if ((event.key === 'Delete' || event.key === 'Backspace') && target && !target.hasAttribute('data-slot')) {
                event.preventDefault();
                deleteBlock(target.getAttribute('data-id'));
            }
        });

        /*
         * Il focus su un blocco o su un punto (Tab) deve portarlo in vista. Firefox non fa scorrere
         * il foglio per un <g> dell'SVG, e a volte lo sposta altrove: se l'elemento è del tutto
         * fuori dal foglio, lo inquadra la pagina (NFR-ACC-01, DEC-069).
         */
        diagram.addEventListener('focusin', function (event) {
            var target = event.target.closest ? event.target.closest('[data-slot], .is-selectable') : null;
            if (!target || !state.diagram) {
                return;
            }
            var box = target.getBoundingClientRect();
            var frame = sheet.getBoundingClientRect();
            var outside = box.bottom <= frame.top || box.top >= frame.bottom || box.right <= frame.left || box.left >= frame.right;
            if (outside) {
                sheetView.reveal(target.hasAttribute('data-slot')
                    ? state.diagram.slotBox(Number(target.getAttribute('data-slot')))
                    : state.diagram.nodeBox(target.getAttribute('data-id')));
            }
        });

        // Doppio clic sul blocco: modifica (FR-EDIT-02).
        sheet.addEventListener('dblclick', function (event) {
            var target = event.target.closest ? event.target.closest('.is-selectable') : null;
            if (target) {
                openEditor(target.getAttribute('data-id'));
            }
        });

        editButton.addEventListener('click', function () {
            if (state.selectedId) {
                openEditor(state.selectedId);
            }
        });

        moveButton.addEventListener('click', function () {
            startMove(state.selectedId);
        });

        deleteButton.addEventListener('click', function () {
            deleteBlock(state.selectedId);
        });

        insertAfterButton.addEventListener('click', function () {
            if (!state.selectedId || isActive()) {
                return;
            }
            var group = diagram.querySelector('[data-id="' + state.selectedId + '"]');
            state.insertSlot = Editor.slotAfter(state.program, state.selectedId);
            blockMenu.open((group || insertAfterButton).getBoundingClientRect(), { sheet: narrow.matches, returnFocus: insertAfterButton });
        });

        var sheetView = DiagramViewport.create(sheet, {
            content: byId('sheet-content'),
            onChange: function (zoom) {
                var percent = NumberFormat.formatInteger(Math.round(zoom * 100), numberFormat);
                zoomButtons.reset.textContent = t('ui.zoom.percent', { percent: percent });
                zoomButtons.reset.setAttribute('aria-label', t('ui.zoom.reset', { percent: percent }));
                zoomButtons.out.disabled = zoom <= DiagramViewport.MIN_ZOOM;
                zoomButtons['in'].disabled = zoom >= DiagramViewport.MAX_ZOOM;
            }
        });
        zoomButtons.out.addEventListener('click', function () { sheetView.zoomOut(); });
        zoomButtons['in'].addEventListener('click', function () { sheetView.zoomIn(); });
        zoomButtons.reset.addEventListener('click', function () { sheetView.setZoom(1); });
        zoomButtons.fit.addEventListener('click', function () { sheetView.fit({ width: narrow.matches }); });
        // Sul telefono "Adatta" lavora in larghezza (M-05): il nome lo dice.
        function updateFitLabel() {
            var key = narrow.matches ? 'ui.zoom.fitWidth' : 'ui.zoom.fit';
            zoomButtons.fit.setAttribute('data-i18n-label', key);
            zoomButtons.fit.setAttribute('data-i18n-title', key);
            zoomButtons.fit.setAttribute('aria-label', t(key));
            zoomButtons.fit.setAttribute('title', t(key));
        }
        updateFitLabel();
        narrow.addEventListener('change', updateFitLabel);
        large.addEventListener('change', function () {
            if (state.program) {
                measurer.reset();
                drawDiagram();
            }
        });

        /* Mostra un programma; options: { saved, origin: 'new' | 'file' }. */
        function useProgram(program, format, sourceText, fileName, options) {
            // Un altro diagramma: la storia di quello di prima non vale più (DEC-068).
            state.editSession = null;
            state.history = History.create();
            state.document = DiagramDocument.create({
                program: program,
                format: format,
                sourceText: sourceText,
                fileName: normalizeFileName(fileName),
                origin: options.origin,
                saved: options.saved
            });
            state.program = program;
            state.outcome = null;
            state.runningId = null;
            state.pendingReveal = null;
            state.selectedId = null;
            state.insertSlot = null;
            blockMenu.close({ restoreFocus: false });
            blockEditor.close();
            dropUndo();
            state.moving = null; // il diagramma di prima non c'è più
            hideVariables();
            selectionBar.hidden = true;
            state.marked = { errors: [], runtime: false };
            drawDiagram();
            sheetView.reset(); // si apre sempre al 100% (DEC-057)
            // Inizio al centro in orizzontale: con cicli e if l'asse può stare oltre il bordo del telefono.
            state.pendingReveal = revealNode(program.functions[0].id) ? null : program.functions[0].id;
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
            useProgram(program, Format.DEFAULT_FILE_FORMAT, Format.exportFprg(program), '', { saved: true, origin: 'new' });
        }

        /* Apre un testo .fprg; se non si apre, il diagramma di prima resta (FR-FILE-04). */
        function openText(text, fileName) {
            var result = Format.importFprg(text);
            clearNotices();
            if (!result.ok) {
                notice('error', t('ui.notice.openFailed', { name: fileName, message: formatError(result.error) }));
                return false;
            }
            useProgram(result.program, result.format, text, fileName, { saved: true, origin: 'file' });
            if (result.warnings.length) {
                notice('warning', t('ui.notice.warnings', { name: state.document.fileName }), result.warnings.map(formatError));
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
            // Un file nuovo prende gli attributi di DEC-061; uno aperto conserva i suoi (FMT-W-06).
            var text = state.document.save(name, new Date());
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
            if (current === 'paused' && state.scheduler.stepping()) {
                return t('ui.status.stepping');
            }
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
            var focused = document.activeElement;
            runButton.disabled = active;
            stopButton.disabled = !active;
            // Pausa non ha effetto mentre si attende un valore (§11.1).
            pauseButton.disabled = current !== 'running' && current !== 'paused';
            pauseLabel.textContent = t(current === 'paused' ? 'ui.resume' : 'ui.pause');
            pauseButton.setAttribute('aria-pressed', current === 'paused' ? 'true' : 'false');
            // Passo: per cominciare, o da una pausa (FR-RUN-05).
            stepButtons.forEach(function (button) { button.disabled = active && current !== 'paused'; });
            byId('cmd-step').disabled = active;
            commands['new'].disabled = active;
            commands.open.disabled = active;
            byId('cmd-new-function').disabled = active;
            // Niente annulla/ripeti durante l'esecuzione (FR-EDIT-07).
            var canUndo = !active && Boolean(state.history) && state.history.canUndo();
            var canRedo = !active && Boolean(state.history) && state.history.canRedo();
            commands.undo.disabled = !canUndo;
            commands.redo.disabled = !canRedo;
            historyButtons.undo.forEach(function (button) { button.disabled = !canUndo; });
            historyButtons.redo.forEach(function (button) { button.disabled = !canRedo; });
            Array.prototype.forEach.call(menu.querySelectorAll('[data-example]'), function (item) {
                item.disabled = active;
            });
            app.setAttribute('data-run-state', runStateName(current));
            statusLabel.textContent = statusText();
            statusLabel.hidden = statusLabel.textContent === '';
            keepRunFocus(focused);
        }

        /* Sul telefono un comando dell'esecuzione sparisce quando cambia lo stato (M-03): il focus
           passa a quello che ne prende il posto, invece di perdersi. */
        var runPartners = [[runButton, stopButton], [byId('step'), pauseButton]];
        function keepRunFocus(focused) {
            runPartners.forEach(function (pair) {
                var index = pair.indexOf(focused);
                var other = pair[1 - index];
                if (index !== -1 && getComputedStyle(focused).visibility === 'hidden'
                    && getComputedStyle(other).visibility !== 'hidden' && !other.disabled) {
                    other.focus();
                }
            });
        }

        /* Blocco dell'errore: inquadrato subito se il foglio si vede, altrimenti al ritorno (FR-MOB-03). */
        function markForReveal(nodeId) {
            state.pendingReveal = nodeId && !revealNode(nodeId) ? nodeId : null;
        }

        function finish(outcome) {
            state.outcome = outcome;
            consoleView.flush();
            setRunning(null);
            showVariables(); // i valori finali restano fino alla prossima modifica o esecuzione
            if (outcome.status === 'done') {
                consoleView.showDone();
                badgeConsole('new');
            } else if (outcome.status === 'invalid') {
                consoleView.showInvalid(outcome.errors);
                showErrors(outcome.errors, false);
                markForReveal(outcome.errors[0].nodeId);
                badgeConsole('error');
            } else if (outcome.error.code === 'ERR_STOPPED') {
                consoleView.showStopped(outcome.error);
            } else {
                consoleView.showRuntimeError(outcome.error);
                showErrors([outcome.error], true);
                markForReveal(outcome.error.nodeId);
                badgeConsole('error');
            }
            updateControls();
        }

        function run() {
            startRun(false);
        }

        /*
         * Passo (FR-RUN-05): da fermo avvia l'esecuzione fermandosi prima del primo blocco; in
         * pausa esegue il blocco evidenziato e si ferma al successivo.
         */
        function stepRun() {
            var current = schedulerState();
            if (!isActive()) {
                startRun(true);
            } else if (current === 'paused') {
                consoleView.hideLongRun();
                state.scheduler.step();
            }
        }

        /* stepMode: passo-passo; sul telefono resta in primo piano il diagramma, che è il punto. */
        function startRun(stepMode) {
            if (isActive()) {
                return;
            }
            closeMenu();
            // Durante l'esecuzione non si modifica (FR-EDIT-07): via menu, finestra di modifica e selezione.
            blockMenu.close({ restoreFocus: false });
            blockEditor.close();
            select(null);
            consoleView.clear();
            consoleEmpty.hidden = true;
            cancelMove();
            hideVariables();
            showStaticErrors();
            state.outcome = null;
            state.pendingReveal = null;
            // All'avvio la console viene in primo piano (FR-MOB-02, D-11), tranne nel passo-passo.
            showTab(stepMode ? 'diagram' : 'console');
            state.scheduler = Scheduler.create(state.program, {
                numberFormat: numberFormat,
                invalidInput: 'retry',
                onOutput: function (event) {
                    consoleView.write(event.text, event.newline);
                    badgeConsole('new');
                },
                onStep: function (nodeId) {
                    consoleView.flush();
                    setRunning(nodeId);
                    showVariables();
                    if (state.scheduler && state.scheduler.stepping()) {
                        revealNode(nodeId, { quiet: true }); // il blocco evidenziato si vede sempre
                    }
                },
                onInput: function (event) {
                    setRunning(event.nodeId);
                    revealNode(event.nodeId, { quiet: true });
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
            if (stepMode) {
                state.scheduler.step();
            } else {
                state.scheduler.start();
            }
        }

        function togglePause() {
            var current = schedulerState();
            if (current === 'running') {
                state.scheduler.pause();
                revealNode(state.scheduler.currentNodeId(), { quiet: true });
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

        // --- Pannello delle variabili (passo 15, FR-RUN-06, DEC-075) -----------------------

        var variablesPane = byId('variables-pane');
        var variablesStrip = byId('variables-strip');
        var stripToggle = byId('variables-strip-toggle');
        var stripBody = byId('variables-strip-body');
        var variablesOptions = {
            t: t,
            formatValue: formatValue,
            formatFull: function (value) { return NumberFormat.formatRealFull(value, numberFormat); }
        };
        var paneView = VariablesView.create(byId('variables-pane-body'), variablesOptions);
        var stripView = VariablesView.create(stripBody, variablesOptions);

        /* Le variabili della chiamata in corso, dopo ogni passo e a ogni turno dell'esecuzione. */
        function showVariables() {
            var snapshot = state.scheduler ? state.scheduler.variables() : null;
            if (!snapshot) {
                hideVariables();
                return;
            }
            variablesPane.hidden = false;
            variablesStrip.hidden = false;
            paneView.show(snapshot);
            stripView.show(snapshot);
            byId('variables-strip-summary').textContent = VariablesView.summary(snapshot, t, formatValue);
        }

        /* Il programma è cambiato o riparte: le variabili di prima non valgono più. */
        function hideVariables() {
            variablesPane.hidden = true;
            variablesStrip.hidden = true;
            paneView.reset();
            stripView.reset();
        }

        stripToggle.addEventListener('click', function () {
            var open = stripToggle.getAttribute('aria-expanded') !== 'true';
            stripToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            stripToggle.setAttribute('aria-label', t(open ? 'ui.variablesPanel.collapse' : 'ui.variablesPanel.expand'));
            stripBody.hidden = !open;
        });
        stripToggle.setAttribute('aria-label', t('ui.variablesPanel.expand'));

        var consoleView = ConsoleView.create(byId('console-log'), {
            t: t,
            formatError: formatError,
            formatValue: formatValue,
            describeBlock: describeBlock,
            scroller: byId('console-scroll'),
            trimmedNotice: byId('console-trimmed'),
            onSubmitInput: function (text) {
                state.scheduler.provideInput(text);
                if (narrow.matches && state.scheduler.stepping()) {
                    showTab('diagram'); // il passo continua sul diagramma
                }
            },
            onContinue: function () {
                consoleView.hideLongRun();
                state.scheduler.resume();
            },
            onStop: stop,
            onReveal: function (nodeId) {
                state.pendingReveal = null;
                showTab('diagram');
                revealNode(nodeId);
            }
        });

        runButton.addEventListener('click', run);
        stepButtons.forEach(function (button) { button.addEventListener('click', stepRun); });
        byId('cmd-step').addEventListener('click', function () {
            closeMenu();
            stepRun();
        });
        // F10, come nei debugger: comodo al proiettore.
        document.addEventListener('keydown', function (event) {
            if (event.key === 'F10' && !event.ctrlKey && !event.altKey && !event.metaKey) {
                event.preventDefault();
                stepRun();
            }
        });
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
                confirmLeave(function () { openText(example.text, example.fileName); });
            });
            byId('examples-list').appendChild(item);
        });

        commands['new'].addEventListener('click', function () {
            closeMenu();
            confirmLeave(function () {
                clearNotices();
                newProgram();
            });
        });
        commands.open.addEventListener('click', function () {
            closeMenu();
            // Il selettore si apre nello stesso tocco (Apri, oppure Salva o Non salvare nella barra).
            confirmLeave(function () { fileInput.click(); });
        });
        commands.save.addEventListener('click', function () {
            closeMenu();
            save();
        });
        byId('cmd-docs').addEventListener('click', function () {
            closeMenu(); // la documentazione si apre in un'altra scheda: qui il menu si chiude
        });
        themeItem.addEventListener('click', function () {
            closeMenu();
            theme.toggle();
        });
        byId('cmd-new-function').addEventListener('click', function () {
            closeMenu();
            newFunction();
        });
        commands.undo.addEventListener('click', function () {
            closeMenu();
            travel(true);
        });
        commands.redo.addEventListener('click', function () {
            closeMenu();
            travel(false);
        });
        historyButtons.undo.forEach(function (button) {
            button.addEventListener('click', function () { travel(true); });
        });
        historyButtons.redo.forEach(function (button) {
            button.addEventListener('click', function () { travel(false); });
        });

        /* Ctrl/Cmd + Z, Ctrl/Cmd + Maiusc + Z, Ctrl + Y; nei campi di testo resta l'annulla del browser. */
        document.addEventListener('keydown', function (event) {
            if (!(event.ctrlKey || event.metaKey) || event.altKey) {
                return;
            }
            var key = event.key.toLowerCase();
            if (key !== 'z' && key !== 'y') {
                return;
            }
            var target = event.target;
            if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
                return;
            }
            event.preventDefault();
            travel(key === 'z' && !event.shiftKey);
        });

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
                var dropped = event.dataTransfer.files[0];
                if (!isActive()) {
                    confirmLeave(function () { openFile(dropped); });
                }
            }
        });

        // Chiusura o ricaricamento della pagina con modifiche: l'avviso del browser (FR-FILE-08).
        // Sui telefoni non è affidabile: lì protegge la copia di sessione (FR-MOB-15).
        window.addEventListener('beforeunload', function (event) {
            if (state.document && state.document.isModified()) {
                event.preventDefault();
                event.returnValue = '';
            }
        });

        // Cambiare nome non modifica il diagramma: vale solo per il prossimo salvataggio.
        fileNameField.addEventListener('change', function () {
            state.document.setFileName(normalizeFileName(fileNameField.value));
            updateFileState();
            storeSessionCopy();
        });

        // --- Piè di pagina e Informazioni (FR-INFO-01…04, DEC-065) ----------------------

        function privacyLink(key) {
            var link = document.createElement('a');
            link.href = HOSTING_PRIVACY_URL;
            link.rel = 'noopener';
            link.textContent = t(key);
            return link;
        }

        // In fondo una sola riga, piccola; i testi completi stanno in Informazioni.
        var hosting = byId('footer-hosting');
        var infoHosting = byId('info-hosting');
        if (window.location.protocol === 'file:') {
            hosting.textContent = t('ui.footer.short.local');
            infoHosting.textContent = t('ui.footer.local');
        } else {
            hosting.textContent = t('ui.footer.short.hosting');
            var separator = document.createElement('span');
            separator.className = 'footer-sep';
            separator.setAttribute('aria-hidden', 'true');
            separator.textContent = ' · ';
            hosting.appendChild(separator);
            hosting.appendChild(privacyLink('ui.footer.short.privacyLink'));
            infoHosting.textContent = t('ui.footer.hosting') + ' ';
            infoHosting.appendChild(privacyLink('ui.footer.hostingLink'));
        }

        // Pannello Informazioni (FR-INFO-02): sopra il foglio, non modale, Chiudi o Esc.
        var infoPanel = byId('info-panel');
        var infoReturnFocus = null;
        function openInfo(returnFocus) {
            closeMenu();
            if (narrow.matches) {
                showTab('diagram');
            }
            infoReturnFocus = returnFocus;
            infoPanel.hidden = false;
            infoPanel.focus();
        }
        function closeInfo() {
            infoPanel.hidden = true;
            if (infoReturnFocus && infoReturnFocus.isConnected) {
                infoReturnFocus.focus();
            }
            infoReturnFocus = null;
        }
        byId('footer-info').addEventListener('click', function () { openInfo(byId('footer-info')); });
        byId('cmd-info').addEventListener('click', function () { openInfo(menuButton); });
        byId('info-close').addEventListener('click', closeInfo);
        infoPanel.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                closeInfo();
            }
        });

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
                if (open && !keyboardOpen && !blockEditor.isOpen()) {
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
            useProgram(restored.program, restored.format, copy.text, copy.fileName, { saved: copy.saved, origin: copy.origin });
            notice('info', t(copy.saved ? 'ui.notice.restored.saved' : 'ui.notice.restored.unsaved'));
        } else {
            newProgram();
        }
        app.removeAttribute('data-loading');
    }

    OnoFlow.App = { start: start, normalizeFileName: normalizeFileName };
})(window.OnoFlow);
