/*
 * OnoFlow — mini-framework di test: pagina dei risultati.
 *
 * Dipendenze: tests/framework/assert.js (formatValue), tests/framework/runner.js (run, suiteNames).
 * Definisce: window.OnoFlowTest.runPage
 *
 * Mostra i risultati in tests.html. Tutti i testi entrano nella pagina con textContent,
 * mai come HTML. Alla fine imposta sull'elemento <html> l'attributo data-test-status
 * ("passed" o "failed") e pubblica i risultati in OnoFlowTest.lastResults, così una
 * verifica automatica (Playwright) può leggerli senza interpretare la pagina.
 */
(function (global) {
    'use strict';

    var OnoFlowTest = global.OnoFlowTest;
    var document = global.document;

    var STATUS_SYMBOL = { passed: '✓', failed: '✗', skipped: '–' };

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

    function readFilter() {
        try {
            return new URLSearchParams(global.location.search).get('filtro') || '';
        } catch (error) {
            return '';
        }
    }

    function filterLink(filter) {
        return '?filtro=' + encodeURIComponent(filter);
    }

    function describeError(error) {
        if (error instanceof Error || (error && error.name === 'AssertionError')) {
            var prefix = error.name === 'AssertionError' ? '' : error.name + ': ';
            return prefix + error.message;
        }
        return 'lanciato un valore che non è un errore: ' + OnoFlowTest.formatValue(error);
    }

    function stackOf(error) {
        return (error && typeof error.stack === 'string') ? error.stack : '';
    }

    function renderErrorDetails(container, error) {
        container.appendChild(element('p', 'error-message', describeError(error)));
        var stack = stackOf(error);
        if (stack) {
            var details = element('details', 'error-stack');
            details.appendChild(element('summary', null, 'Dove'));
            details.appendChild(element('pre', null, stack));
            container.appendChild(details);
        }
    }

    /* Problemi di caricamento: script mancanti ed errori fuori dai test (L-01, L-02). */
    function renderBootProblems(container, boot) {
        container.textContent = '';
        if (boot.missingScripts.length === 0 && boot.scriptErrors.length === 0) {
            container.hidden = true;
            return;
        }
        container.hidden = false;

        if (boot.missingScripts.length > 0) {
            var missingBox = element('div', 'problem');
            missingBox.appendChild(element('h2', null, 'Script non caricati'));
            var list = element('ul');
            boot.missingScripts.forEach(function (source) {
                list.appendChild(element('li', null, source));
            });
            missingBox.appendChild(list);
            missingBox.appendChild(element('p', null,
                'Controlla che il file esista. Se hai scaricato lo ZIP del progetto, estrailo tutto ' +
                'prima di aprire tests.html: aprendolo dal gestore di archivi viene estratto solo quel file.'));
            container.appendChild(missingBox);
        }

        if (boot.scriptErrors.length > 0) {
            var errorBox = element('div', 'problem');
            errorBox.appendChild(element('h2', null, 'Errori fuori dai test'));
            var errorList = element('ul');
            boot.scriptErrors.forEach(function (entry) {
                errorList.appendChild(element('li', null, entry.message +
                    (entry.source ? ' (' + entry.source + (entry.line ? ':' + entry.line : '') + ')' : '')));
            });
            errorBox.appendChild(errorList);
            errorBox.appendChild(element('p', null,
                'Aprendo la pagina da file://, Firefox può nascondere il dettaglio e scrivere solo ' +
                '"Script error.": apri la console del browser (F12) per vedere file e riga.'));
            container.appendChild(errorBox);
        }
    }

    function renderSummary(container, results, boot, filter) {
        container.textContent = '';
        var hasProblems = results.failed > 0 || results.suiteErrors.length > 0 ||
            boot.missingScripts.length > 0 || boot.scriptErrors.length > 0;
        var ran = results.passed + results.failed;
        container.className = 'summary ' + (hasProblems ? 'is-failed' : (ran === 0 ? 'is-empty' : 'is-passed'));

        var headline;
        if (hasProblems) {
            headline = results.failed + (results.failed === 1 ? ' test fallito' : ' test falliti');
            if (results.suiteErrors.length > 0 || boot.missingScripts.length > 0 || boot.scriptErrors.length > 0) {
                headline += ', con errori di caricamento';
            }
        } else if (ran === 0) {
            headline = 'Nessun test eseguito';
        } else {
            headline = 'Tutti i test superati';
        }
        container.appendChild(element('strong', null, headline));
        container.appendChild(element('span', 'counts',
            results.passed + ' superati · ' + results.failed + ' falliti · ' + results.skipped + ' saltati · ' +
            Math.round(results.durationMs) + ' ms'));
        if (filter) {
            var filterNote = element('span', 'filter-note', 'Filtro: "' + filter + '" — ');
            var allLink = element('a', null, 'mostra tutti');
            allLink.href = '?';
            filterNote.appendChild(allLink);
            container.appendChild(filterNote);
        }
        return hasProblems;
    }

    function renderSuites(container, results) {
        container.textContent = '';
        var bySuite = [];
        var indexByName = {};
        results.tests.forEach(function (result) {
            if (!(result.suite in indexByName)) {
                indexByName[result.suite] = bySuite.length;
                bySuite.push({ name: result.suite, tests: [], setupError: null });
            }
            bySuite[indexByName[result.suite]].tests.push(result);
        });
        results.suiteErrors.forEach(function (entry) {
            if (!(entry.suite in indexByName)) {
                indexByName[entry.suite] = bySuite.length;
                bySuite.push({ name: entry.suite, tests: [], setupError: null });
            }
            bySuite[indexByName[entry.suite]].setupError = entry.error;
        });

        bySuite.forEach(function (suite) {
            var failed = suite.tests.filter(function (r) { return r.status === 'failed'; }).length;
            var passed = suite.tests.filter(function (r) { return r.status === 'passed'; }).length;
            var skipped = suite.tests.length - failed - passed;
            if (skipped === suite.tests.length && !suite.setupError) {
                return; // Suite esclusa dal filtro: non serve mostrarla.
            }
            var hasFailure = failed > 0 || suite.setupError;

            var details = element('details', 'suite' + (hasFailure ? ' is-failed' : ''));
            details.open = Boolean(hasFailure);
            var summary = element('summary');
            summary.appendChild(element('span', 'suite-status', hasFailure ? STATUS_SYMBOL.failed : STATUS_SYMBOL.passed));
            summary.appendChild(element('span', 'suite-name', suite.name));
            summary.appendChild(element('span', 'suite-counts', passed + '/' + (passed + failed)));
            var only = element('a', 'suite-only', 'solo questa');
            only.href = filterLink(suite.name);
            summary.appendChild(only);
            details.appendChild(summary);

            if (suite.setupError) {
                var setup = element('div', 'test is-failed');
                setup.appendChild(element('p', 'test-name', 'Errore mentre si definiscono i test della suite'));
                renderErrorDetails(setup, suite.setupError);
                details.appendChild(setup);
            }

            var list = element('ol', 'tests');
            suite.tests.forEach(function (result) {
                if (result.status === 'skipped') {
                    return;
                }
                var item = element('li', 'test is-' + result.status);
                var line = element('p', 'test-name');
                line.appendChild(element('span', 'test-status', STATUS_SYMBOL[result.status]));
                var link = element('a', null, result.name);
                link.href = filterLink(result.suite + ' › ' + result.name);
                line.appendChild(link);
                line.appendChild(element('span', 'test-duration', Math.round(result.durationMs) + ' ms'));
                item.appendChild(line);
                if (result.error) {
                    renderErrorDetails(item, result.error);
                }
                list.appendChild(item);
            });
            details.appendChild(list);
            container.appendChild(details);
        });
    }

    /*
     * Esegue i test registrati e mostra i risultati.
     * page: { summary, problems, suites, filterInput } elementi della pagina.
     * boot: { missingScripts, scriptErrors, onChange } raccolti da tests.html.
     */
    async function runPage(page, boot) {
        var filter = readFilter();
        if (page.filterInput) {
            page.filterInput.value = filter;
        }
        renderBootProblems(page.problems, boot);

        var done = 0;
        page.summary.className = 'summary is-running';
        page.summary.textContent = 'Esecuzione dei test…';

        var results = await OnoFlowTest.run({
            filter: filter,
            onResult: function () {
                done++;
                if (done % 25 === 0) {
                    page.summary.textContent = 'Esecuzione dei test… ' + done;
                }
            }
        });

        function refresh() {
            renderBootProblems(page.problems, boot);
            var hasProblems = renderSummary(page.summary, results, boot, filter);
            document.title = (hasProblems ? '✗ ' : '✓ ') + 'Test di OnoFlow';
            document.documentElement.setAttribute('data-test-status', hasProblems ? 'failed' : 'passed');
        }

        renderSuites(page.suites, results);
        refresh();
        // Errori che arrivano dopo la fine (es. una promessa dimenticata) aggiornano la pagina.
        boot.onChange = refresh;

        OnoFlowTest.lastResults = results;
        return results;
    }

    OnoFlowTest.runPage = runPage;
})(window);
