/*
 * OnoFlow — test del formato .fprg (§7, FR-FILE-03…05, QA-05, NFR-PRIV-05).
 *
 * Dipendenze: tests/framework/*, js/core/*, js/examples/examples.js, js/i18n/*.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var OnoFlow = window.OnoFlow;
    var Format = OnoFlow.Format;
    var Model = OnoFlow.Model;
    var SAMPLE = OnoFlow.Examples.byId('somma-massimo-minimo').text;

    // Ora fissa per i test: 20 ottobre 2026, 09:05:03 (ora locale).
    var FIXED_NOW = new Date(2026, 9, 20, 9, 5, 3);
    var FIXED_SAVED = '2026-10-20 09:05:03 ';

    /* Il campione con l'attributo saved sostituito: è ciò che deve produrre l'export. */
    function withSaved(text, saved) {
        return text.replace(/(<attribute name="saved" value=")[^"]*(")/, '$1' + saved + '$2');
    }

    function load(text) {
        var result = Format.importFprg(text);
        if (!result.ok) {
            throw new Error('caricamento fallito: ' + result.error.code + ' ' + JSON.stringify(result.error.params));
        }
        return result;
    }

    function roundTrip(text) {
        var result = load(text);
        return Format.exportFprg(result.program, { format: result.format, now: FIXED_NOW });
    }

    /* Copia del modello senza ID, per confrontare due caricamenti (QA-05: "salvo gli ID"). */
    function withoutIds(value) {
        if (Array.isArray(value)) {
            return value.map(withoutIds);
        }
        if (value && typeof value === 'object') {
            var copy = {};
            Object.keys(value).forEach(function (key) {
                if (key !== 'id') {
                    copy[key] = withoutIds(value[key]);
                }
            });
            return copy;
        }
        return value;
    }

    /* Documento minimo con un corpo di Main dato, per provare le regole di lettura. */
    function documentWithBody(bodyLines, extraRoot) {
        return [
            '<?xml version="1.0"?>',
            '<flowgorithm fileversion="4.2"' + (extraRoot || '') + '>',
            '    <attributes/>',
            '    <function name="Main" type="None" variable="">',
            '        <parameters/>',
            '        <body>'
        ].concat(bodyLines.map(function (line) { return '            ' + line; })).concat([
            '        </body>',
            '    </function>',
            '</flowgorithm>',
            ''
        ]).join('\n');
    }

    function loadError(text) {
        var result = Format.importFprg(text);
        return result.ok ? null : result.error;
    }

    T.suite('Formato › round-trip (QA-05, FR-FILE-03)', function () {
        T.test('il campione si riesporta identico, salvo saved', function (assert) {
            var exported = roundTrip(SAMPLE);
            var expected = withSaved(SAMPLE, FIXED_SAVED);
            var exportedLines = exported.split('\n');
            var expectedLines = expected.split('\n');
            for (var i = 0; i < expectedLines.length; i++) {
                assert.equal(exportedLines[i], expectedLines[i], 'riga ' + (i + 1));
            }
            assert.equal(exported, expected);
        });

        T.test('riaprendo il file esportato si ottiene lo stesso modello, salvo gli ID', function (assert) {
            var first = load(SAMPLE).program;
            var second = load(roundTrip(SAMPLE)).program;
            var firstAttributes = first.attributes.filter(function (a) { return a.name !== 'saved'; });
            var secondAttributes = second.attributes.filter(function (a) { return a.name !== 'saved'; });
            assert.deepEqual(withoutIds(secondAttributes), withoutIds(firstAttributes));
            assert.deepEqual(withoutIds(second.functions), withoutIds(first.functions));
        });

        T.test('il campione si apre senza errori né avvisi (QA-06)', function (assert) {
            var result = load(SAMPLE);
            assert.deepEqual(result.warnings, []);
            assert.deepEqual(Model.collectFieldErrors(result.program), []);
        });

        T.test('a capo CRLF, BOM e a capo finale si conservano (DEC-002)', function (assert) {
            var windows = '\uFEFF' + SAMPLE.replace(/\n/g, '\r\n');
            var result = load(windows);
            assert.deepEqual(result.format, { bom: true, newline: '\r\n', finalNewline: true });
            assert.equal(roundTrip(windows), withSaved(windows, FIXED_SAVED));
        });

        T.test('un file senza a capo finale resta senza', function (assert) {
            var noFinal = SAMPLE.replace(/\n$/, '');
            assert.equal(load(noFinal).format.finalNewline, false);
            assert.equal(roundTrip(noFinal), withSaved(noFinal, FIXED_SAVED));
        });

        T.test('il campione caricato è il programma dell\'Appendice A', function (assert) {
            var main = load(SAMPLE).program.functions[0];
            assert.equal(main.name, 'Main');
            assert.equal(main.body.length, 15);
            assert.deepEqual(main.body.map(function (block) { return block.kind; }), [
                'declare', 'declare', 'declare', 'assign', 'assign', 'do', 'declare', 'for',
                'assign', 'assign', 'assign', 'while', 'output', 'output', 'output'
            ]);
            assert.equal(main.body[5].fields.expression.text, 'risposta == "s"');
            assert.equal(main.body[6].array, true);
            assert.equal(main.body[6].fields.size.text, 'dim');
            assert.equal(main.body[7].fields.end.text, 'dim -1');
            assert.equal(main.body[11].fields.expression.text, 'i<dim');
            assert.equal(main.body[12].fields.expression.text, '"Somma del primo set di numeri: " & risultato');
        });
    });

    T.suite('Formato › scrittura (§7.6)', function () {
        T.test('un programma nuovo: Main vuota, elementi autochiusi, LF finale', function (assert) {
            assert.equal(Format.exportFprg(Model.createEmptyProgram(), { now: FIXED_NOW }), [
                '<?xml version="1.0"?>',
                '<flowgorithm fileversion="4.2">',
                '    <attributes/>',
                '    <function name="Main" type="None" variable="">',
                '        <parameters/>',
                '        <body/>',
                '    </function>',
                '</flowgorithm>',
                ''
            ].join('\n'));
        });

        T.test('saved diventa l\'ora dell\'export, con lo spazio finale', function (assert) {
            assert.equal(Format.formatSavedDate(new Date(2026, 0, 5, 7, 8, 9)), '2026-01-05 07:08:09 ');
            assert.isTrue(roundTrip(SAMPLE).indexOf('value="' + FIXED_SAVED + '"') !== -1);
        });

        T.test('saved non si aggiunge se il file non lo aveva; created ed edited non si generano', function (assert) {
            var program = Model.createEmptyProgram();
            program.attributes.push({ name: 'name', value: 'prova' });
            var text = Format.exportFprg(program, { now: FIXED_NOW });
            assert.equal(text.indexOf('saved'), -1);
            assert.equal(text.indexOf('created'), -1);
            assert.equal(text.indexOf('edited'), -1);
            assert.isTrue(text.indexOf('<attribute name="name" value="prova"/>') !== -1);
        });

        T.test('escape scritti dall\'app (FMT-W-04)', function (assert) {
            assert.equal(Format.escapeAttribute('"a" & b < 3 > 2'), '&quot;a&quot; &amp; b &lt; 3 &gt; 2');
            assert.equal(Format.escapeAttribute('riga\nriga\r\tfine'), 'riga&#10;riga&#13;&#9;fine');
            assert.equal(Format.escapeAttribute('l\'apostrofo resta'), 'l\'apostrofo resta');
        });

        T.test('ogni tipo di blocco si scrive e si rilegge uguale', function (assert) {
            var body = [
                Model.createBlock('declare', { names: 'a, b', type: 'Real', array: false }),
                Model.createBlock('declare', { names: 'v', type: 'Boolean', array: true, size: 'n * 2' }),
                Model.createBlock('assign', { variable: 'v[0]', expression: 'not (a <> b)' }),
                Model.createBlock('input', { variable: 'a' }),
                Model.createBlock('output', { expression: '"x" & a', newline: false }),
                Model.createBlock('if', {
                    expression: 'a > b',
                    then: [],
                    'else': [Model.createBlock('output', { expression: '"no"' })]
                }),
                Model.createBlock('while', { expression: 'false' }),
                Model.createBlock('do', { expression: 'a < 3', body: [Model.createBlock('assign', { variable: 'a', expression: 'a + 1' })] }),
                Model.createBlock('for', { variable: 'i', start: '10', end: '1', direction: 'dec', step: '3' }),
                Model.createBlock('call', { expression: 'Stampa(v, 2)' }),
                Model.createBlock('comment', { text: 'due righe\ne "virgolette"' })
            ];
            var program = Model.createProgram({
                attributes: [{ name: 'name', value: 'tutti i blocchi' }],
                functions: [
                    Model.createFunction({ name: 'Main', body: body }),
                    Model.createFunction({
                        name: 'Stampa', type: 'Integer', variable: 'r',
                        parameters: [{ name: 'w', type: 'Boolean', array: true }, { name: 'k', type: 'Integer', array: false }],
                        body: [Model.createBlock('assign', { variable: 'r', expression: 'k' })]
                    })
                ]
            });
            var text = Format.exportFprg(program, { now: FIXED_NOW });
            var reloaded = load(text);
            assert.deepEqual(withoutIds(reloaded.program), withoutIds(program));
            assert.equal(Format.exportFprg(reloaded.program, { format: reloaded.format, now: FIXED_NOW }), text);

            // Forme attese di alcune righe (FMT-W-02, FMT-W-03).
            [
                '            <declare name="a, b" type="Real" array="False" size=""/>',
                '            <declare name="v" type="Boolean" array="True" size="n * 2"/>',
                '            <output expression="&quot;x&quot; &amp; a" newline="False"/>',
                '                <then/>',
                '            <while expression="false"/>',
                '            <for variable="i" start="10" end="1" direction="dec" step="3"/>',
                '            <comment text="due righe&#10;e &quot;virgolette&quot;"/>',
                '            <parameter name="w" type="Boolean" array="True"/>'
            ].forEach(function (line) {
                assert.isTrue(text.split('\n').indexOf(line) !== -1, 'riga attesa: ' + line.trim());
            });
        });

        T.test('la dimensione di una variabile semplice si scrive vuota', function (assert) {
            var declare = Model.createBlock('declare', { names: 'x', array: true, size: '10' });
            declare.array = false;
            var program = Model.createProgram({ functions: [Model.createFunction({ body: [declare] })] });
            var text = Format.exportFprg(program, { now: FIXED_NOW });
            assert.isTrue(text.indexOf('<declare name="x" type="Integer" array="False" size=""/>') !== -1);
        });
    });

    T.suite('Formato › lettura (§7.5)', function () {
        T.test('un file con espressioni sbagliate si apre e le conserva (FR-FILE-05)', function (assert) {
            var text = documentWithBody([
                '<assign variable="x" expression="2,5"/>',
                '<output expression="a AND b" newline="True"/>'
            ]);
            var result = load(text);
            var errors = Model.collectFieldErrors(result.program);
            assert.equal(errors.length, 2);
            assert.equal(errors[0].params.reason, 'decimalComma');
            assert.equal(roundTrip(text), text);
        });

        T.test('il BOM si toglie prima di leggere (FMT-R-01)', function (assert) {
            var result = load('\uFEFF' + SAMPLE);
            assert.equal(result.format.bom, true);
            assert.equal(result.program.functions[0].name, 'Main');
        });

        T.test('booleani solo True / False (FMT-R-02)', function (assert) {
            var error = loadError(documentWithBody(['<output expression="1" newline="true"/>']));
            assert.deepEqual(error, {
                code: 'ERR_LOAD_INVALID_VALUE', params: { element: 'output', attribute: 'newline', value: 'true' }
            });
        });

        T.test('nell\'if then ed else obbligatori e non ripetuti (FMT-R-03)', function (assert) {
            assert.deepEqual(loadError(documentWithBody(['<if expression="x"><then/></if>'])),
                { code: 'ERR_LOAD_MISSING_ELEMENT', params: { element: 'else', parent: 'if' } });
            assert.deepEqual(loadError(documentWithBody(['<if expression="x"><then/><then/><else/></if>'])),
                { code: 'ERR_LOAD_DUPLICATE_ELEMENT', params: { element: 'then', parent: 'if' } });
        });

        T.test('elemento sconosciuto: errore con il nome (FMT-R-04)', function (assert) {
            assert.deepEqual(loadError(documentWithBody(['<repeat expression="x"/>'])),
                { code: 'ERR_LOAD_UNKNOWN_ELEMENT', params: { element: 'repeat', parent: 'body' } });
            assert.deepEqual(loadError(documentWithBody(['<input variable="x"><extra/></input>'])),
                { code: 'ERR_LOAD_UNKNOWN_ELEMENT', params: { element: 'extra', parent: 'input' } });
            assert.deepEqual(loadError(documentWithBody(['<while expression="x"><repeat/></while>'])),
                { code: 'ERR_LOAD_UNKNOWN_ELEMENT', params: { element: 'repeat', parent: 'while' } });
        });

        T.test('attributo sconosciuto: un avviso per coppia, e si perde al salvataggio (FMT-R-05)', function (assert) {
            var text = documentWithBody([
                '<input variable="a" colore="rosso"/>',
                '<input variable="b" colore="blu"/>',
                '<output expression="a" newline="True" colore="verde"/>'
            ]);
            var result = load(text);
            assert.deepEqual(result.warnings, [
                { code: 'WARN_LOAD_UNKNOWN_ATTRIBUTE', params: { element: 'input', attribute: 'colore' } },
                { code: 'WARN_LOAD_UNKNOWN_ATTRIBUTE', params: { element: 'output', attribute: 'colore' } }
            ]);
            assert.equal(roundTrip(text).indexOf('colore'), -1);
        });

        T.test('versione diversa da 4.x: avviso, si carica lo stesso (FMT-R-06)', function (assert) {
            function versionWarnings(version) {
                return load(SAMPLE.replace('fileversion="4.2"', 'fileversion="' + version + '"')).warnings;
            }
            assert.deepEqual(versionWarnings('4'), []);
            assert.deepEqual(versionWarnings('4.5'), []);
            assert.deepEqual(versionWarnings('3.0'),
                [{ code: 'WARN_LOAD_UNSUPPORTED_VERSION', params: { version: '3.0' } }]);
            assert.deepEqual(load(SAMPLE.replace(' fileversion="4.2"', '')).warnings,
                [{ code: 'WARN_LOAD_UNSUPPORTED_VERSION', params: { version: '' } }]);
        });

        T.test('dimensione su una variabile semplice: ignorata con avviso (FMT-R-07)', function (assert) {
            var result = load(documentWithBody(['<declare name="x" type="Integer" array="False" size="10"/>']));
            assert.deepEqual(result.warnings, [{ code: 'WARN_LOAD_IGNORED_SIZE', params: { names: 'x', size: '10' } }]);
            assert.equal(result.program.functions[0].body[0].fields.size.text, '');
        });

        T.test('testo e commenti XML tra gli elementi sono ignorati (FMT-R-08)', function (assert) {
            var result = load(documentWithBody([
                '<!-- un commento -->',
                'testo sparso',
                '<input variable="a"/>'
            ]));
            assert.equal(result.program.functions[0].body.length, 1);
            assert.deepEqual(result.warnings, []);
        });

        T.test('funzione Main assente: errore (FMT-R-09)', function (assert) {
            var text = SAMPLE.replace('name="Main"', 'name="Principale"');
            assert.deepEqual(loadError(text), { code: 'ERR_LOAD_NO_MAIN', params: {} });
            assert.deepEqual(loadError('<?xml version="1.0"?><flowgorithm fileversion="4.2"><attributes/></flowgorithm>'),
                { code: 'ERR_LOAD_NO_MAIN', params: {} });
        });

        T.test('il caricamento si ferma al primo errore strutturale (FMT-R-10)', function (assert) {
            var error = loadError(documentWithBody([
                '<input/>',
                '<repeat/>'
            ]));
            assert.deepEqual(error, { code: 'ERR_LOAD_MISSING_ATTRIBUTE', params: { element: 'input', attribute: 'variable' } });
        });

        T.test('file che non sono diagrammi', function (assert) {
            assert.equal(loadError('').code, 'ERR_LOAD_INVALID_XML');
            assert.equal(loadError('   \n').code, 'ERR_LOAD_INVALID_XML');
            assert.equal(loadError('ciao, non sono XML').code, 'ERR_LOAD_INVALID_XML');
            assert.equal(loadError('<flowgorithm><function>').code, 'ERR_LOAD_INVALID_XML');
            assert.equal(loadError('\u0000\u0001PNG\u0002').code, 'ERR_LOAD_INVALID_XML');
            assert.deepEqual(loadError('<?xml version="1.0"?><html><body/></html>'),
                { code: 'ERR_LOAD_NOT_FLOWGORITHM', params: { element: 'html' } });
        });

        T.test('attributi e valori mancanti o non validi', function (assert) {
            assert.deepEqual(loadError(documentWithBody(['<assign variable="x"/>'])),
                { code: 'ERR_LOAD_MISSING_ATTRIBUTE', params: { element: 'assign', attribute: 'expression' } });
            assert.deepEqual(loadError(documentWithBody(['<declare name="x" type="Char" array="False" size=""/>'])),
                { code: 'ERR_LOAD_INVALID_VALUE', params: { element: 'declare', attribute: 'type', value: 'Char' } });
            assert.deepEqual(loadError(documentWithBody(['<for variable="i" start="0" end="1" direction="up" step="1"/>'])),
                { code: 'ERR_LOAD_INVALID_VALUE', params: { element: 'for', attribute: 'direction', value: 'up' } });
            assert.deepEqual(loadError(SAMPLE.replace('type="None"', 'type="Void"')),
                { code: 'ERR_LOAD_INVALID_VALUE', params: { element: 'function', attribute: 'type', value: 'Void' } });
            assert.deepEqual(loadError(SAMPLE.replace('<attribute name="about" value=""/>', '<attribute name="about"/>')),
                { code: 'ERR_LOAD_MISSING_ATTRIBUTE', params: { element: 'attribute', attribute: 'value' } });
        });

        T.test('struttura della funzione', function (assert) {
            assert.deepEqual(loadError(SAMPLE.replace('<parameters/>', '')),
                { code: 'ERR_LOAD_MISSING_ELEMENT', params: { element: 'parameters', parent: 'function' } });
            assert.deepEqual(loadError(SAMPLE.replace('<parameters/>', '<parameters/><parameters/>')),
                { code: 'ERR_LOAD_DUPLICATE_ELEMENT', params: { element: 'parameters', parent: 'function' } });
            assert.deepEqual(loadError(SAMPLE.replace('    <attributes>', '    <attributes/><attributes>')),
                { code: 'ERR_LOAD_DUPLICATE_ELEMENT', params: { element: 'attributes', parent: 'flowgorithm' } });
            assert.deepEqual(loadError(SAMPLE.replace('</attributes>', '</attributes><extra/>')),
                { code: 'ERR_LOAD_UNKNOWN_ELEMENT', params: { element: 'extra', parent: 'flowgorithm' } });
        });

        T.test('file troppo grande', function (assert) {
            var huge = SAMPLE + ' '.repeat(Format.MAX_FILE_CHARACTERS);
            assert.deepEqual(loadError(huge), { code: 'ERR_LOAD_FILE_TOO_LARGE', params: { max: 5 } });
        });
    });

    T.suite('Formato › elementi da verificare (§7.4, DEC-004)', function () {
        T.test('call, comment e funzioni si caricano con un avviso per tipo di elemento', function (assert) {
            var text = [
                '<?xml version="1.0"?>',
                '<flowgorithm fileversion="4.2">',
                '    <attributes/>',
                '    <function name="Main" type="None" variable="">',
                '        <parameters/>',
                '        <body>',
                '            <comment text="inizio"/>',
                '            <call expression="Saluta(3)"/>',
                '            <comment text="fine"/>',
                '        </body>',
                '    </function>',
                '    <function name="Saluta" type="Integer" variable="r">',
                '        <parameters>',
                '            <parameter name="n" type="Integer" array="False"/>',
                '        </parameters>',
                '        <body>',
                '            <assign variable="r" expression="n"/>',
                '        </body>',
                '    </function>',
                '</flowgorithm>',
                ''
            ].join('\n');
            var result = load(text);
            assert.deepEqual(result.warnings.map(function (w) { return w.params.element; }),
                ['comment', 'call', 'function', 'parameter']);
            assert.isTrue(result.warnings.every(function (w) { return w.code === 'WARN_LOAD_UNVERIFIED_FORMAT'; }));
            assert.equal(result.program.functions.length, 2);
            assert.equal(result.program.functions[1].parameters[0].name, 'n');
            assert.equal(roundTrip(text), text);
        });

        T.test('i tipi Real e Boolean non generano avvisi', function (assert) {
            var result = load(documentWithBody([
                '<declare name="r" type="Real" array="False" size=""/>',
                '<declare name="b" type="Boolean" array="False" size=""/>'
            ]));
            assert.deepEqual(result.warnings, []);
        });
    });

    T.suite('Formato › privacy degli esempi (NFR-PRIV-05)', function () {
        T.test('authors, created ed edited hanno i valori neutri attesi', function (assert) {
            OnoFlow.Examples.list.forEach(function (example) {
                var attributes = load(example.text).program.attributes;
                attributes.forEach(function (attribute) {
                    if (attribute.name === 'authors') {
                        assert.equal(attribute.value, 'studente', example.id + ' authors');
                    }
                    if (attribute.name === 'created' || attribute.name === 'edited') {
                        // Il contenuto è "utente;PC;..." in Base64 (§7.2): si controllano i valori neutri.
                        assert.equal(atob(attribute.value).split(';').slice(0, 2).join(';'), 'studente;PC-LAB',
                            example.id + ' ' + attribute.name);
                    }
                });
            });
        });
    });

    T.suite('Formato › messaggi (QA-07)', function () {
        T.test('ogni errore e avviso di caricamento ha un messaggio completo', function (assert) {
            var italian = OnoFlow.Localization.createTranslator('it');
            var samples = [
                { code: 'ERR_LOAD_INVALID_XML', params: {} },
                { code: 'ERR_LOAD_NOT_FLOWGORITHM', params: { element: 'html' } },
                { code: 'ERR_LOAD_FILE_TOO_LARGE', params: { max: 5 } },
                { code: 'ERR_LOAD_NO_MAIN', params: {} },
                loadError(documentWithBody(['<repeat/>'])),
                loadError(documentWithBody(['<if expression="x"><then/></if>'])),
                loadError(documentWithBody(['<if expression="x"><then/><then/><else/></if>'])),
                loadError(documentWithBody(['<assign variable="x"/>'])),
                loadError(documentWithBody(['<output expression="1" newline="si"/>']))
            ].concat(load(documentWithBody([
                '<declare name="x" type="Integer" array="False" size="3" colore="blu"/>',
                '<comment text="c"/>'
            ], ' fileversion2="x"').replace('fileversion="4.2"', 'fileversion="9"')).warnings);
            var codes = samples.map(function (sample) { return sample.code; });
            [
                'ERR_LOAD_UNKNOWN_ELEMENT', 'ERR_LOAD_MISSING_ELEMENT', 'ERR_LOAD_DUPLICATE_ELEMENT',
                'ERR_LOAD_MISSING_ATTRIBUTE', 'ERR_LOAD_INVALID_VALUE', 'WARN_LOAD_UNSUPPORTED_VERSION',
                'WARN_LOAD_UNKNOWN_ATTRIBUTE', 'WARN_LOAD_IGNORED_SIZE', 'WARN_LOAD_UNVERIFIED_FORMAT'
            ].forEach(function (code) {
                assert.isTrue(codes.indexOf(code) !== -1, 'campione per ' + code);
            });
            samples.forEach(function (sample) {
                var message = italian.formatError(sample);
                assert.notEqual(message, sample.code, 'messaggio per ' + sample.code);
                assert.equal(message.indexOf('{'), -1, 'segnaposto rimasto in: ' + message);
            });
        });
    });
})();
