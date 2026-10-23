/*
 * OnoFlow — verifica di index.html da file:// in Chromium e Firefox con Playwright (passi 6–19).
 *
 * Dipendenze: playwright (solo in tools/, mai nell'applicazione).
 *
 * Uso, dalla cartella tools/:
 *     node check-ui.mjs                                  Chromium e Firefox
 *     node check-ui.mjs --engines firefox --screenshots /percorso/cartella
 *     DEBUG=1 node check-ui.mjs                          messaggio completo delle verifiche interrotte
 *
 * Percorsi verificati, su computer (1440 × 900, 900 × 700) e telefono (360 × 640, 375 × 667, QA-14):
 *   - apertura: foglio vuoto, nessun errore nella pagina, nessuno scorrimento orizzontale;
 *   - esempio dal menu, esecuzione con gli input in linea, output di QA-04;
 *   - sul telefono la console viene in primo piano all'avvio (FR-MOB-02);
 *   - salvataggio: download con il nome del campo e il testo dell'esempio (FR-FILE-02, FR-FILE-03);
 *   - un file non valido lascia aperto il diagramma di prima (FR-FILE-04);
 *   - ricaricando la pagina il diagramma si ripristina (FR-MOB-15);
 *   - menu da tastiera: Esc lo chiude e il focus torna al pulsante (NFR-ACC-01);
 *   - ciclo infinito: pausa con la domanda dopo 5 secondi, poi Ferma (FR-RUN-04);
 *   - diagramma SVG: un gruppo per blocco, zoom dai comandi senza ingrandire la pagina, "Adatta
 *     allo schermo", Ctrl + rotella sul computer, pizzico a due dita sul telefono (FR-MOB-06);
 *   - errore durante l'esecuzione: il blocco è inquadrato tornando al diagramma (FR-MOB-03);
 *   - file nuovo salvato con gli attributi di DEC-061, senza dati dell'utente (D-01);
 *   - modifiche non salvate: barra con Salva, Non salvare e Chiudi prima di Nuovo ed Esempi,
 *     avviso del browser alla chiusura della pagina (FR-FILE-08, FR-FILE-11);
 *   - inserimento: punto sulla freccia → menu → blocco, nei rami dell'if, "Inserisci dopo",
 *     da tastiera, area di tocco di 44 px anche con lo zoom ridotto, punti nascosti durante
 *     l'esecuzione (FR-EDIT-01, FR-EDIT-03, FR-EDIT-07, FR-MOB-04, FR-MOB-05, DEC-063);
 *   - creazione da zero con la finestra di modifica: dichiarazione, input, output, poi
 *     esecuzione con un valore; errore mentre si scrive; barra dei simboli; finestra a tutto
 *     schermo sul telefono; secondo tocco per modificare (FR-EDIT-02, FR-MOB-07…09, B3);
 *   - cancellazione: "Elimina" e tasto Canc, un ciclo con tutto il contenuto, "Annulla" che
 *     rimette il blocco con lo stesso ID, barra della selezione dentro lo schermo (FR-EDIT-04);
 *   - annulla/ripeti: inserimento e modifica come passi, fino al diagramma iniziale con
 *     "Non salvato" spento, ripeti fino alla fine; pulsanti nella barra sul computer e sul
 *     foglio sul telefono; Ctrl + Z e Ctrl + Y, non dentro i campi (FR-EDIT-05, QA-13, FR-MOB-10);
 *   - QA-11: l'Appendice A costruita blocco per blocco con i punti, "Inserisci dopo" e la finestra
 *     di modifica, eseguita con gli input di QA-04, salvata e riaperta (FR-FILE-10);
 *   - QA-12: l'Appendice A modificata (un'espressione, un blocco aggiunto, uno cancellato), salvata:
 *     solo quelle righe cambiano, gli attributi restano; poi riaperta (FR-FILE-09);
 *   - il focus su un blocco o un punto fuori vista lo porta in vista, anche in Firefox (DEC-069);
 *   - telefono ruotato a metà dell'esecuzione: l'esecuzione e il diagramma restano (FR-MOB-13);
 *   - passo-passo: Passo (barra, foglio sul telefono, menu, F10) si ferma prima di ogni blocco,
 *     che è quello evidenziato; input a metà passo; Riprendi e Ferma (FR-RUN-05);
 *   - analisi statica: «b = True» segnalato sotto il campo mentre si scrive, con il suggerimento,
 *     e prima dell'esecuzione (FR-ERR-06, D-06);
 *   - commento e chiamata dal menu, modificati, disegnati e salvati (FR-EDIT-10);
 *   - funzioni: nuova, firma con parametro e valore, corpo, chiamata da Main ed esecuzione,
 *     rinomina con le chiamate e Annulla, cancellazione e Annulla, file salvato (FR-EDIT-11);
 *   - spostamento: Sposta, + spenti attorno al blocco, un + nel ramo Vero, Annulla, Non spostare,
 *     Esc (FR-EDIT-12, D-03).
 * Esce con codice 1 se una verifica non riesce.
 */
import { chromium, firefox } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ENGINES = { chromium, firefox };
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = pathToFileURL(path.join(ROOT, 'index.html')).href;
const QA04_INPUTS = ['5', 's', '3', 'n', '4', '9'];
const QA04_LAST_LINES = [
    'Somma del primo set di numeri: 8',
    'Numero massimo trovato nel secondo set di numeri: 9',
    'Numero minimo trovato nel secondo set di numeri: 4'
];
const VIEWPORTS = [
    { name: 'computer', width: 1440, height: 900, phone: false },
    { name: 'computer-stretto', width: 900, height: 700, phone: false },
    { name: 'telefono-360', width: 360, height: 640, phone: true },
    { name: 'telefono-375', width: 375, height: 667, phone: true }
];

function readOptions(argv) {
    const options = { engines: Object.keys(ENGINES), screenshots: '' };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--engines') {
            options.engines = argv[++i].split(',');
        } else if (argv[i] === '--screenshots') {
            options.screenshots = argv[++i];
        }
    }
    return options;
}

class Checks {
    constructor(label) {
        this.label = label;
        this.failures = [];
        this.count = 0;
    }

    ok(condition, description) {
        this.count++;
        if (!condition) {
            this.failures.push(description);
        }
    }
}

async function noHorizontalScroll(page) {
    return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
}

async function chooseExample(page, id = 'somma-massimo-minimo') {
    await page.click('#menu-button');
    await page.click(`[data-example="${id}"]`);
}

async function runQa04(page, checks, viewport) {
    await page.click('#run');
    if (viewport.phone) {
        checks.ok(await page.isVisible('#panel-console') && !(await page.isVisible('#panel-diagram')),
            'all\'avvio la console è in primo piano e il diagramma è nascosto');
    }
    for (const [index, value] of QA04_INPUTS.entries()) {
        if (viewport.phone && index === 2) {
            // Rotazione a metà dell'esecuzione: diagramma ed esecuzione restano (FR-MOB-13).
            await page.setViewportSize({ width: viewport.height, height: viewport.width });
            await page.waitForTimeout(200);
            checks.ok((await page.textContent('#status')).trim() === 'In attesa di un valore', 'in orizzontale l\'esecuzione aspetta ancora il valore');
            checks.ok(await noHorizontalScroll(page), 'in orizzontale nessuno scorrimento orizzontale');
            await page.setViewportSize({ width: viewport.width, height: viewport.height });
            await page.waitForTimeout(200);
            checks.ok((await page.locator('#diagram .dg-block').count()) > 20, 'tornati in verticale il diagramma c\'è ancora');
        }
        const field = page.locator('.console-field');
        await field.waitFor();
        const box = await field.boundingBox();
        checks.ok(box !== null && box.y >= 0 && box.y + box.height <= viewport.height,
            `il campo di input è dentro lo schermo (valore ${value})`);
        await field.fill(value);
        await field.press('Enter');
    }
    await page.waitForSelector('.console-note--done');
    const lines = (await page.textContent('#console-log')).split('\n').map((line) => line.trim()).filter(Boolean);
    const output = lines.filter((line) => QA04_LAST_LINES.includes(line));
    checks.ok(output.join('|') === QA04_LAST_LINES.join('|'), `output di QA-04: ${output.join(' | ')}`);
    checks.ok((await page.textContent('#status')).trim() === 'Terminato', 'stato "Terminato"');
}

async function checkSave(page, checks) {
    await page.fill('#file-name', 'prova salvataggio');
    await page.press('#file-name', 'Enter');
    await page.locator('#file-name').blur();
    const downloadPromise = page.waitForEvent('download');
    await page.click('#menu-button');
    await page.click('#cmd-save');
    const download = await downloadPromise;
    checks.ok(download.suggestedFilename() === 'prova salvataggio.fprg', `nome del file: ${download.suggestedFilename()}`);
    const saved = await readFile(await download.path(), 'utf8');
    const original = await page.evaluate(() => window.OnoFlow.Examples.byId('somma-massimo-minimo').text);
    const withoutSaved = (text) => text.replace(/<attribute name="saved" value="[^"]*"\/>/, '');
    checks.ok(withoutSaved(saved) === withoutSaved(original), 'testo salvato identico all\'esempio, salvo "saved" (FR-FILE-03)');
}

async function checkBadFile(page, checks) {
    const before = await page.textContent('#diagram');
    await page.setInputFiles('#file-input', { name: 'rotto.fprg', mimeType: 'text/plain', buffer: Buffer.from('<non è xml') });
    await page.waitForSelector('.notice--error');
    checks.ok(await page.textContent('#diagram') === before, 'con un file non valido il diagramma resta (FR-FILE-04)');
}

async function checkRestore(page, checks) {
    await page.reload();
    await page.waitForSelector('.notice');
    checks.ok((await page.inputValue('#file-name')) === 'prova salvataggio.fprg', 'nome del file ripristinato');
    checks.ok((await page.locator('#diagram [data-id]').count()) > 10, 'diagramma ripristinato');
}

async function checkMenuKeyboard(page, checks) {
    await page.focus('#menu-button');
    await page.keyboard.press('Enter');
    checks.ok(await page.isVisible('#menu'), 'il menu si apre da tastiera');
    checks.ok(await page.evaluate(() => document.activeElement.getAttribute('role') === 'menuitem'), 'il focus va sulla prima voce');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    checks.ok(!(await page.isVisible('#menu')), 'Esc chiude il menu');
    checks.ok(await page.evaluate(() => document.activeElement.id === 'menu-button'), 'il focus torna al pulsante del menu');
}

async function checkLongRun(page, checks) {
    const text = await page.evaluate(() => {
        const Model = window.OnoFlow.Model;
        const loop = Model.createBlock('while', { expression: 'true', body: [] });
        const program = Model.createProgram({ functions: [Model.createFunction({ name: 'Main', body: [loop] })] });
        return window.OnoFlow.Format.exportFprg(program);
    });
    await page.setInputFiles('#file-input', { name: 'ciclo.fprg', mimeType: 'application/octet-stream', buffer: Buffer.from(text) });
    await page.waitForSelector('#diagram [data-id]');
    const startedAt = Date.now();
    await page.click('#run');
    checks.ok(!(await page.isVisible('#diagram .dg-slots')), 'durante l\'esecuzione i punti di inserimento spariscono (FR-EDIT-07)');
    await page.waitForSelector('.console-note--question', { timeout: 10000 });
    const elapsed = Date.now() - startedAt;
    checks.ok(elapsed >= 4500 && elapsed < 8000, `domanda dopo circa 5 secondi (${elapsed} ms)`);
    checks.ok((await page.textContent('#status')).trim() === 'In pausa', 'stato "In pausa"');
    await page.click('.console-note--question button:last-child');
    await page.waitForSelector('.console-note--stopped');
    checks.ok((await page.textContent('#status')).trim() === 'Fermato', 'stato "Fermato" dopo Ferma');
}

async function zoomLabel(page) {
    return (await page.textContent('#zoom-reset')).trim();
}

async function checkDiagram(page, checks, viewport, engineName) {
    const blocks = await page.locator('#diagram svg.diagram g[data-id]').count();
    checks.ok(blocks > 20, `un gruppo SVG per blocco (${blocks})`);
    checks.ok(await zoomLabel(page) === '100%', 'l\'esempio si apre al 100%');
    const startBox = await page.locator('#diagram .dg-block--terminal').first().boundingBox();
    const sheetBox = await page.locator('#sheet').boundingBox();
    checks.ok(startBox && startBox.x >= sheetBox.x && startBox.x + startBox.width <= sheetBox.x + sheetBox.width,
        'Inizio è dentro il foglio all\'apertura');
    const width = async () => (await page.locator('#diagram svg.diagram').boundingBox()).width;
    const before = await width();
    await page.click('#zoom-in');
    checks.ok(await zoomLabel(page) === '125%', `Ingrandisci porta al 125% (${await zoomLabel(page)})`);
    checks.ok(Math.abs(await width() - before * 1.25) < 2, 'il disegno cresce del 25%');
    checks.ok(await page.evaluate(() => !window.visualViewport || window.visualViewport.scale === 1), 'la pagina non si ingrandisce');
    checks.ok(await noHorizontalScroll(page), 'nessuno scorrimento orizzontale della pagina con lo zoom');
    await page.click('#zoom-fit');
    const fitted = await page.locator('#diagram svg.diagram').boundingBox();
    const sheet = await page.evaluate(() => {
        const node = document.getElementById('sheet');
        return { width: node.clientWidth, height: node.clientHeight };
    });
    checks.ok(fitted.width <= sheet.width + 1 && fitted.height <= sheet.height + 1, 'Adatta allo schermo: il diagramma entra tutto');
    await page.click('#zoom-reset');
    checks.ok(await zoomLabel(page) === '100%', 'il pulsante della percentuale riporta al 100%');
    if (!viewport.phone) {
        await page.mouse.move(sheetBox.x + 200, sheetBox.y + 200);
        await page.keyboard.down('Control');
        await page.mouse.wheel(0, -200);
        await page.keyboard.up('Control');
        await page.waitForTimeout(100);
        checks.ok(await zoomLabel(page) !== '100%', `Ctrl + rotella cambia lo zoom del diagramma (${await zoomLabel(page)})`);
        await page.click('#zoom-reset');
    } else if (engineName === 'chromium') {
        // Pizzico simulato con eventi touch: due dita che si allontanano.
        await page.evaluate(() => {
            const sheetNode = document.getElementById('sheet');
            const box = sheetNode.getBoundingClientRect();
            const cx = box.left + box.width / 2;
            const cy = box.top + box.height / 2;
            const touches = (gap) => [0, 1].map((id) => new Touch({
                identifier: id, target: sheetNode, clientX: cx + (id ? gap : -gap), clientY: cy
            }));
            const send = (type, list) => sheetNode.dispatchEvent(new TouchEvent(type, {
                touches: list, targetTouches: list, changedTouches: list, bubbles: true, cancelable: true
            }));
            send('touchstart', touches(40));
            send('touchmove', touches(80));
            send('touchend', []);
        });
        await page.waitForTimeout(100);
        checks.ok(await zoomLabel(page) === '200%', `pizzico a due dita: zoom al 200% (${await zoomLabel(page)})`);
        await page.click('#zoom-reset');
    }
}

/* Errore alla fine di un diagramma lungo: tornando al diagramma il blocco è inquadrato. */
async function checkRuntimeReveal(page, checks, viewport) {
    const text = await page.evaluate(() => {
        const Model = window.OnoFlow.Model;
        const body = [Model.createBlock('declare', { names: 'x', type: 'Integer' })];
        for (let i = 0; i < 15; i++) {
            body.push(Model.createBlock('output', { expression: '"riga ' + i + '"' }));
        }
        body.push(Model.createBlock('assign', { variable: 'x', expression: '1 / 0' }));
        return window.OnoFlow.Format.exportFprg(Model.createProgram({ functions: [Model.createFunction({ name: 'Main', body })] }));
    });
    await page.setInputFiles('#file-input', { name: 'errore.fprg', mimeType: 'application/octet-stream', buffer: Buffer.from(text) });
    await page.waitForSelector('#diagram [data-id]');
    await page.click('#run');
    await page.waitForSelector('.console-note--error');
    if (viewport.phone) {
        await page.click('#tab-diagram');
    }
    const ring = await page.locator('#diagram .dg-ring').boundingBox();
    const sheet = await page.locator('#sheet').boundingBox();
    checks.ok(ring !== null && ring.y >= sheet.y && ring.y + ring.height <= sheet.y + sheet.height,
        'il blocco dell\'errore è inquadrato nel diagramma (FR-MOB-03)');
    checks.ok((await page.locator('#diagram-errors .diagram-error').count()) === 1, 'l\'errore è nell\'elenco sopra il foglio');
}

/* Nuovo e Salva: gli attributi di un file creato da zero (DEC-061). */
async function checkNewFile(page, checks) {
    await page.click('#menu-button');
    await page.click('#cmd-new');
    checks.ok(await page.inputValue('#file-name') === 'diagramma.fprg', 'Nuovo: nome diagramma.fprg');
    checks.ok(!(await page.isVisible('#modified')), 'Nuovo: nessun segno "Non salvato"');
    await page.fill('#file-name', 'esercizio');
    await page.press('#file-name', 'Enter');
    await page.locator('#file-name').blur();
    const downloadPromise = page.waitForEvent('download');
    await page.click('#menu-button');
    await page.click('#cmd-save');
    const download = await downloadPromise;
    const text = await readFile(await download.path(), 'utf8');
    const names = [...text.matchAll(/<attribute name="([^"]+)" value="([^"]*)"\/>/g)].map((match) => `${match[1]}=${match[2]}`);
    checks.ok(names.length === 4 && names[0] === 'name=esercizio' && names[1] === 'authors=' && names[2] === 'about=' &&
        names[3].startsWith('saved='), `attributi del file nuovo: ${names.join(', ')}`);
}

/* Diagramma ripristinato con modifiche: la barra prima di lasciarlo (FR-FILE-08). */
async function checkUnsaved(page, checks) {
    const markUnsaved = async () => {
        await page.evaluate(() => {
            const example = window.OnoFlow.Examples.byId('somma-massimo-minimo');
            sessionStorage.setItem(window.OnoFlow.SessionCopy.KEY, JSON.stringify({
                text: example.text, fileName: 'compito.fprg', saved: false, origin: 'file'
            }));
        });
        await page.reload();
        await page.waitForSelector('#diagram [data-id]');
    };
    await markUnsaved();
    checks.ok(await page.isVisible('#modified'), 'ripristinato con modifiche: segno "Non salvato" (FR-FILE-11)');
    await page.click('#menu-button');
    await page.click('#cmd-new');
    const bar = page.locator('.notice:has(.notice-action)');
    checks.ok(await bar.isVisible(), 'Nuovo con modifiche: la barra chiede cosa fare');
    checks.ok(await page.evaluate(() => document.activeElement.classList.contains('notice-action')), 'il focus va su Salva');
    await bar.locator('.notice-close').click();
    checks.ok(await page.inputValue('#file-name') === 'compito.fprg', 'Chiudi: il diagramma resta');
    await page.click('#menu-button');
    await page.click('#cmd-new');
    await page.locator('.notice-action', { hasText: 'Non salvare' }).click();
    checks.ok(await page.inputValue('#file-name') === 'diagramma.fprg' && !(await page.isVisible('#modified')),
        'Non salvare: si apre il diagramma nuovo');

    await markUnsaved();
    await page.click('#menu-button');
    await page.click('[data-example="somma-massimo-minimo"]');
    const downloadPromise = page.waitForEvent('download');
    await page.locator('.notice-action', { hasText: 'Salva' }).first().click();
    const download = await downloadPromise;
    checks.ok(download.suggestedFilename() === 'compito.fprg', `Salva scarica il diagramma di prima (${download.suggestedFilename()})`);
    checks.ok(await page.inputValue('#file-name') === 'somma-massimo-minimo.fprg', 'poi si apre l\'esempio scelto');

    await markUnsaved();
    let asked = false;
    page.on('dialog', async (dialog) => {
        asked = asked || dialog.type() === 'beforeunload';
        await dialog.dismiss();
    });
    await page.click('#sheet'); // il browser chiede conferma solo dopo un'interazione con la pagina
    await page.close({ runBeforeUnload: true });
    await new Promise((resolve) => setTimeout(resolve, 500));
    checks.ok(asked, 'chiusura con modifiche: il browser chiede conferma');
}

/* Inserimento dei blocchi dalle frecce, al tocco o con il mouse. */
async function checkInsert(page, checks, viewport) {
    const press = (selector) => viewport.phone ? page.tap(selector) : page.click(selector);
    await page.click('#menu-button');
    await page.click('#cmd-new');
    checks.ok(await page.locator('#diagram [data-slot]').count() === 1, 'diagramma nuovo: un punto di inserimento');
    await press('[data-slot="0"]');
    checks.ok(await page.isVisible('.block-menu'), 'un tocco sul punto apre il menu dei blocchi');
    const menuBox = await page.locator('.block-menu').boundingBox();
    checks.ok(menuBox.x >= 0 && menuBox.x + menuBox.width <= viewport.width + 1, 'il menu sta dentro lo schermo');
    for (const item of await page.locator('.block-menu-item').all()) {
        const box = await item.boundingBox();
        checks.ok(box.height >= 44, 'voce del menu alta almeno 44 px');
    }
    await press('[data-kind="if"]');
    checks.ok(!(await page.isVisible('.block-menu')), 'dopo la scelta il menu si chiude');
    await press('.edit-done'); // il blocco nuovo apre la finestra di modifica (passo 10): qui si lascia vuoto
    checks.ok(await page.isVisible('#modified'), 'dopo l\'inserimento: "Non salvato"');
    checks.ok(await page.locator('#diagram-errors .diagram-error').count() === 1, 'il blocco vuoto è un errore (FR-EDIT-03)');
    checks.ok(await page.isVisible('#selection-bar'), 'il blocco nuovo è selezionato, con "Inserisci dopo"');
    // Ramo Vero dell'if: il terzo punto (Main prima, ramo Vero, ramo Falso, Main dopo).
    const slots = await page.evaluate(() => Array.from(document.querySelectorAll('#diagram [data-slot]')).map((node) => node.getAttribute('aria-label')));
    const thenIndex = slots.findIndex((label) => label.includes('ramo Vero'));
    checks.ok(thenIndex !== -1, `punto con il nome del ramo Vero (${slots.join(' | ')})`);
    await press(`[data-slot="${thenIndex}"]`);
    await press('[data-kind="output"]');
    await press('.edit-done');
    await press('#insert-after');
    await press('[data-kind="assign"]');
    await press('.edit-done');
    const shape = await page.evaluate(() => {
        const main = window.OnoFlow.Format.importFprg(sessionStorage.getItem('onoflow.diagram') && JSON.parse(sessionStorage.getItem('onoflow.diagram')).text).program.functions[0];
        return main.body.map((block) => block.kind + (block.kind === 'if' ? '[' + block.then.map((inner) => inner.kind).join(',') + ']' : '')).join(' ');
    });
    checks.ok(shape === 'if[output,assign]', `struttura dopo gli inserimenti, anche nella copia di sessione: ${shape}`);
    checks.ok(await noHorizontalScroll(page), 'nessuno scorrimento orizzontale della pagina dopo gli inserimenti');
    if (!viewport.phone) {
        // Tastiera: Invio su un punto apre il menu, Esc lo chiude e il focus torna al punto.
        await page.focus('#diagram [data-slot="0"]');
        await page.keyboard.press('Enter');
        checks.ok(await page.isVisible('.block-menu'), 'Invio su un punto apre il menu');
        await page.keyboard.press('Escape');
        checks.ok(await page.evaluate(() => document.activeElement.getAttribute('data-slot') === '0'), 'Esc chiude e il focus torna al punto');
        // Zoom ridotto: il punto si colpisce ancora a 18 px dal centro (area di 44 px, FR-MOB-04).
        await page.click('#zoom-out');
        await page.click('#zoom-out');
        await page.click('#zoom-out');
        const point = await page.locator('#diagram [data-slot="0"] .dg-slot-mark').boundingBox();
        await page.mouse.click(point.x + point.width / 2 + 18, point.y + point.height / 2);
        checks.ok(await page.isVisible('.block-menu'), `con lo zoom al ${(await page.textContent('#zoom-reset')).trim()} il punto si colpisce a 18 px`);
        await page.keyboard.press('Escape');
        await page.click('#zoom-reset');
    }
}

/* Costruire da zero ed eseguire, solo con l'editor (verso QA-11). */
async function checkBuildAndRun(page, checks, viewport) {
    const press = (selector) => viewport.phone ? page.tap(selector) : page.click(selector);
    const typeInto = async (selector, text) => {
        await page.locator(selector).fill(text);
    };
    await page.click('#menu-button');
    await page.click('#cmd-new');
    // Il controllo di prima ha lasciato modifiche non salvate: c'è la barra (FR-FILE-08).
    checks.ok(await page.isVisible('.notice-action'), 'Nuovo dopo gli inserimenti: la barra delle modifiche non salvate');
    await press('.notice-action:has-text("Non salvare")');
    await press('#diagram [data-slot="0"]');
    await press('[data-kind="declare"]');
    checks.ok(await page.isVisible('.block-editor'), 'il blocco nuovo apre subito la finestra di modifica (FR-EDIT-03)');
    checks.ok(await page.evaluate(() => document.activeElement.classList.contains('edit-input')), 'il focus è nel primo campo');
    if (viewport.phone) {
        const box = await page.locator('.block-editor').boundingBox();
        checks.ok(box.x <= 0 && box.width >= viewport.width - 1 && box.height >= viewport.height * 0.9,
            'sul telefono la finestra è a tutto schermo (FR-MOB-07)');
        const field = await page.locator('.edit-input').first().boundingBox();
        checks.ok(field.y < 160, 'il campo è in alto');
        checks.ok(await page.isVisible('.edit-symbols'), 'la barra dei simboli è visibile (FR-MOB-08)');
    }
    await typeInto('.edit-input >> nth=0', 'n');
    await press('.edit-done');
    await press('#insert-after');
    await press('[data-kind="input"]');
    await typeInto('.edit-input >> nth=0', 'n');
    await press('.edit-done');
    await press('#insert-after');
    await press('[data-kind="output"]');
    // Errore mentre si scrive, poi corretto; il simbolo * dalla barra.
    await typeInto('.edit-input >> nth=0', 'n 2,5');
    checks.ok(await page.isVisible('.edit-error .pen-wave'), 'errore mentre si scrive, con l\'onda');
    await typeInto('.edit-input >> nth=0', 'n ');
    await page.locator('.edit-input').first().press('End');
    await press('[data-symbol="*"]');
    await page.locator('.edit-input').first().press('End');
    await page.keyboard.type(' 2');
    checks.ok((await page.inputValue('.edit-input >> nth=0')) === 'n * 2', `simbolo dalla barra: ${await page.inputValue('.edit-input >> nth=0')}`);
    checks.ok(!(await page.isVisible('.edit-error:not([hidden])')), 'corretto: nessun errore');
    await press('.edit-done');
    checks.ok(!(await page.isVisible('.block-editor')), 'Fatto chiude la finestra');
    checks.ok((await page.locator('#diagram-errors .diagram-error').count()) === 0, 'nessun errore nel diagramma');
    // Secondo tocco sul blocco selezionato: si riapre la modifica (B3).
    const selected = await page.evaluate(() => document.querySelector('#diagram .is-selected').getAttribute('data-id'));
    await press(`#diagram [data-id="${selected}"]`);
    checks.ok(await page.isVisible('.block-editor'), 'un secondo tocco sul blocco selezionato apre la modifica');
    await press('.edit-done');

    await page.click('#run');
    const field = page.locator('.console-field');
    await field.waitFor();
    await field.fill('21');
    await field.press('Enter');
    await page.waitForSelector('.console-note--done');
    const output = (await page.textContent('#console-log')).split('\n').map((line) => line.trim()).filter(Boolean);
    checks.ok(output[output.length - 2] === '42' || output.includes('42'), `il programma costruito da zero stampa 42 (${output.join(' | ')})`);
    if (viewport.phone) {
        await page.click('#tab-diagram');
    }
}

/* Cancellazione di un blocco e di un ciclo con il contenuto, poi Annulla (FR-EDIT-04). */
async function checkDelete(page, checks, viewport) {
    const press = (selector) => viewport.phone ? page.tap(selector) : page.click(selector);
    const mainBody = () => page.evaluate(() => {
        const copy = JSON.parse(sessionStorage.getItem('onoflow.diagram'));
        return window.OnoFlow.Format.importFprg(copy.text).program.functions[0].body.map((block) => block.kind).join(' ');
    });
    const idsInMain = () => page.evaluate(() => Array.from(document.querySelectorAll('#diagram .is-selectable')).map((node) => node.getAttribute('data-id')));
    // Il programma del controllo di prima: dichiarazione, input, output.
    checks.ok((await mainBody()) === 'declare input output', `prima della cancellazione: ${await mainBody()}`);
    const inputId = (await idsInMain())[1];
    await press(`#diagram [data-id="${inputId}"]`);
    checks.ok(await page.isVisible('#delete-block'), 'blocco selezionato: c\'è "Elimina"');
    const bar = await page.locator('#selection-bar').boundingBox();
    checks.ok(bar.x >= 0 && bar.x + bar.width <= viewport.width + 1, 'la barra della selezione sta dentro lo schermo');
    const zoom = await page.locator('.zoom').boundingBox();
    checks.ok(bar.y + bar.height <= zoom.y || bar.x + bar.width <= zoom.x, 'la barra della selezione non copre i comandi dello zoom');
    await press('#delete-block');
    checks.ok((await mainBody()) === 'declare output', `"Elimina" toglie il blocco: ${await mainBody()}`);
    checks.ok(await page.isVisible('#modified'), 'dopo la cancellazione: "Non salvato"');
    checks.ok(!(await page.isVisible('#selection-bar')), 'dopo la cancellazione non resta nulla selezionato');
    const undo = page.locator('.notice-action:has-text("Annulla")');
    checks.ok(await undo.isVisible(), 'l\'avviso offre Annulla');
    checks.ok(await page.locator('#diagram-errors .diagram-error').count() === 0, 'nessun errore: n resta dichiarata');
    await press('.notice-action:has-text("Annulla")');
    checks.ok((await mainBody()) === 'declare input output', `Annulla rimette il blocco: ${await mainBody()}`);
    checks.ok((await idsInMain())[1] === inputId, 'Annulla rimette lo stesso blocco, con lo stesso ID');
    checks.ok(await page.evaluate((id) => document.querySelector('#diagram .is-selected')?.getAttribute('data-id') === id, inputId), 'il blocco rimesso è selezionato');

    // Un ciclo dell'esempio, con tutto il contenuto.
    await chooseExample(page);
    await press('.notice-action:has-text("Non salvare")');
    const before = await mainBody();
    const blocksBefore = (await idsInMain()).length;
    const loopId = await page.getAttribute('#diagram .dg-block--loop.is-selectable', 'data-id');
    if (viewport.phone) {
        // Il testo del ciclo: il gruppo del do comprende anche il ritorno, più alto dello schermo.
        await press(`#diagram [data-id="${loopId}"] text`);
        await press('#delete-block');
    } else {
        // Tastiera: Canc sul blocco a fuoco.
        await page.focus(`#diagram [data-id="${loopId}"]`);
        await page.keyboard.press('Delete');
        checks.ok(await page.evaluate(() => document.activeElement.hasAttribute('data-slot')), 'dopo Canc il focus resta sul punto dove c\'era il blocco');
    }
    const removed = blocksBefore - (await idsInMain()).length;
    checks.ok(removed > 1 && !(await idsInMain()).includes(loopId), `il ciclo sparisce con il contenuto (${removed} blocchi)`);
    checks.ok((await page.textContent('#notices')).includes(`con i ${removed - 1} blocchi che conteneva`),
        `l'avviso conta i blocchi che conteneva: ${(await page.textContent('#notices')).trim()}`);
    await press('.notice-action:has-text("Annulla")');
    checks.ok((await mainBody()) === before && (await idsInMain()).length === blocksBefore, 'Annulla rimette il ciclo con tutto il contenuto');
    checks.ok(await noHorizontalScroll(page), 'nessuno scorrimento orizzontale dopo la cancellazione');
}

/* Annulla e Ripeti dai pulsanti e dalla tastiera (FR-EDIT-05, QA-13, DEC-068). */
async function checkHistory(page, checks, viewport) {
    const press = (selector) => viewport.phone ? page.tap(selector) : page.click(selector);
    // Nella barra da 64rem in su, altrimenti sul foglio.
    const inBar = viewport.width >= 1024;
    const undo = inBar ? '#undo' : '#undo-sheet';
    const redo = inBar ? '#redo' : '#redo-sheet';
    const outputs = () => page.evaluate(() => {
        const copy = JSON.parse(sessionStorage.getItem('onoflow.diagram'));
        return window.OnoFlow.Format.importFprg(copy.text).program.functions[0].body.map((block) => block.fields.expression.text).join(' | ');
    });
    await page.click('#menu-button');
    await page.click('#cmd-new');
    if (await page.isVisible('.notice-action:has-text("Non salvare")')) {
        await press('.notice-action:has-text("Non salvare")');
    }
    checks.ok(await page.isVisible(undo) && await page.isDisabled(undo) && await page.isDisabled(redo),
        `diagramma nuovo: ${undo} visibile e disabilitato, come Ripeti`);
    checks.ok(await page.isHidden(inBar ? '#undo-sheet' : '#undo'), 'una sola coppia di pulsanti visibile');
    if (!inBar) {
        const history = await page.locator('.history-controls--sheet').boundingBox();
        const zoom = await page.locator('.zoom').boundingBox();
        checks.ok(history.x >= 0 && history.x + history.width <= zoom.x, 'sul foglio Annulla e Ripeti stanno a sinistra dello zoom');
    }
    // Due passi: un output inserito e riempito (un solo passo), poi cambiato.
    await press('#diagram [data-slot="0"]');
    await press('[data-kind="output"]');
    await page.locator('.edit-input').first().fill('1');
    await press('.edit-done');
    checks.ok(!(await page.isDisabled(undo)), 'dopo l\'inserimento Annulla è attivo');
    await press('#edit-block');
    await page.locator('.edit-input').first().fill('2');
    await page.locator('.edit-input').first().fill('23');
    await press('.edit-done');
    checks.ok((await outputs()) === '23', `dopo la modifica: ${await outputs()}`);

    await press(undo);
    checks.ok((await outputs()) === '1', `Annulla: tutta la modifica in un passo (${await outputs()})`);
    checks.ok(await page.isVisible('#modified'), 'ancora "Non salvato"');
    await press(undo);
    checks.ok((await outputs()) === '', `Annulla: il blocco inserito sparisce, già riempito (${await outputs()})`);
    checks.ok(!(await page.isVisible('#modified')), 'tornati al diagramma iniziale: "Non salvato" si spegne (QA-13)');
    checks.ok(await page.isDisabled(undo) && !(await page.isDisabled(redo)), 'niente più da annullare, Ripeti attivo');
    await press(redo);
    await press(redo);
    checks.ok((await outputs()) === '23', `Ripeti due volte: di nuovo la fine (${await outputs()})`);
    checks.ok(await page.isVisible('#modified') && await page.isDisabled(redo), 'di nuovo "Non salvato", niente da ripetere');

    // Dal menu.
    await page.click('#menu-button');
    await page.click('#cmd-undo');
    checks.ok((await outputs()) === '1', 'Menu → Annulla');
    await page.click('#menu-button');
    await page.click('#cmd-redo');
    checks.ok((await outputs()) === '23', 'Menu → Ripeti');

    if (!viewport.phone) {
        await page.focus('#sheet');
        await page.keyboard.press('Control+z');
        checks.ok((await outputs()) === '1', 'Ctrl + Z sul foglio annulla');
        await page.keyboard.press('Control+y');
        checks.ok((await outputs()) === '23', 'Ctrl + Y ripete');
        await page.keyboard.press('Control+Shift+z');
        checks.ok(await page.isDisabled(redo), 'Ctrl + Maiusc + Z: niente da ripetere, nulla cambia');
        // Dentro un campo Ctrl + Z resta quello del browser.
        await page.click('#edit-block');
        await page.locator('.edit-input').first().press('End');
        await page.keyboard.type('4');
        await page.keyboard.press('Control+z');
        checks.ok(await page.isVisible('.block-editor'), 'Ctrl + Z in un campo non chiude la finestra');
        await page.click('.edit-done');
        const last = await outputs();
        checks.ok(last === '23' || last === '234', `Ctrl + Z in un campo non annulla il diagramma (${last})`);
        // Con la finestra aperta si passa a un altro blocco: ognuno è un passo a sé.
        await page.click('#insert-after');
        await page.click('[data-kind="output"]');
        await page.locator('.edit-input').first().fill('5');
        await page.click('.edit-done');
        const ids = await page.evaluate(() => Array.from(document.querySelectorAll('#diagram .is-selectable')).map((node) => node.getAttribute('data-id')));
        await page.dblclick(`#diagram [data-id="${ids[0]}"] text`);
        await page.locator('.edit-input').first().fill('7');
        await page.click(`#diagram [data-id="${ids[1]}"] text`);
        await page.locator('.edit-input').first().fill('8');
        await page.click('.edit-done');
        checks.ok((await outputs()) === '7 | 8', `due blocchi nella stessa apertura: ${await outputs()}`);
        await page.click(undo);
        checks.ok((await outputs()) === '7 | 5', `Annulla: solo il secondo blocco (${await outputs()})`);
        await page.click(undo);
        checks.ok((await outputs()) === `${last} | 5`, `Annulla: poi il primo (${await outputs()})`);
    }
    checks.ok(await noHorizontalScroll(page), 'nessuno scorrimento orizzontale con Annulla e Ripeti');
}

/* Download del Salva del menu: nome e testo. */
async function saveFromMenu(page) {
    const downloadPromise = page.waitForEvent('download');
    await page.click('#menu-button');
    await page.click('#cmd-save');
    const download = await downloadPromise;
    return { name: download.suggestedFilename(), text: await readFile(await download.path(), 'utf8') };
}

async function leaveUnsaved(page, press) {
    if (await page.isVisible('.notice-action:has-text("Non salvare")')) {
        await press('.notice-action:has-text("Non salvare")');
    }
}

/* Struttura di Main senza ID (tipo, contenuto, figli), dalla copia di sessione o da un testo. */
function mainShape(page, text) {
    return page.evaluate((source) => {
        const { Format, Editor, Model } = window.OnoFlow;
        const shape = (list) => list.map((block) => {
            const item = { kind: block.kind, content: Editor.contentOf(block) };
            Model.childListsOf(block).forEach((name) => { item[name] = shape(block[name]); });
            return item;
        });
        const fprg = source || JSON.parse(sessionStorage.getItem('onoflow.diagram')).text;
        return JSON.stringify(shape(Format.importFprg(fprg).program.functions[0].body));
    }, text || null);
}

function bodyLines(text) {
    const lines = text.split('\n');
    return lines.slice(lines.indexOf('        <body>'), lines.indexOf('        </body>') + 1).join('\n');
}

/* ID del blocco disegnato il cui testo, senza spazi, è quello dato. */
function blockWithText(page, text) {
    return page.evaluate((wanted) => {
        const node = Array.from(document.querySelectorAll('#diagram .is-selectable'))
            .find((group) => group.textContent.replace(/\s+/g, '') === wanted);
        return node ? node.getAttribute('data-id') : null;
    }, text);
}

/*
 * Tocco o clic su un elemento del disegno come farebbe una persona: prima il foglio scorre fino a
 * lui, poi si tocca il suo centro. Lo scorrimento automatico di Playwright in Firefox non porta in
 * vista un <g> dell'SVG (lo stesso difetto del focus, DEC-069).
 */
function pressInSheet(page, viewport) {
    return async (selector) => {
        if (!selector.startsWith('#diagram')) {
            return viewport.phone ? page.tap(selector) : page.click(selector);
        }
        const point = await page.evaluate((target) => {
            const sheet = document.getElementById('sheet');
            const node = document.querySelector(target);
            let box = node.getBoundingClientRect();
            const frame = sheet.getBoundingClientRect();
            sheet.scrollTop += box.top + box.height / 2 - (frame.top + frame.height / 2);
            sheet.scrollLeft += box.left + box.width / 2 - (frame.left + frame.width / 2);
            box = node.getBoundingClientRect();
            const x = box.left + box.width / 2;
            const y = box.top + box.height / 2;
            const hit = document.elementFromPoint(x, y);
            return { x, y, hit: Boolean(hit && node.contains(hit)) };
        }, selector);
        if (!point.hit) {
            throw new Error(`${selector}: al centro c'è un altro elemento`);
        }
        return viewport.phone ? page.touchscreen.tap(point.x, point.y) : page.mouse.click(point.x, point.y);
    };
}

/* QA-11: l'Appendice A da zero, solo con l'editor, al tocco sul telefono. */
async function checkQa11(page, checks, viewport, shot) {
    const press = pressInSheet(page, viewport);
    const appendix = await page.evaluate(() => window.OnoFlow.Examples.byId('somma-massimo-minimo').text);
    const recipe = JSON.parse(await mainShape(page, appendix));
    const fields = await page.evaluate(() => window.OnoFlow.BlockEditor.FIELDS);
    const childLists = { 'if': ['then', 'else'], 'while': ['body'], 'do': ['body'], 'for': ['body'] };
    await page.click('#menu-button');
    await page.click('#cmd-new');
    await leaveUnsaved(page, press);
    const mainId = await page.getAttribute('#diagram [data-slot="0"]', 'data-owner');
    let selected = null;
    let count = 0;

    async function fill(item) {
        for (const spec of fields[item.kind]) {
            if (spec.onlyIf && !item.content.properties[spec.onlyIf]) {
                continue; // campo nascosto, come la dimensione di una variabile semplice
            }
            const control = page.locator(`.block-editor [id$="-${spec.name}"]`);
            if (spec.control === 'text') {
                await control.fill(item.content.fields[spec.name]);
            } else if (spec.control === 'check') {
                await control.setChecked(item.content.properties[spec.name]);
            } else {
                await control.selectOption(item.content.properties[spec.name]);
            }
        }
        await press('.edit-done');
    }

    /*
     * Ogni blocco come lo farebbe una persona: il primo di un elenco dal suo punto con il +,
     * gli altri con "Inserisci dopo" sul blocco precedente (selezionandolo se serve).
     */
    async function build(ownerId, list, items) {
        let previous = null;
        for (const item of items) {
            if (previous === null) {
                await press(`#diagram [data-owner="${ownerId}"][data-list="${list}"][data-index="0"]`);
            } else {
                if (selected !== previous) {
                    await press(`#diagram [data-id="${previous}"] text`);
                }
                await press('#insert-after');
            }
            await press(`.block-menu [data-kind="${item.kind}"]`);
            await fill(item);
            const id = await page.getAttribute('#diagram .is-selected', 'data-id');
            selected = id;
            count++;
            for (const name of childLists[item.kind] || []) {
                await build(id, name, item[name]);
            }
            previous = id;
        }
    }
    await build(mainId, 'body', recipe);

    const total = (items) => items.reduce((sum, item) => sum + 1 + (childLists[item.kind] || []).reduce((inner, name) => inner + total(item[name]), 0), 0);
    checks.ok(count === total(recipe), `QA-11: ${count} blocchi inseriti con l'editor, uno per uno`);
    checks.ok((await mainShape(page)) === JSON.stringify(recipe), 'QA-11: il diagramma costruito è l\'Appendice A');
    checks.ok((await page.locator('#diagram-errors .diagram-error').count()) === 0, 'QA-11: nessun errore');
    if (shot) {
        await shot('qa11-costruito');
    }
    await runQa04(page, checks, viewport);
    if (viewport.phone) {
        await page.click('#tab-diagram');
    }
    await page.fill('#file-name', 'esercizio');
    await page.locator('#file-name').blur();
    const saved = await saveFromMenu(page);
    checks.ok(saved.name === 'esercizio.fprg', `QA-11: salvato come ${saved.name}`);
    checks.ok(bodyLines(saved.text) === bodyLines(appendix), 'QA-11: nel file il corpo è scritto come nell\'Appendice A');
    checks.ok(saved.text.includes('<attribute name="name" value="esercizio"/>') && !saved.text.includes('"created"'),
        'QA-11: attributi di un file nuovo (DEC-061)');
    await page.setInputFiles('#file-input', { name: saved.name, mimeType: 'text/plain', buffer: Buffer.from(saved.text) });
    await page.waitForFunction(() => document.getElementById('file-name').value === 'esercizio.fprg');
    checks.ok((await page.locator('.notice--warning, .notice--error').count()) === 0, 'QA-11: il file si riapre senza avvisi');
    checks.ok((await mainShape(page)) === JSON.stringify(recipe), 'QA-11: riaperto, lo stesso modello (FR-FILE-10)');
}

/* QA-12: l'Appendice A modificata e salvata; nel file cambiano solo le righe toccate. */
async function checkQa12(page, checks, viewport) {
    const press = pressInSheet(page, viewport);
    await chooseExample(page);
    await leaveUnsaved(page, press);
    if (viewport.phone && !(await page.isVisible('#panel-diagram'))) {
        await page.click('#tab-diagram');
    }
    const original = await page.evaluate(() => window.OnoFlow.Examples.byId('somma-massimo-minimo').text);
    // Un'espressione: la fine del for.
    const forId = await blockWithText(page, 'fori=0todim-1');
    await press(`#diagram [data-id="${forId}"] text`);
    await press('#edit-block');
    await page.locator('.block-editor [id$="-end"]').fill('dim - 1');
    await press('.edit-done');
    // Un blocco aggiunto dopo numeri[i] = n.
    const assignId = await blockWithText(page, 'numeri[i]=n');
    await press(`#diagram [data-id="${assignId}"] text`);
    await press('#insert-after');
    await press('.block-menu [data-kind="output"]');
    await page.locator('.block-editor [id$="-expression"]').fill('"Fine dei numeri"');
    await press('.edit-done');
    // Un blocco cancellato.
    const declareId = await blockWithText(page, 'Integerrisultato');
    await press(`#diagram [data-id="${declareId}"] text`);
    await press('#delete-block');
    const saved = await saveFromMenu(page);

    const expected = original.split('\n');
    const at = (line) => expected.indexOf(line);
    expected[at('            <for variable="i" start="0" end="dim -1" direction="inc" step="1">')] =
        '            <for variable="i" start="0" end="dim - 1" direction="inc" step="1">';
    expected.splice(at('                <assign variable="numeri[i]" expression="n"/>') + 1, 0,
        '                <output expression="&quot;Fine dei numeri&quot;" newline="True"/>');
    expected.splice(at('            <declare name="risultato" type="Integer" array="False" size=""/>'), 1);
    const withoutSaved = (text) => text.replace(/<attribute name="saved" value="[^"]*"\/>/, '');
    const got = withoutSaved(saved.text).split('\n');
    const want = withoutSaved(expected.join('\n')).split('\n');
    const firstDifference = got.findIndex((line, index) => line !== want[index]);
    checks.ok(got.length === want.length && firstDifference === -1,
        `QA-12: cambiano solo le righe toccate, gli attributi restano${firstDifference === -1 ? '' : ` (riga ${firstDifference + 1}: ${got[firstDifference]})`}`);
    checks.ok(saved.name === 'somma-massimo-minimo.fprg' && /<attribute name="saved" value="\d{4}-\d\d-\d\d \d\d:\d\d:\d\d "\/>/.test(saved.text),
        'QA-12: stesso nome, "saved" aggiornato');
    checks.ok(!(await page.isVisible('#modified')), 'dopo il salvataggio niente "Non salvato"');
    const before = await mainShape(page);
    await page.setInputFiles('#file-input', { name: saved.name, mimeType: 'text/plain', buffer: Buffer.from(saved.text) });
    await page.waitForFunction(() => !document.querySelector('#diagram .is-selected'));
    checks.ok((await page.locator('.notice--warning, .notice--error').count()) === 0, 'QA-12: il file si riapre senza avvisi');
    checks.ok((await mainShape(page)) === before, 'QA-12: riaperto, lo stesso diagramma (FR-FILE-10)');
}

/* Il focus da tastiera su un blocco o un punto lontano lo porta in vista, anche in Firefox (DEC-069). */
async function checkFocusReveal(page, checks) {
    await chooseExample(page);
    await leaveUnsaved(page, (selector) => page.click(selector));
    for (const selector of ['#diagram [data-slot]', '#diagram .is-selectable']) {
        const inView = await page.evaluate(async (kind) => {
            const sheet = document.getElementById('sheet');
            const nodes = document.querySelectorAll(kind);
            const target = nodes[nodes.length - 2];
            sheet.scrollTop = 0;
            target.focus();
            await new Promise((resolve) => setTimeout(resolve, 100));
            const box = target.getBoundingClientRect();
            const frame = sheet.getBoundingClientRect();
            return box.top >= frame.top && box.bottom <= frame.bottom;
        }, selector);
        checks.ok(inView, `focus su ${selector === '#diagram [data-slot]' ? 'un punto' : 'un blocco'} in fondo al diagramma: è in vista`);
    }
}

/* Analisi statica nella finestra di modifica e prima dell'esecuzione (FR-ERR-06, D-06). */
async function checkStaticAnalysis(page, checks, viewport) {
    const press = (selector) => viewport.phone ? page.tap(selector) : page.click(selector);
    await page.click('#menu-button');
    await page.click('#cmd-new');
    await leaveUnsaved(page, press);
    await press('#diagram [data-slot="0"]');
    await press('.block-menu [data-kind="declare"]');
    await page.locator('.block-editor [id$="-names"]').fill('b');
    await page.locator('.block-editor [id$="-type"]').selectOption('Boolean');
    await press('.edit-done');
    await press('#insert-after');
    await press('.block-menu [data-kind="assign"]');
    await page.locator('.block-editor [id$="-variable"]').fill('b');
    await page.locator('.block-editor [id$="-expression"]').fill('True');
    const error = page.locator('.block-editor [id$="-expression-error"]');
    checks.ok(await error.isVisible() && (await error.textContent()).includes('Forse si intendeva «true»'),
        `mentre si scrive: ${(await error.textContent()).trim()}`);
    checks.ok(await page.locator('.block-editor [id$="-variable-error"]').isHidden(), 'l\'errore sta solo sotto il suo campo');
    await press('.edit-done');
    checks.ok((await page.textContent('#diagram-errors')).includes('«true»'), 'l\'errore è anche nell\'elenco sopra il foglio');
    await page.click('#run');
    await page.waitForFunction(() => document.getElementById('status').textContent.trim() !== 'In esecuzione');
    checks.ok((await page.textContent('#status')).trim() === 'Non eseguito: ci sono errori', `non si esegue: ${(await page.textContent('#status')).trim()}`);
    if (viewport.phone) {
        await page.click('#tab-diagram');
    }
    const assignId = await page.evaluate(() => {
        const groups = document.querySelectorAll('#diagram .is-selectable');
        return groups[groups.length - 1].getAttribute('data-id');
    });
    await press(`#diagram [data-id="${assignId}"] text`);
    await press('#edit-block');
    await page.locator('.block-editor [id$="-expression"]').fill('true');
    checks.ok(await error.isHidden(), 'corretto in true: l\'errore sparisce');
    await press('.edit-done');
    checks.ok((await page.locator('#diagram-errors .diagram-error').count()) === 0, 'nessun errore nel diagramma');
}

/* Commento e chiamata inseriti e modificati con l'editor (FR-EDIT-10, passo 17). */
async function checkCallComment(page, checks, viewport) {
    const press = (selector) => viewport.phone ? page.tap(selector) : page.click(selector);
    await page.click('#menu-button');
    await page.click('#cmd-new');
    await leaveUnsaved(page, press);
    await press('#diagram [data-slot="0"]');
    checks.ok((await page.locator('.block-menu-item').count()) === 10, 'il menu dei blocchi ha anche Chiamata e Commento');
    const menu = await page.locator('.block-menu').boundingBox();
    checks.ok(menu.y >= 0 && menu.y + menu.height <= viewport.height + 1, 'con dieci voci il menu sta nello schermo');
    await press('.block-menu [data-kind="comment"]');
    await page.locator('.block-editor textarea').fill('Somma dei "voti"');
    await press('.edit-done');
    checks.ok((await page.textContent('#diagram')).includes('// Somma dei "voti"'), 'il commento è disegnato con il suo testo');
    await press('#insert-after');
    await press('.block-menu [data-kind="call"]');
    await page.locator('.block-editor [id$="-expression"]').fill('Saluta()');
    const error = page.locator('.block-editor [id$="-expression-error"]');
    checks.ok(await error.isVisible() && (await error.textContent()).includes('Saluta'), `una funzione che non esiste: ${(await error.textContent()).trim()}`);
    await page.locator('.block-editor [id$="-expression"]').fill('ToString(1)');
    checks.ok(await error.isHidden(), 'con una funzione esistente l\'errore sparisce');
    await press('.edit-done');
    const saved = await saveFromMenu(page);
    checks.ok(saved.text.includes('<comment text="Somma dei &quot;voti&quot;"/>') && saved.text.includes('<call expression="ToString(1)"/>'),
        'nel file salvato commento e chiamata (§7.4)');
    // Si riaprono con Modifica, non più barrato.
    const commentId = await page.evaluate(() => document.querySelector('#diagram .dg-block--comment.is-selectable, #diagram .is-selectable').getAttribute('data-id'));
    await press(`#diagram [data-id="${commentId}"] text`);
    checks.ok(!(await page.isDisabled('#edit-block')), 'un commento si modifica: Modifica attivo');
}

/* Funzioni: crearle, scriverne il corpo, chiamarle, rinominarle, cancellarle (FR-EDIT-11, passo 18). */
async function checkFunctions(page, checks, viewport) {
    const press = pressInSheet(page, viewport);
    const fill = (selector, text) => page.locator(`.block-editor ${selector}`).first().fill(text);
    const mainText = () => page.evaluate(() => {
        const program = window.OnoFlow.Format.importFprg(JSON.parse(sessionStorage.getItem('onoflow.diagram')).text).program;
        return program.functions.map((fn) => fn.name + ':' + fn.body.map((block) => block.kind + (block.fields.expression ? '[' + block.fields.expression.text + ']' : '')).join(',')).join(' | ');
    });
    await page.click('#menu-button');
    await page.click('#cmd-new');
    await leaveUnsaved(page, press);
    await page.click('#menu-button');
    await page.click('#cmd-new-function');
    checks.ok(await page.isVisible('.block-editor .edit-parameter-add'), 'Nuova funzione apre la sua firma');
    await fill('[id$="-name"]', 'Doppio');
    await page.locator('.block-editor [id$="-type"]').selectOption('Integer');
    await fill('[id$="-variable"]', 'r');
    await press('.edit-parameter-add');
    checks.ok(await page.evaluate(() => /-0-name$/.test(document.activeElement.id)), 'Aggiungi parametro: il focus va sul nome del parametro');
    await page.keyboard.type('n');
    // Un secondo parametro con un nome sbagliato: l'errore sta sotto di lui, non sotto il primo.
    await press('.edit-parameter-add');
    await page.keyboard.type('2b');
    const paramError = (index) => page.locator(`.block-editor [id$="-parameters-${index}-name-error"]`);
    checks.ok(await paramError(1).isVisible() && await paramError(0).isHidden(), 'l\'errore del parametro sta sotto quel parametro');
    await press('.block-editor .edit-parameter-remove >> nth=1');
    checks.ok((await page.locator('.block-editor .edit-parameter').count()) === 1, 'Togli toglie il parametro');
    await press('.edit-done');
    checks.ok((await page.textContent('#diagram')).includes('Funzione Doppio(Integer n) \u2192 Integer r'), 'il titolo mostra la firma');
    checks.ok((await page.textContent('#diagram-errors')).includes('deve dichiarare la variabile'), 'la variabile restituita va dichiarata');

    // Il corpo di Doppio, poi Main che la chiama.
    const fnId = await page.evaluate(() => document.querySelector('#diagram .is-function').getAttribute('data-id'));
    const mainId = await page.getAttribute('#diagram [data-slot="0"]', 'data-owner');
    const addBlock = async (slotOwner, kind, fields) => {
        if (slotOwner) {
            await press(`#diagram [data-owner="${slotOwner}"][data-list="body"][data-index="0"]`);
        } else {
            await press('#insert-after');
        }
        await press(`.block-menu [data-kind="${kind}"]`);
        for (const [name, value] of Object.entries(fields)) {
            if (name === 'type') {
                await page.locator('.block-editor [id$="-type"]').selectOption(value);
            } else {
                await fill(`[id$="-${name}"]`, value);
            }
        }
        await press('.edit-done');
    };
    await addBlock(fnId, 'declare', { names: 'r' });
    await addBlock(null, 'assign', { variable: 'r', expression: 'n * 2' });
    await addBlock(mainId, 'declare', { names: 'x' });
    await addBlock(null, 'assign', { variable: 'x', expression: 'Doppio(21)' });
    await addBlock(null, 'output', { expression: 'x' });
    checks.ok((await page.locator('#diagram-errors .diagram-error').count()) === 0, 'nessun errore: la funzione è completa');
    await page.click('#run');
    await page.waitForSelector('.console-note--done', { state: 'attached' });
    checks.ok((await page.textContent('#console-log')).includes('42'), 'Main chiama Doppio(21) e stampa 42');
    if (viewport.phone) {
        await page.click('#tab-diagram');
    }

    // Rinominare: le chiamate seguono, in un solo passo di Annulla.
    await press(`#diagram [data-id="${fnId}"] text`);
    checks.ok(!(await page.isDisabled('#edit-block')), 'l\'Inizio di una funzione si seleziona e si modifica');
    checks.ok(await page.isDisabled('#move-block'), 'una funzione non si sposta: Sposta disabilitato');
    await press('#edit-block');
    await fill('[id$="-name"]', 'Triplo');
    await press('.edit-done');
    checks.ok((await mainText()).includes('assign[Triplo(21)]'), `rinominata, la chiamata segue: ${await mainText()}`);
    checks.ok((await page.locator('#diagram-errors .diagram-error').count()) === 0, 'dopo la rinomina nessun errore');
    const undo = viewport.width >= 1024 ? '#undo' : '#undo-sheet';
    await press(undo);
    checks.ok((await mainText()).includes('assign[Doppio(21)]') && (await mainText()).includes('Doppio:'), `Annulla: nome e chiamata di prima (${await mainText()})`);

    // Cancellare la funzione e rimetterla. Dopo Annulla è già selezionata: un altro tocco la aprirebbe (B3).
    if (!(await page.evaluate((id) => document.querySelector(`#diagram [data-id="${id}"]`).classList.contains('is-selected'), fnId))) {
        await press(`#diagram [data-id="${fnId}"] text`);
    }
    await press('#delete-block');
    checks.ok((await page.textContent('#notices')).includes('Funzione «Doppio» eliminata, con i 2 blocchi che conteneva'), 'Elimina toglie la funzione con il corpo');
    checks.ok((await page.textContent('#diagram-errors')).includes('Doppio'), 'la chiamata a una funzione che non c\'è più è un errore');
    await press('.notice-action:has-text("Annulla")');
    checks.ok((await mainText()).startsWith('Main:') && (await mainText()).includes('Doppio:declare,assign[n * 2]'), 'Annulla la rimette con il corpo');

    const saved = await saveFromMenu(page);
    checks.ok(saved.text.includes('<function name="Doppio" type="Integer" variable="r">') &&
        saved.text.includes('<parameter name="n" type="Integer" array="False"/>'), 'nel file la funzione con il parametro (§7.4)');
    checks.ok(await noHorizontalScroll(page), 'nessuno scorrimento orizzontale con le funzioni');
}

/* Spostamento dei blocchi: Sposta, poi un + (FR-EDIT-12, D-03, passo 19). */
async function checkMove(page, checks, viewport) {
    const press = pressInSheet(page, viewport);
    const shape = () => page.evaluate(() => {
        const main = window.OnoFlow.Format.importFprg(JSON.parse(sessionStorage.getItem('onoflow.diagram')).text).program.functions[0];
        const text = (block) => block.kind + (block.fields.expression ? '(' + block.fields.expression.text + ')' : '');
        return main.body.map((block) => text(block) + (block.kind === 'if' ? '[' + block.then.map(text).join(',') + ']' : '')).join(' ');
    });
    await chooseExample(page, 'pari-dispari');
    await leaveUnsaved(page, press);
    if (viewport.phone && !(await page.isVisible('#panel-diagram'))) {
        await page.click('#tab-diagram');
    }
    const before = await shape();
    const outputId = await blockWithText(page, 'Output"Scriviunnumerointero"');
    const ifId = await page.evaluate(() => document.querySelector('#diagram .dg-block--if.is-selectable').getAttribute('data-id'));
    await press(`#diagram [data-id="${outputId}"] text`);
    checks.ok(await page.isVisible('#move-block'), 'nella barra della selezione c\'è Sposta');
    const bar = await page.locator('#selection-bar').boundingBox();
    checks.ok(bar.x >= 0 && bar.x + bar.width <= viewport.width + 1, 'con quattro pulsanti la barra sta nello schermo');
    await press('#move-block');
    checks.ok((await page.textContent('#notices')).includes('scegliere il + dove metterlo'), 'l\'avviso dice di scegliere il +');
    checks.ok(!(await page.isVisible('#selection-bar')), 'durante lo spostamento la barra della selezione sparisce');
    checks.ok((await page.locator('#diagram .dg-slot.is-disabled').count()) === 2, 'i due + attorno al blocco sono spenti');
    checks.ok(await page.evaluate((id) => document.querySelector(`#diagram [data-id="${id}"]`).classList.contains('is-moving'), outputId), 'il blocco è tratteggiato');
    await press(`#diagram [data-owner="${ifId}"][data-list="then"][data-index="0"]`);
    const moved = await shape();
    checks.ok(moved === 'declare input if(n mod 2 == 0)[output("Scrivi un numero intero"),output(n & " è pari")]', `spostato nel ramo Vero: ${moved}`);
    checks.ok(!(await page.textContent('#notices')).includes('scegliere il +'), 'a spostamento fatto l\'avviso sparisce');
    checks.ok(await page.isVisible('#modified'), 'dopo lo spostamento: "Non salvato"');
    await press(viewport.width >= 1024 ? '#undo' : '#undo-sheet');
    checks.ok((await shape()) === before, 'Annulla lo rimette dov\'era');

    // Rinunciare: Non spostare, ed Esc da tastiera.
    if (!(await page.evaluate((id) => document.querySelector(`#diagram [data-id="${id}"]`).classList.contains('is-selected'), outputId))) {
        await press(`#diagram [data-id="${outputId}"] text`);
    }
    await press('#move-block');
    await press('.notice-action:has-text("Non spostare")');
    checks.ok((await page.locator('#diagram .is-moving').count()) === 0 && (await shape()) === before, 'Non spostare rinuncia');
    if (!viewport.phone) {
        await press('#move-block');
        checks.ok(await page.evaluate(() => document.activeElement.classList.contains('dg-slot') && !document.activeElement.classList.contains('is-disabled')),
            'da tastiera il focus va sul primo + possibile');
        await page.keyboard.press('Escape');
        checks.ok((await page.locator('#diagram .is-moving').count()) === 0, 'Esc rinuncia');
    }
}

/* Passo-passo sull'esempio Pari o dispari (FR-RUN-05, DEC-073). */
async function checkStep(page, checks, viewport) {
    const press = (selector) => viewport.phone ? page.tap(selector) : page.click(selector);
    const phoneBar = viewport.width < 448; // 28rem: sotto, Passo sta sul foglio durante l'esecuzione
    const highlighted = () => page.evaluate(() => {
        const node = document.querySelector('#diagram .is-running');
        return node ? node.textContent.replace(/\s+/g, ' ').trim() : null;
    });
    const status = async () => (await page.textContent('#status')).trim();
    // Il passo avviene al turno successivo dello scheduler: si aspetta che si fermi di nuovo.
    const settled = () => page.waitForFunction(() => ['Passo a passo', 'In attesa di un valore', 'Terminato', 'Fermato']
        .includes(document.getElementById('status').textContent.trim()));
    await chooseExample(page, 'pari-dispari');
    await leaveUnsaved(page, press);
    if (phoneBar) {
        checks.ok(!(await page.isVisible('#step')), 'sul telefono Passo non è nella barra');
        await page.click('#menu-button');
        await page.click('#cmd-step');
    } else {
        await press('#step');
    }
    await settled();
    checks.ok((await status()) === 'Passo a passo', `passo-passo avviato: ${await status()}`);
    checks.ok((await highlighted()) === 'Integer n', `fermo prima del primo blocco: ${await highlighted()}`);
    if (viewport.phone) {
        checks.ok(await page.isVisible('#panel-diagram'), 'sul telefono resta in primo piano il diagramma');
    }
    const step = phoneBar ? '#step-sheet' : '#step';
    if (phoneBar) {
        checks.ok(await page.isVisible('#step-sheet') && !(await page.isVisible('#undo-sheet')), 'sul foglio Passo prende il posto di Annulla e Ripeti');
        const button = await page.locator('#step-sheet').boundingBox();
        const zoom = await page.locator('.zoom').boundingBox();
        checks.ok(button.height >= 44 && button.x + button.width <= zoom.x, 'Passo alto 44 px, a sinistra dello zoom');
    }
    await press(step);
    await settled();
    checks.ok((await highlighted()) === 'Output "Scrivi un numero intero"', `un passo: ${await highlighted()}`);
    checks.ok(!(await page.textContent('#console-log')).includes('Scrivi'), 'il blocco evidenziato non è ancora eseguito');
    await press(step);
    await settled();
    checks.ok((await page.textContent('#console-log')).includes('Scrivi un numero intero'), 'il passo ha eseguito l\'output');
    if (viewport.phone) {
        checks.ok((await page.getAttribute('#tab-console', 'data-badge')) === 'new', 'output non visto: segno sulla scheda Console');
    }
    checks.ok((await highlighted()) === 'Input n', `poi l'input: ${await highlighted()}`);
    await press(step);
    await settled();
    const field = page.locator('.console-field');
    await field.waitFor();
    checks.ok((await status()) === 'In attesa di un valore', 'l\'input chiede il valore');
    await field.fill('7');
    await field.press('Enter');
    await page.waitForFunction(() => document.getElementById('status').textContent.trim() === 'Passo a passo');
    if (viewport.phone) {
        checks.ok(await page.isVisible('#panel-diagram'), 'dopo il valore si torna al diagramma');
    }
    checks.ok((await highlighted() || '').startsWith('if'), `poi l'if: ${await highlighted()}`);
    // Pannello delle variabili (FR-RUN-06): n vale 7, appena cambiata.
    const variableValue = (where) => page.evaluate((selector) => {
        const row = document.querySelector(`${selector} [data-name="n"]`);
        return row ? { value: row.querySelector('.variable-value').textContent, changed: row.classList.contains('is-changed') } : null;
    }, where);
    if (viewport.width >= 896) {
        checks.ok(await page.isVisible('#variables-pane'), 'sul computer il pannello delle variabili è in cima alla console');
        const n = await variableValue('#variables-pane');
        checks.ok(n && n.value === '7' && n.changed, `n = 7, segnata come cambiata: ${JSON.stringify(n)}`);
    } else {
        checks.ok(await page.isVisible('#variables-strip'), 'sul telefono la striscia delle variabili è sotto il diagramma');
        checks.ok((await page.textContent('#variables-strip-summary')).includes('n = 7'), `riassunto: ${await page.textContent('#variables-strip-summary')}`);
        await press('#variables-strip-toggle');
        const n = await variableValue('#variables-strip');
        checks.ok(await page.isVisible('#variables-strip-body') && n && n.value === '7' && n.changed, `striscia aperta: n = 7, cambiata (${JSON.stringify(n)})`);
        await press('#variables-strip-toggle');
        checks.ok(!(await page.isVisible('#variables-strip-body')), 'la striscia si richiude');
    }
    await press(step);
    await settled();
    checks.ok((await highlighted()) === 'Output n & " è dispari"', `il ramo Falso: ${await highlighted()}`);
    await press(step);
    await settled();
    await page.waitForSelector('.console-note--done', { state: 'attached' });
    checks.ok((await page.textContent('#console-log')).includes('7 è dispari') && (await status()) === 'Terminato', 'ultimo passo: fine del programma');
    checks.ok(!(await page.isDisabled(step)), 'a programma finito Passo ricomincia');
    if (viewport.width < 896) {
        checks.ok(!(await page.isVisible('#variables-strip')), 'a programma finito la striscia lascia il posto alla barra della selezione');
    }
    checks.ok((await page.getAttribute('#variables-pane', 'hidden')) === null, 'i valori finali restano nel pannello della console');

    // Riprendi torna all'esecuzione continua; Ferma.
    if (!viewport.phone) {
        await page.focus('#sheet');
        await page.keyboard.press('F10');
        await settled();
        checks.ok((await status()) === 'Passo a passo' && (await highlighted()) === 'Integer n', 'F10 avvia il passo-passo');
        await page.keyboard.press('F10');
        await settled();
        checks.ok((await highlighted()) === 'Output "Scrivi un numero intero"', 'F10 fa un passo');
        checks.ok((await page.textContent('#pause-label')).trim() === 'Riprendi', 'in pausa: Riprendi');
        await page.click('#pause');
        await page.locator('.console-field').waitFor();
        checks.ok((await status()) === 'In attesa di un valore', 'Riprendi continua senza fermarsi fino all\'input');
        await page.click('#stop');
        checks.ok((await status()) === 'Fermato', 'Ferma');
        // Una modifica cambia il programma: le variabili di prima spariscono.
        checks.ok(await page.isVisible('#variables-pane'), 'dopo Ferma le variabili restano');
        // Una cancellazione, che non passa dai campi della finestra di modifica.
        await page.focus('#diagram .is-selectable');
        await page.keyboard.press('Delete');
        checks.ok(!(await page.isVisible('#variables-pane')), 'dopo una modifica il pannello delle variabili sparisce');
    }
    checks.ok(await noHorizontalScroll(page), 'nessuno scorrimento orizzontale durante il passo-passo');
}

async function checkViewport(browser, engineName, viewport, screenshotsDir) {
    const checks = new Checks(`${engineName} ${viewport.name}`);
    const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        hasTouch: viewport.phone,
        isMobile: viewport.phone && engineName === 'chromium',
        acceptDownloads: true
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    try {
        await page.goto(URL);
        await page.waitForSelector('#diagram .dg-block--terminal');
        checks.ok(await noHorizontalScroll(page), 'nessuno scorrimento orizzontale all\'apertura');
        checks.ok(await page.isVisible('.tabs') === viewport.phone, viewport.phone ? 'schede visibili' : 'schede nascoste');
        if (screenshotsDir) {
            await page.screenshot({ path: path.join(screenshotsDir, `${engineName}-${viewport.name}-vuoto.png`) });
        }

        await chooseExample(page);
        checks.ok(await noHorizontalScroll(page), 'nessuno scorrimento orizzontale con l\'esempio');
        await checkDiagram(page, checks, viewport, engineName);
        await runQa04(page, checks, viewport);
        checks.ok(await noHorizontalScroll(page), 'nessuno scorrimento orizzontale dopo l\'esecuzione');
        if (screenshotsDir) {
            await page.screenshot({ path: path.join(screenshotsDir, `${engineName}-${viewport.name}-eseguito.png`) });
        }

        await checkRuntimeReveal(page, checks, viewport);
        await chooseExample(page);
        await checkSave(page, checks);
        await checkBadFile(page, checks);
        await checkRestore(page, checks);
        await checkNewFile(page, checks);
        await checkInsert(page, checks, viewport);
        await checkBuildAndRun(page, checks, viewport);
        await checkDelete(page, checks, viewport);
        await checkHistory(page, checks, viewport);
        const shot = screenshotsDir
            ? (name) => page.screenshot({ path: path.join(screenshotsDir, `${engineName}-${viewport.name}-${name}.png`) })
            : null;
        await checkQa11(page, checks, viewport, shot);
        await checkQa12(page, checks, viewport);
        await checkStep(page, checks, viewport);
        await checkStaticAnalysis(page, checks, viewport);
        await checkCallComment(page, checks, viewport);
        await checkFunctions(page, checks, viewport);
        await checkMove(page, checks, viewport);
        if (!viewport.phone) {
            await checkFocusReveal(page, checks);
            await checkMenuKeyboard(page, checks);
            await checkLongRun(page, checks);
        }
        await checkUnsaved(page, checks); // per ultima: chiude la pagina
    } catch (error) {
        checks.ok(false, `verifica interrotta: ${process.env.DEBUG ? error.message : error.message.split('\n')[0]}`);
    } finally {
        checks.ok(pageErrors.length === 0, `errori nella pagina: ${pageErrors.join('; ')}`);
        await context.close();
    }
    return checks;
}

async function main() {
    const options = readOptions(process.argv.slice(2));
    if (options.screenshots) {
        await mkdir(options.screenshots, { recursive: true });
    }
    let failed = false;
    for (const engineName of options.engines) {
        let browser;
        try {
            browser = await ENGINES[engineName].launch();
        } catch (error) {
            console.log(`[${engineName}] NON ESEGUITO — ${error.message.split('\n')[0]}`);
            failed = true;
            continue;
        }
        try {
            for (const viewport of VIEWPORTS) {
                const checks = await checkViewport(browser, engineName, viewport, options.screenshots);
                if (checks.failures.length === 0) {
                    console.log(`[${checks.label}] OK — ${checks.count} verifiche`);
                } else {
                    failed = true;
                    console.log(`[${checks.label}] FALLITO — ${checks.failures.length} su ${checks.count}`);
                    checks.failures.forEach((failure) => console.log(`  ✗ ${failure}`));
                }
            }
        } finally {
            await browser.close();
        }
    }
    process.exitCode = failed ? 1 : 0;
}

main();
