/*
 * OnoFlow — esegue tests.html da file:// in Chromium, Firefox e WebKit con Playwright (QA-09).
 *
 * Dipendenze: playwright (solo in tools/, mai nell'applicazione).
 *
 * Uso, dalla cartella tools/:
 *     node run-tests.mjs                          tutti i motori, tutti i test
 *     node run-tests.mjs --query "filtro=Framework"
 *     node run-tests.mjs --engines firefox,chromium --screenshots /percorso/cartella
 *
 * Esce con codice 1 se un motore riporta test falliti o non riesce a completare la pagina.
 */
import { chromium, firefox, webkit } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ENGINES = { chromium, firefox, webkit };
const PAGE_TIMEOUT_MS = 60000;

function readOptions(argv) {
    const options = { engines: Object.keys(ENGINES), query: '', screenshots: '' };
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--engines') {
            options.engines = argv[++i].split(',');
        } else if (argv[i] === '--query') {
            options.query = argv[++i];
        } else if (argv[i] === '--screenshots') {
            options.screenshots = argv[++i];
        }
    }
    return options;
}

async function runInEngine(engineName, url, screenshotsDir) {
    const browser = await ENGINES[engineName].launch();
    try {
        const page = await browser.newPage();
        const consoleErrors = [];
        page.on('pageerror', (error) => consoleErrors.push(error.message));
        await page.goto(url);
        await page.waitForSelector('html[data-test-status]', { timeout: PAGE_TIMEOUT_MS });
        const report = await page.evaluate(() => {
            const results = window.OnoFlowTest && window.OnoFlowTest.lastResults;
            const boot = window.OnoFlowTestBoot;
            return {
                status: document.documentElement.getAttribute('data-test-status'),
                summary: document.getElementById('summary').textContent,
                passed: results ? results.passed : 0,
                failed: results ? results.failed : 0,
                skipped: results ? results.skipped : 0,
                failures: results ? results.tests.filter((t) => t.status === 'failed')
                    .map((t) => `${t.suite} › ${t.name}: ${t.error && t.error.message}`) : [],
                suiteErrors: results ? results.suiteErrors.map((e) => `${e.suite}: ${e.error && e.error.message}`) : [],
                missingScripts: boot ? boot.missingScripts : [],
                scriptErrors: boot ? boot.scriptErrors.map((e) => e.message) : []
            };
        });
        if (screenshotsDir) {
            await mkdir(screenshotsDir, { recursive: true });
            await page.screenshot({ path: path.join(screenshotsDir, `tests-${engineName}.png`), fullPage: true });
        }
        report.consoleErrors = consoleErrors;
        return report;
    } finally {
        await browser.close();
    }
}

const options = readOptions(process.argv.slice(2));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const url = pathToFileURL(path.join(root, 'tests.html')).href + (options.query ? '?' + options.query : '');

let anyFailure = false;
for (const engineName of options.engines) {
    try {
        const report = await runInEngine(engineName, url, options.screenshots);
        const ok = report.status === 'passed';
        anyFailure = anyFailure || !ok;
        console.log(`\n[${engineName}] ${ok ? 'OK' : 'FALLITO'} — ${report.passed} superati, ${report.failed} falliti, ${report.skipped} saltati`);
        for (const line of [...report.failures, ...report.suiteErrors]) {
            console.log(`  ✗ ${line}`);
        }
        for (const source of report.missingScripts) {
            console.log(`  script non caricato: ${source}`);
        }
        for (const message of [...report.scriptErrors, ...report.consoleErrors]) {
            console.log(`  errore: ${message}`);
        }
    } catch (error) {
        anyFailure = true;
        console.log(`\n[${engineName}] NON ESEGUITO — ${error.message.split('\n')[0]}`);
    }
}
process.exit(anyFailure ? 1 : 0);
