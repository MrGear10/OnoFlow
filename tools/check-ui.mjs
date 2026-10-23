/*
 * OnoFlow — verifica di index.html da file:// in Chromium e Firefox con Playwright (passi 6–11).
 *
 * Dipendenze: playwright (solo in tools/, mai nell'applicazione).
 *
 * Uso, dalla cartella tools/:
 *     node check-ui.mjs                                  Chromium e Firefox
 *     node check-ui.mjs --engines firefox --screenshots /percorso/cartella
 *     DEBUG=1 node check-ui.mjs                          messaggio completo delle verifiche interrotte
 *
 * Percorsi verificati, su computer (1440 × 900) e telefono (360 × 640, 375 × 667, QA-14):
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
 *     rimette il blocco con lo stesso ID, barra della selezione dentro lo schermo (FR-EDIT-04).
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

async function chooseExample(page) {
    await page.click('#menu-button');
    await page.click('[data-example="somma-massimo-minimo"]');
}

async function runQa04(page, checks, viewport) {
    await page.click('#run');
    if (viewport.phone) {
        checks.ok(await page.isVisible('#panel-console') && !(await page.isVisible('#panel-diagram')),
            'all\'avvio la console è in primo piano e il diagramma è nascosto');
    }
    for (const value of QA04_INPUTS) {
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
    if (viewport.phone) {
        const zoom = await page.locator('.zoom').boundingBox();
        checks.ok(bar.y + bar.height <= zoom.y, 'sul telefono la barra sta sopra i comandi dello zoom');
    }
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
        if (!viewport.phone) {
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
