/*
 * OnoFlow — mini-framework di test: raccolta ed esecuzione dei test.
 *
 * Dipendenze: tests/framework/assert.js (OnoFlowTest.createAssert, AssertionError).
 * Definisce: window.OnoFlowTest.{createRunner, suite, test, run}
 *
 * Non tocca la pagina: produce un oggetto con i risultati, che report.js mostra.
 * Così il runner si può verificare con i suoi stessi test (QA-02).
 *
 * Uso nei file di test:
 *
 *     OnoFlowTest.suite('Nome della suite', function () {
 *         OnoFlowTest.test('descrizione', function (assert) {
 *             assert.equal(1 + 1, 2);
 *         });
 *         // Un test che restituisce una promessa è asincrono, con limite di tempo.
 *         OnoFlowTest.test('asincrono', function (assert) {
 *             return attendi().then(function (v) { assert.equal(v, 3); });
 *         }, { timeout: 500 });
 *     });
 */
(function (global) {
    'use strict';

    var OnoFlowTest = global.OnoFlowTest;
    if (!OnoFlowTest || !OnoFlowTest.createAssert) {
        throw new Error('runner.js richiede assert.js, da caricare prima');
    }

    var DEFAULT_TIMEOUT_MS = 2000;
    // Ogni quanto restituire il controllo al browser durante l'esecuzione,
    // così la pagina resta reattiva anche con molti test.
    var YIELD_EVERY_MS = 50;

    function nowMs() {
        return (global.performance && global.performance.now) ? global.performance.now() : Date.now();
    }

    function yieldToBrowser() {
        return new Promise(function (resolve) {
            setTimeout(resolve, 0);
        });
    }

    function isThenable(value) {
        return value !== null && (typeof value === 'object' || typeof value === 'function') &&
            typeof value.then === 'function';
    }

    /* Il filtro confronta, senza distinguere maiuscole, con "suite › test". */
    function matchesFilter(filter, suiteName, testName) {
        if (!filter) {
            return true;
        }
        var fullName = (suiteName + ' › ' + testName).toLowerCase();
        return fullName.indexOf(filter.toLowerCase()) !== -1;
    }

    function withTimeout(promise, timeoutMs) {
        return new Promise(function (resolve, reject) {
            var timer = setTimeout(function () {
                reject(new OnoFlowTest.AssertionError('tempo scaduto: il test non è terminato entro ' +
                    timeoutMs + ' ms'));
            }, timeoutMs);
            promise.then(function (value) {
                clearTimeout(timer);
                resolve(value);
            }, function (error) {
                clearTimeout(timer);
                reject(error);
            });
        });
    }

    /*
     * Crea un runner indipendente. La pagina usa quello predefinito (OnoFlowTest.suite/test/run);
     * i test del framework ne creano altri in memoria per verificarne il comportamento.
     */
    function createRunner() {
        var suites = [];
        var currentSuite = null;

        function suite(name, body) {
            if (currentSuite) {
                throw new Error('suite() annidate non sono supportate: "' + name + '"');
            }
            var newSuite = { name: name, tests: [], setupError: null };
            suites.push(newSuite);
            currentSuite = newSuite;
            try {
                body();
            } catch (error) {
                // Un errore mentre si definiscono i test va mostrato, non perso.
                newSuite.setupError = error;
            } finally {
                currentSuite = null;
            }
        }

        function test(name, body, options) {
            if (!currentSuite) {
                throw new Error('test() va chiamato dentro suite(): "' + name + '"');
            }
            var timeoutMs = (options && options.timeout) || DEFAULT_TIMEOUT_MS;
            currentSuite.tests.push({ name: name, body: body, timeoutMs: timeoutMs });
        }

        /* Esegue un singolo test e restituisce sempre una promessa del suo esito. */
        function runOne(suiteName, testCase) {
            var assert = OnoFlowTest.createAssert();
            var startedAt = nowMs();

            function finish(error) {
                if (!error && assert.count === 0) {
                    error = new OnoFlowTest.AssertionError(
                        'il test non ha eseguito nessuna asserzione: non potrebbe mai fallire');
                }
                return {
                    suite: suiteName,
                    name: testCase.name,
                    status: error ? 'failed' : 'passed',
                    error: error || null,
                    durationMs: nowMs() - startedAt
                };
            }

            var returned;
            try {
                returned = testCase.body(assert);
            } catch (error) {
                return Promise.resolve(finish(error));
            }
            if (!isThenable(returned)) {
                return Promise.resolve(finish(null));
            }
            return withTimeout(Promise.resolve(returned), testCase.timeoutMs).then(function () {
                return finish(null);
            }, function (error) {
                // Una promessa rifiutata senza motivo produce comunque un errore leggibile.
                return finish(error === undefined ? new Error('promessa rifiutata senza motivo') : error);
            });
        }

        /*
         * Esegue tutti i test in ordine, uno alla volta.
         * options.filter: testo da cercare in "suite › test"; gli altri test risultano saltati.
         * options.onResult: funzione chiamata dopo ogni test (per aggiornare la pagina).
         */
        async function run(options) {
            options = options || {};
            var results = {
                tests: [],
                suiteErrors: [],
                passed: 0,
                failed: 0,
                skipped: 0,
                durationMs: 0
            };
            var startedAt = nowMs();
            var lastYieldAt = startedAt;

            for (var s = 0; s < suites.length; s++) {
                var currentSuiteToRun = suites[s];
                if (currentSuiteToRun.setupError) {
                    results.suiteErrors.push({ suite: currentSuiteToRun.name, error: currentSuiteToRun.setupError });
                }
                for (var t = 0; t < currentSuiteToRun.tests.length; t++) {
                    var testCase = currentSuiteToRun.tests[t];
                    var result;
                    if (matchesFilter(options.filter, currentSuiteToRun.name, testCase.name)) {
                        result = await runOne(currentSuiteToRun.name, testCase);
                    } else {
                        result = {
                            suite: currentSuiteToRun.name, name: testCase.name,
                            status: 'skipped', error: null, durationMs: 0
                        };
                    }
                    results.tests.push(result);
                    results[result.status]++;
                    if (options.onResult) {
                        options.onResult(result);
                    }
                    if (nowMs() - lastYieldAt > YIELD_EVERY_MS) {
                        await yieldToBrowser();
                        lastYieldAt = nowMs();
                    }
                }
            }
            results.durationMs = nowMs() - startedAt;
            return results;
        }

        return {
            suite: suite,
            test: test,
            run: run,
            /* Nomi delle suite registrate, utile per i controlli della pagina. */
            suiteNames: function () {
                return suites.map(function (registered) { return registered.name; });
            }
        };
    }

    var defaultRunner = createRunner();

    OnoFlowTest.createRunner = createRunner;
    OnoFlowTest.matchesFilter = matchesFilter;
    OnoFlowTest.suite = defaultRunner.suite;
    OnoFlowTest.test = defaultRunner.test;
    OnoFlowTest.run = defaultRunner.run;
    OnoFlowTest.suiteNames = defaultRunner.suiteNames;
})(window);
