/*
 * OnoFlow — localizzazione: cataloghi, traduzione, testo degli errori, scelta della lingua.
 *
 * Dipendenze: js/namespace.js.
 * Definisce: OnoFlow.Localization
 * Ordine: va caricato prima dei cataloghi (js/i18n/catalog.*.js), che vi si registrano.
 *
 * Un catalogo è un oggetto:
 *     {
 *         name: 'Italiano',
 *         number: { decimalSeparator: ',', inputDecimalSeparators: [',', '.'] },
 *         messages: { 'chiave': 'testo con {segnaposto}', ... }
 *     }
 *
 * Regole (NFR-I18N-01…06):
 *   - nessun testo dell'interfaccia nel codice: tutto passa da t(chiave, parametri);
 *   - i messaggi hanno segnaposto {nome}, mai frammenti da concatenare;
 *   - chiave assente nella lingua attiva → italiano; assente anche lì → la chiave stessa;
 *   - la lingua non si memorizza: ?lang= nell'URL, poi lingua del browser, poi italiano.
 *
 * I valori dei parametri si inseriscono con String(): chi chiama passa i numeri da
 * mostrare già formattati con OnoFlow.NumberFormat quando serve il separatore della lingua.
 */
(function (OnoFlow) {
    'use strict';

    var FALLBACK_LANGUAGE = 'it';
    var PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

    var catalogs = {};

    function registerCatalog(language, catalog) {
        catalogs[language] = catalog;
    }

    function availableLanguages() {
        return Object.keys(catalogs);
    }

    function catalogOf(language) {
        return catalogs[language] || null;
    }

    /*
     * Sceglie la lingua iniziale (NFR-I18N-05).
     * search: la parte "?..." dell'indirizzo; browserLanguages: es. ['it-IT', 'en'];
     * available: lingue con un catalogo. Restituisce sempre una lingua disponibile,
     * oppure l'italiano.
     */
    function chooseLanguage(search, browserLanguages, available) {
        function find(code) {
            if (!code) {
                return null;
            }
            var primary = String(code).toLowerCase().split('-')[0];
            return available.indexOf(primary) !== -1 ? primary : null;
        }

        var requested = null;
        try {
            requested = new URLSearchParams(search || '').get('lang');
        } catch (error) {
            requested = null;
        }
        var fromUrl = find(requested);
        if (fromUrl) {
            return fromUrl;
        }
        var languages = browserLanguages || [];
        for (var i = 0; i < languages.length; i++) {
            var fromBrowser = find(languages[i]);
            if (fromBrowser) {
                return fromBrowser;
            }
        }
        return FALLBACK_LANGUAGE;
    }

    function hasMessage(catalog, key) {
        return Boolean(catalog && catalog.messages &&
            Object.prototype.hasOwnProperty.call(catalog.messages, key));
    }

    function fillPlaceholders(message, params) {
        return message.replace(PLACEHOLDER, function (whole, name) {
            if (params && Object.prototype.hasOwnProperty.call(params, name) && params[name] !== undefined) {
                return String(params[name]);
            }
            // Parametro mancante: il segnaposto resta visibile, così i test lo trovano (QA-07).
            return whole;
        });
    }

    /* Elenco dei segnaposto di un messaggio, ordinati e senza ripetizioni. */
    function placeholdersOf(message) {
        var names = [];
        String(message).replace(PLACEHOLDER, function (whole, name) {
            if (names.indexOf(name) === -1) {
                names.push(name);
            }
            return whole;
        });
        return names.sort();
    }

    /*
     * Crea un traduttore per una lingua, appoggiato ai cataloghi indicati.
     * L'applicazione usa quello predefinito (OnoFlow.Localization.t, ...); i test ne
     * creano altri con cataloghi finti.
     */
    function createTranslator(language, catalogSource) {
        var source = catalogSource || catalogs;
        var active = source[language] || null;
        var fallback = source[FALLBACK_LANGUAGE] || null;

        function lookup(key) {
            if (hasMessage(active, key)) {
                return active.messages[key];
            }
            if (hasMessage(fallback, key)) {
                return fallback.messages[key];
            }
            return null;
        }

        function t(key, params) {
            var message = lookup(key);
            return fillPlaceholders(message === null ? key : message, params);
        }

        /*
         * Chiavi da cercare per un errore, dalla più specifica (§8.2):
         * CODICE.reason.type → CODICE.reason → CODICE.
         */
        function errorKeys(error) {
            var params = error.params || {};
            var keys = [];
            if (params.reason !== undefined && params.type !== undefined) {
                keys.push(error.code + '.' + params.reason + '.' + params.type);
            }
            if (params.reason !== undefined) {
                keys.push(error.code + '.' + params.reason);
            }
            keys.push(error.code);
            return keys;
        }

        /* Testo di un errore { code, params }: si genera solo al momento di mostrarlo. */
        function formatError(error) {
            var keys = errorKeys(error);
            for (var i = 0; i < keys.length; i++) {
                if (lookup(keys[i]) !== null) {
                    return t(keys[i], error.params);
                }
            }
            return t(error.code, error.params);
        }

        /* Formato numerico della console (NFR-I18N-04). */
        function numberFormat() {
            return (active && active.number) || (fallback && fallback.number);
        }

        return {
            language: active ? language : FALLBACK_LANGUAGE,
            t: t,
            formatError: formatError,
            errorKeys: errorKeys,
            numberFormat: numberFormat
        };
    }

    /*
     * Confronta un catalogo con quello di riferimento (NFR-I18N-06): stesse chiavi,
     * stessi segnaposto per ogni chiave, formato numerico valido.
     * Restituisce l'elenco dei problemi trovati (vuoto se il catalogo è corretto).
     */
    function checkCatalog(reference, candidate) {
        var problems = [];
        if (!candidate || typeof candidate !== 'object') {
            return ['il catalogo non è un oggetto'];
        }
        if (typeof candidate.name !== 'string' || candidate.name === '') {
            problems.push('manca il nome della lingua (name)');
        }

        var number = candidate.number;
        if (!number || typeof number.decimalSeparator !== 'string' || number.decimalSeparator.length !== 1) {
            problems.push('number.decimalSeparator deve essere un solo carattere');
        } else if (!Array.isArray(number.inputDecimalSeparators) ||
            number.inputDecimalSeparators.indexOf(number.decimalSeparator) === -1) {
            problems.push('number.inputDecimalSeparators deve contenere il separatore di output');
        } else if (number.decimalSeparator === '.' &&
            (number.inputDecimalSeparators.length !== 1)) {
            // Con il punto come separatore, la virgola in input sarebbe ambigua (§6.11).
            problems.push('con separatore "." l\'input accetta solo il punto');
        }

        var referenceMessages = (reference && reference.messages) || {};
        var candidateMessages = candidate.messages || {};
        Object.keys(referenceMessages).forEach(function (key) {
            if (!Object.prototype.hasOwnProperty.call(candidateMessages, key)) {
                problems.push('chiave mancante: ' + key);
                return;
            }
            var expected = placeholdersOf(referenceMessages[key]).join(', ');
            var actual = placeholdersOf(candidateMessages[key]).join(', ');
            if (expected !== actual) {
                problems.push('segnaposto diversi in ' + key + ': attesi {' + expected + '}, trovati {' + actual + '}');
            }
        });
        Object.keys(candidateMessages).forEach(function (key) {
            if (!Object.prototype.hasOwnProperty.call(referenceMessages, key)) {
                problems.push('chiave in più: ' + key);
            }
        });
        return problems;
    }

    // Traduttore predefinito: italiano finché l'applicazione non chiama init().
    var current = null;

    function translator() {
        if (!current) {
            current = createTranslator(FALLBACK_LANGUAGE);
        }
        return current;
    }

    /* Imposta la lingua dall'indirizzo e dal browser. Non memorizza nulla (NFR-PRIV-04). */
    function init(search, browserLanguages) {
        current = createTranslator(chooseLanguage(search, browserLanguages, availableLanguages()));
        return current.language;
    }

    OnoFlow.Localization = {
        FALLBACK_LANGUAGE: FALLBACK_LANGUAGE,
        registerCatalog: registerCatalog,
        availableLanguages: availableLanguages,
        catalogOf: catalogOf,
        chooseLanguage: chooseLanguage,
        createTranslator: createTranslator,
        checkCatalog: checkCatalog,
        placeholdersOf: placeholdersOf,
        init: init,
        language: function () { return translator().language; },
        t: function (key, params) { return translator().t(key, params); },
        formatError: function (error) { return translator().formatError(error); },
        numberFormat: function () { return translator().numberFormat(); }
    };
})(window.OnoFlow);
