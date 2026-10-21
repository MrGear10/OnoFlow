/*
 * OnoFlow — verifica di index.html da file:// in Chromium e Firefox con Playwright (passi 6–8).
 *
 * Dipendenze: playwright (solo in tools/, mai nell'applicazione).
 *
 * Uso, dalla cartella tools/:
 *     node check-ui.mjs                                  Chromium e Firefox
 *     node check-ui.mjs --engines firefox --screenshots /percorso/cartella
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
 *     avviso del browser alla chiusura della pagina (FR-FILE-08, FR-FILE-11).
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
        if (!viewport.phone) {
            await checkMenuKeyboard(page, checks);
            await checkLongRun(page, checks);
        }
        await checkUnsaved(page, checks); // per ultima: chiude la pagina
    } catch (error) {
        checks.ok(false, `verifica interrotta: ${error.message.split('\n')[0]}`);
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
