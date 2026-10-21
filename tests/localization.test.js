/*
 * OnoFlow — test della localizzazione (NFR-I18N-01…06, §8.2, QA-07).
 *
 * Dipendenze: tests/framework/*, js/i18n/localization.js, js/i18n/catalog.*.js,
 * js/core/number-format.js (per i messaggi degli errori di input).
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var Localization = window.OnoFlow.Localization;
    var NumberFormat = window.OnoFlow.NumberFormat;

    /* Cataloghi finti, per provare le regole senza toccare quelli veri. */
    function fakeCatalogs() {
        return {
            it: {
                name: 'Italiano',
                number: { decimalSeparator: ',', inputDecimalSeparators: [',', '.'] },
                messages: {
                    'saluto': 'Ciao {nome}!',
                    'solo.italiano': 'Solo in italiano',
                    'ERR_X': 'Generico {a}',
                    'ERR_X.r1': 'Motivo r1',
                    'ERR_X.r1.Integer': 'Motivo r1 per Integer'
                }
            },
            en: {
                name: 'English',
                number: { decimalSeparator: '.', inputDecimalSeparators: ['.'] },
                messages: {
                    'saluto': 'Hello {nome}!',
                    'ERR_X': 'Generic {a}',
                    'ERR_X.r1': 'Reason r1'
                }
            }
        };
    }

    T.suite('Localization › t()', function () {
        T.test('sostituisce i segnaposto', function (assert) {
            var translator = Localization.createTranslator('it', fakeCatalogs());
            assert.equal(translator.t('saluto', { nome: 'Ada' }), 'Ciao Ada!');
        });

        T.test('i parametri si inseriscono come testo', function (assert) {
            var translator = Localization.createTranslator('it', fakeCatalogs());
            assert.equal(translator.t('saluto', { nome: '<b>x</b>' }), 'Ciao <b>x</b>!');
            assert.equal(translator.t('saluto', { nome: 0 }), 'Ciao 0!');
        });

        T.test('un parametro mancante lascia il segnaposto visibile', function (assert) {
            var translator = Localization.createTranslator('it', fakeCatalogs());
            assert.equal(translator.t('saluto'), 'Ciao {nome}!');
            assert.equal(translator.t('saluto', { altro: 1 }), 'Ciao {nome}!');
        });

        T.test('chiave assente nella lingua attiva → italiano', function (assert) {
            var translator = Localization.createTranslator('en', fakeCatalogs());
            assert.equal(translator.t('saluto', { nome: 'Ada' }), 'Hello Ada!');
            assert.equal(translator.t('solo.italiano'), 'Solo in italiano');
        });

        T.test('chiave assente ovunque → la chiave stessa', function (assert) {
            var translator = Localization.createTranslator('en', fakeCatalogs());
            assert.equal(translator.t('non.esiste'), 'non.esiste');
        });

        T.test('lingua senza catalogo → italiano', function (assert) {
            var translator = Localization.createTranslator('de', fakeCatalogs());
            assert.equal(translator.language, 'it');
            assert.equal(translator.t('saluto', { nome: 'Ada' }), 'Ciao Ada!');
        });

        T.test('il formato numerico viene dal catalogo della lingua', function (assert) {
            assert.equal(Localization.createTranslator('it', fakeCatalogs()).numberFormat().decimalSeparator, ',');
            assert.equal(Localization.createTranslator('en', fakeCatalogs()).numberFormat().decimalSeparator, '.');
        });
    });

    T.suite('Localization › testo degli errori (§8.2)', function () {
        T.test('cerca CODICE.reason.type, poi CODICE.reason, poi CODICE', function (assert) {
            var translator = Localization.createTranslator('it', fakeCatalogs());
            assert.equal(translator.formatError({ code: 'ERR_X', params: { reason: 'r1', type: 'Integer' } }),
                'Motivo r1 per Integer');
            assert.equal(translator.formatError({ code: 'ERR_X', params: { reason: 'r1', type: 'Real' } }),
                'Motivo r1');
            assert.equal(translator.formatError({ code: 'ERR_X', params: { reason: 'r2', a: 5 } }),
                'Generico 5');
            assert.equal(translator.formatError({ code: 'ERR_X', params: { a: 5 } }), 'Generico 5');
        });

        T.test('il tipo da solo non sceglie una chiave', function (assert) {
            var translator = Localization.createTranslator('it', fakeCatalogs());
            assert.deepEqual(translator.errorKeys({ code: 'ERR_X', params: { type: 'Integer' } }), ['ERR_X']);
        });

        T.test('la chiave più specifica vince anche se è solo in italiano', function (assert) {
            var translator = Localization.createTranslator('en', fakeCatalogs());
            assert.equal(translator.formatError({ code: 'ERR_X', params: { reason: 'r1', type: 'Integer' } }),
                'Motivo r1 per Integer');
            assert.equal(translator.formatError({ code: 'ERR_X', params: { reason: 'r1', type: 'Real' } }),
                'Reason r1');
        });

        T.test('codice sconosciuto → il codice stesso', function (assert) {
            var translator = Localization.createTranslator('it', fakeCatalogs());
            assert.equal(translator.formatError({ code: 'ERR_NUOVO', params: {} }), 'ERR_NUOVO');
            assert.equal(translator.formatError({ code: 'ERR_NUOVO' }), 'ERR_NUOVO');
        });
    });

    T.suite('Localization › scelta della lingua (NFR-I18N-05)', function () {
        var available = ['it', 'en'];

        T.test('prima ?lang= nell\'indirizzo', function (assert) {
            assert.equal(Localization.chooseLanguage('?lang=en', ['it-IT'], available), 'en');
            assert.equal(Localization.chooseLanguage('?x=1&lang=EN-gb', ['it-IT'], available), 'en');
        });

        T.test('?lang= senza catalogo si ignora', function (assert) {
            assert.equal(Localization.chooseLanguage('?lang=de', ['en-US'], available), 'en');
        });

        T.test('poi la prima lingua del browser con un catalogo', function (assert) {
            assert.equal(Localization.chooseLanguage('', ['de-DE', 'en-US', 'it'], available), 'en');
            assert.equal(Localization.chooseLanguage('', ['it-CH'], available), 'it');
        });

        T.test('infine l\'italiano', function (assert) {
            assert.equal(Localization.chooseLanguage('', ['de', 'fr'], available), 'it');
            assert.equal(Localization.chooseLanguage('', [], available), 'it');
            assert.equal(Localization.chooseLanguage(undefined, undefined, available), 'it');
        });

        T.test('init imposta la lingua predefinita senza memorizzarla', function (assert) {
            assert.equal(Localization.init('?lang=it', ['en']), 'it');
            assert.equal(Localization.language(), 'it');
            assert.equal(Localization.numberFormat().decimalSeparator, ',');
        });
    });

    T.suite('Localization › controllo dei cataloghi (NFR-I18N-06)', function () {
        var reference = fakeCatalogs().it;

        T.test('ogni catalogo ha le chiavi e i segnaposto dell\'italiano', function (assert) {
            var italian = Localization.catalogOf('it');
            assert.isTrue(italian !== null, 'il catalogo italiano è registrato');
            Localization.availableLanguages().forEach(function (language) {
                assert.deepEqual(Localization.checkCatalog(italian, Localization.catalogOf(language)), [],
                    'catalogo ' + language);
            });
        });

        T.test('i messaggi italiani sono impersonali, senza "tu" (DEC-050)', function (assert) {
            // Solo forme che non possono essere una terza persona: "controlla" o "indica"
            // potrebbero esserlo, ma non con il pronome attaccato
            // ("assegnale"); "usa" va bene solo dopo "si".
            var secondPerson = /\b(tu|ti|tuo|tua|tuoi|tue|hai|puoi|devi|vuoi|(?:scrivi|riscrivi|aggiungi|togli|correggi|inserisci|scegli|premi|apri|metti|dividi)(?:lo|la|li|le|ne|gli)?|(?:usa|assegna|segnala|cancella|controlla|indica)(?:lo|la|li|le|ne|gli))\b/i;
            function hasSecondPerson(text) {
                var usa = /\b[Uu]sa\b/g; // non "USA", gli Stati Uniti
                var match;
                while ((match = usa.exec(text)) !== null) {
                    if (!/\bsi $/i.test(text.slice(0, match.index))) return true;
                }
                return secondPerson.test(text);
            }
            assert.isTrue(hasSecondPerson('Per unire testi usa &.'), 'il controllo riconosce il "tu"');
            assert.isTrue(hasSecondPerson('Usa le parentesi.'), 'anche a inizio frase');
            assert.isFalse(hasSecondPerson('Si usa un solo indice.'), '"si usa" è impersonale');
            assert.isFalse(hasSecondPerson('Ospitato negli USA.'), '"USA" è un paese');

            // I nomi dei comandi (§11.1: Nuovo, Apri, Salva, Esegui, Ferma...) sono etichette
            // di azioni, non frasi rivolte allo studente: restano all'imperativo.
            var commandNames = ['ui.new', 'ui.open', 'ui.save', 'ui.run', 'ui.pause', 'ui.resume', 'ui.stop',
                'ui.undo', 'ui.redo', 'ui.console.continue', 'ui.notice.close', 'ui.zoom.out', 'ui.zoom.in', 'ui.zoom.fit',
                'ui.unsaved.save', 'ui.unsaved.discard', 'ui.selection.insertAfter'];
            var messages = Localization.catalogOf('it').messages;
            assert.deepEqual(Object.keys(messages).filter(function (key) {
                return commandNames.indexOf(key) === -1 && hasSecondPerson(messages[key]);
            }), []);
        });

        T.test('un catalogo uguale al riferimento non ha problemi', function (assert) {
            assert.deepEqual(Localization.checkCatalog(reference, fakeCatalogs().it), []);
        });

        T.test('segnala chiavi mancanti e in più', function (assert) {
            var candidate = fakeCatalogs().it;
            delete candidate.messages.saluto;
            candidate.messages.extra = 'x';
            assert.deepEqual(Localization.checkCatalog(reference, candidate),
                ['chiave mancante: saluto', 'chiave in più: extra']);
        });

        T.test('segnala segnaposto diversi', function (assert) {
            var candidate = fakeCatalogs().it;
            candidate.messages.saluto = 'Ciao {name}!';
            assert.deepEqual(Localization.checkCatalog(reference, candidate),
                ['segnaposto diversi in saluto: attesi {nome}, trovati {name}']);
        });

        T.test('segnala un formato numerico non valido', function (assert) {
            var noNumber = fakeCatalogs().it;
            delete noNumber.number;
            assert.equal(Localization.checkCatalog(reference, noNumber).length, 1);

            var inconsistent = fakeCatalogs().it;
            inconsistent.number = { decimalSeparator: ',', inputDecimalSeparators: ['.'] };
            assert.equal(Localization.checkCatalog(reference, inconsistent).length, 1);

            var ambiguous = fakeCatalogs().it;
            ambiguous.number = { decimalSeparator: '.', inputDecimalSeparators: ['.', ','] };
            assert.deepEqual(Localization.checkCatalog(reference, ambiguous),
                ['con separatore "." l\'input accetta solo il punto']);
        });

        T.test('segnala un nome di lingua mancante', function (assert) {
            var candidate = fakeCatalogs().it;
            candidate.name = '';
            assert.equal(Localization.checkCatalog(reference, candidate).length, 1);
        });

        T.test('elenca i segnaposto senza ripetizioni', function (assert) {
            assert.deepEqual(Localization.placeholdersOf('{b} e {a} e {b}'), ['a', 'b']);
            assert.deepEqual(Localization.placeholdersOf('nessuno'), []);
        });
    });

    T.suite('Localization › messaggi degli errori di input (QA-07)', function () {
        var italian = Localization.createTranslator('it');
        var format = italian.numberFormat();

        /* Ogni testo produce un errore di input diverso; il messaggio deve esistere ed essere completo. */
        var CASES = [
            ['', 'Integer'], ['x', 'Integer'], ['2,5', 'Integer'], ['3000000000', 'Integer'],
            ['', 'Real'], ['1e3', 'Real'], ['1' + '0'.repeat(400), 'Real'],
            ['', 'Boolean'], ['vero', 'Boolean']
        ];

        T.test('ogni errore ha un messaggio senza segnaposto rimasti', function (assert) {
            CASES.forEach(function (testCase) {
                var result = NumberFormat.parseInput(testCase[0], testCase[1], format);
                assert.isFalse(result.ok, 'errore atteso per ' + T.formatValue(testCase[0]));
                var message = italian.formatError(result.error);
                assert.notEqual(message, result.error.code, 'messaggio presente per ' + T.formatValue(testCase[0]));
                assert.equal(message.indexOf('{'), -1, 'nessun segnaposto in: ' + message);
            });
        });

        T.test('input decimale per un Integer: messaggio dedicato (§8.4)', function (assert) {
            var result = NumberFormat.parseInput('2,5', 'Integer', format);
            assert.equal(italian.formatError(result.error),
                'La variabile accetta solo numeri interi: «2,5» ha una parte decimale.');
        });

        T.test('ogni motivo ha un messaggio specifico, non quello generico', function (assert) {
            var generic = italian.t('ERR_INPUT_NOT_CONVERTIBLE', { text: 'x', type: 'Integer' });
            CASES.forEach(function (testCase) {
                var result = NumberFormat.parseInput(testCase[0], testCase[1], format);
                var keys = italian.errorKeys(result.error);
                var used = keys.filter(function (key) { return italian.t(key) !== key; })[0];
                assert.notEqual(used, 'ERR_INPUT_NOT_CONVERTIBLE', 'chiave specifica per ' + keys[0]);
            });
            assert.isTrue(generic.indexOf('«x»') !== -1);
        });
    });
})();
