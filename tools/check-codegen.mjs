/*
 * OnoFlow — verifica del codice generato (fase 3, criterio di uscita §13, DEC-093).
 *
 * Per ogni esempio del menu e per ogni programma di prova qui sotto, con input noti:
 *   1. esegue il diagramma con l'interprete di OnoFlow e raccoglie l'output;
 *   2. genera il codice, lo esegue davvero (python3; g++ per il C++) con gli stessi input;
 *   3. confronta i due output, riga per riga.
 * Gli input non compaiono nell'output: nella console di OnoFlow si vedono, nel terminale no.
 *
 * Dipendenze: Node.js, Playwright (Chromium: l'importazione dei file usa il DOMParser del
 * browser), python3 e g++ nel PATH. Solo per lo sviluppo, come il resto di tools/.
 *
 * Uso, dalla cartella tools/:
 *     node check-codegen.mjs                  Python e C++
 *     node check-codegen.mjs --lingua python  solo un linguaggio
 *     node check-codegen.mjs --mostra mcd     stampa anche il codice generato di un programma
 */
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPTS = [
    'js/namespace.js', 'js/i18n/localization.js', 'js/i18n/catalog.it.js', 'js/core/number-format.js',
    'js/core/expression-lexer.js', 'js/core/expression-parser.js', 'js/core/model.js', 'js/core/fprg-import.js',
    'js/core/fprg-export.js', 'js/core/values.js', 'js/core/builtins.js', 'js/core/type-check.js',
    'js/core/static-check.js', 'js/core/interpreter.js', 'js/examples/examples.js',
    'js/core/codegen-common.js', 'js/core/codegen-python.js', 'js/core/codegen-cpp.js'
];

/* Gli script dell'app, caricati in una pagina vuota di Chromium. */
async function openOnoFlow(browser) {
    const page = await browser.newPage();
    for (const script of SCRIPTS) {
        const file = path.join(ROOT, script);
        const exists = await readFile(file, 'utf8').then(() => true, () => false);
        if (exists) { // un generatore non ancora scritto si salta
            await page.addScriptTag({ path: file });
        }
    }
    return page;
}

/*
 * Nella pagina: apre il file, controlla che non abbia errori, genera il codice nei linguaggi
 * richiesti e calcola l'output dell'interprete per ogni elenco di input (senza gli input).
 */
function prepareInPage({ text, inputs, languages, title }) {
    const OnoFlow = window.OnoFlow;
    const loaded = OnoFlow.Format.importFprg(text);
    if (!loaded.program) {
        return { error: 'il file non si apre: ' + JSON.stringify(loaded.error) };
    }
    const program = loaded.program;
    const errors = OnoFlow.Model.collectFieldErrors(program).concat(OnoFlow.StaticCheck.check(program));
    if (errors.length) {
        return { error: 'il diagramma ha errori: ' + errors[0].code + ' ' + JSON.stringify(errors[0].params) };
    }
    const code = {};
    for (const language of languages) {
        const generator = language === 'python' ? OnoFlow.CodegenPython : OnoFlow.CodegenCpp;
        if (!generator) {
            code[language] = { missing: true };
            continue;
        }
        try {
            code[language] = { text: generator.generate(program, { title }) };
        } catch (error) {
            code[language] = { error: error.message };
        }
    }
    const outputs = inputs.map((list) => {
        const generator = OnoFlow.Interpreter.execute(program, {});
        let output = '';
        let index = 0;
        let toSend;
        for (let steps = 0; steps < 2000000; steps++) {
            const result = generator.next(toSend);
            toSend = undefined;
            if (result.done) {
                return { status: result.value.status, output };
            }
            const event = result.value;
            if (event.type === 'output') {
                output += event.text + (event.newline ? '\n' : '');
            } else if (event.type === 'input') {
                if (index >= list.length) {
                    return { status: 'waitingInput', output };
                }
                toSend = list[index++];
            }
        }
        return { status: 'limit', output };
    });
    return { code, outputs };
}

/* Input per gli esempi del menu: gli stessi dei test (tests/examples.test.js, QA-04). */
const EXAMPLE_INPUTS = {
    'somma-massimo-minimo': [['5', 's', '3', 'n', '4', '9']],
    'pari-dispari': [['7'], ['4'], ['-3']],
    'tabellina': [['3']],
    'media': [['3', '4', '5', '6'], ['2', '1', '2'], ['0']],
    'fattoriale': [['5'], ['0']],
    'mcd': [['12', '18'], ['7', '0']],
    'somma-positivi': [['3', '4', '0']]
};

function run(command, args, stdin) {
    const result = spawnSync(command, args, { input: stdin, encoding: 'utf8', timeout: 20000 });
    return { code: result.status, stdout: result.stdout || '', stderr: (result.stderr || '') + (result.error ? String(result.error) : '') };
}

function firstDifference(expected, actual) {
    const a = expected.split('\n');
    const b = actual.split('\n');
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
        if (a[i] !== b[i]) {
            return `riga ${i + 1}: atteso ${JSON.stringify(a[i])}, ottenuto ${JSON.stringify(b[i])}`;
        }
    }
    return '';
}

const LANGUAGES = {
    python: {
        extension: '.py',
        async execute(file, stdin) {
            return run('python3', [file], stdin);
        }
    },
    cpp: {
        extension: '.cpp',
        compiled: new Map(),
        async execute(file, stdin) {
            if (!this.compiled.has(file)) {
                const binary = file.replace(/\.cpp$/, '');
                const compile = run('g++', ['-std=c++17', '-Wall', '-Wextra', '-Werror', '-O1', '-o', binary, file], '');
                this.compiled.set(file, compile.code === 0 ? { binary } : { error: compile.stderr });
            }
            const built = this.compiled.get(file);
            if (built.error) {
                return { code: -1, stdout: '', stderr: 'non compila:\n' + built.error };
            }
            return run(built.binary, [], stdin);
        }
    }
};

async function main() {
    const argv = process.argv.slice(2);
    const only = argv.includes('--lingua') ? argv[argv.indexOf('--lingua') + 1] : null;
    const show = argv.includes('--mostra') ? argv[argv.indexOf('--mostra') + 1] : null;
    const languages = Object.keys(LANGUAGES).filter((language) => !only || only === language);
    const browser = await chromium.launch();
    const work = await mkdtemp(path.join(tmpdir(), 'onoflow-codegen-'));
    let failed = false;
    try {
        const page = await openOnoFlow(browser);
        const { PROGRAMS } = await import('./codegen-programs.mjs');
        const examples = await page.evaluate(() => window.OnoFlow.Examples.list.map((example) => ({ id: example.id, text: example.text })));
        const cases = examples.map((example) => ({ ...example, inputs: EXAMPLE_INPUTS[example.id] || [[]] })).concat(PROGRAMS);
        const prepared = [];
        for (const item of cases) {
            prepared.push({ item, result: await page.evaluate(prepareInPage, { text: item.text, inputs: item.inputs, languages, title: item.id }) });
        }
        for (const language of languages) {
            const settings = LANGUAGES[language];
            const failures = [];
            let count = 0;
            let missing = false;
            for (const { item, result } of prepared) {
                if (result.error) {
                    failures.push(`${item.id}: ${result.error}`);
                    continue;
                }
                const generated = result.code[language];
                if (generated.missing) {
                    missing = true;
                    break;
                }
                if (generated.error) {
                    failures.push(`${item.id}: generazione fallita: ${generated.error}`);
                    continue;
                }
                if (show === item.id) {
                    console.log(`--- ${item.id}${settings.extension} ---\n${generated.text}`);
                }
                const file = path.join(work, item.id.replace(/[^a-z0-9]+/gi, '_') + settings.extension);
                await writeFile(file, generated.text);
                for (const [index, inputs] of item.inputs.entries()) {
                    count++;
                    const expected = result.outputs[index];
                    const actual = await settings.execute(file, inputs.map((line) => line + '\n').join(''));
                    const label = `${item.id} con [${inputs.join(', ')}]`;
                    if (expected.status !== 'done') {
                        failures.push(`${label}: l'interprete finisce con ${expected.status}`);
                    } else if (actual.code !== 0) {
                        failures.push(`${label}: uscita ${actual.code}\n      ${actual.stderr.trim().split('\n').slice(-8).join('\n      ')}`);
                    } else if (actual.stdout !== expected.output) {
                        failures.push(`${label}: output diverso, ${firstDifference(expected.output, actual.stdout)}`);
                    }
                }
            }
            if (missing) {
                console.log(`[${language}] NON ESEGUITO — generatore non ancora scritto`);
            } else if (failures.length) {
                failed = true;
                console.log(`[${language}] FALLITO — ${failures.length} su ${count}`);
                failures.forEach((failure) => console.log(`  ✗ ${failure}`));
            } else {
                console.log(`[${language}] OK — ${count} esecuzioni con lo stesso output di OnoFlow`);
            }
        }
    } finally {
        await browser.close();
        await rm(work, { recursive: true, force: true });
    }
    process.exitCode = failed ? 1 : 0;
}

main();
