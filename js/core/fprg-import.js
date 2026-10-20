/*
 * OnoFlow — formato .fprg: lettura (import).
 *
 * Dipendenze: js/namespace.js, js/core/expression-*.js, js/core/model.js.
 * Definisce: OnoFlow.Format.{importFprg, BLOCK_SCHEMA, MAX_FILE_CHARACTERS}
 *
 * importFprg(testo) restituisce
 *     { ok: true, program, format, warnings }
 *     { ok: false, error, warnings }
 * dove format = { newline: '\n' | '\r\n', bom, finalNewline } descrive come era scritto il
 * file, per riscriverlo allo stesso modo (DEC-002), ed error/warnings sono oggetti
 * { code, params } (§8.2). La funzione non tocca nient'altro: se il file non si apre,
 * il diagramma già aperto resta com'è (FR-FILE-04).
 *
 * Regole di lettura FMT-R-01…10 (§7.5): il caricamento si ferma al primo errore
 * strutturale; gli errori dentro le espressioni non lo bloccano (restano nei campi del
 * modello, FR-FILE-05). Gli elementi presunti della §7.4 (funzioni con parametri, call,
 * comment) si caricano con l'avviso WARN_LOAD_UNVERIFIED_FORMAT (DEC-004, DEC-029).
 */
(function (OnoFlow) {
    'use strict';

    var Model = OnoFlow.Model;
    if (!Model) {
        throw new Error('fprg-import.js richiede model.js, da caricare prima');
    }
    var Format = OnoFlow.Format || (OnoFlow.Format = {});

    // NFR-PERF-02: file al massimo di 5 MB (qui misurati in caratteri, dopo la lettura).
    var MAX_FILE_CHARACTERS = 5 * 1024 * 1024;
    var VERSION_PATTERN = /^4(\.[0-9]+)?$/;

    /*
     * Attributi XML di ogni blocco, nell'ordine di Flowgorithm (FMT-W-02), e come si
     * traducono nel modello: [attributo XML, tipo di valore, chiave nel modello].
     * Tipi di valore: field (testo di un campo analizzato), text (testo semplice),
     * type (tipo di dato), boolean (True/False), direction (inc/dec).
     * children: 'body' per i cicli, 'branches' per then/else dell'if.
     * Lo usa anche l'export, così lettura e scrittura non possono divergere.
     */
    var BLOCK_SCHEMA = {
        declare: {
            attributes: [['name', 'field', 'names'], ['type', 'type', 'type'], ['array', 'boolean', 'array'], ['size', 'field', 'size']],
            children: null
        },
        assign: { attributes: [['variable', 'field', 'variable'], ['expression', 'field', 'expression']], children: null },
        input: { attributes: [['variable', 'field', 'variable']], children: null },
        output: { attributes: [['expression', 'field', 'expression'], ['newline', 'boolean', 'newline']], children: null },
        'if': { attributes: [['expression', 'field', 'expression']], children: 'branches' },
        'while': { attributes: [['expression', 'field', 'expression']], children: 'body' },
        'do': { attributes: [['expression', 'field', 'expression']], children: 'body' },
        'for': {
            attributes: [['variable', 'field', 'variable'], ['start', 'field', 'start'], ['end', 'field', 'end'],
                ['direction', 'direction', 'direction'], ['step', 'field', 'step']],
            children: 'body'
        },
        call: { attributes: [['expression', 'field', 'expression']], children: null },
        comment: { attributes: [['text', 'text', 'text']], children: null }
    };

    var UNVERIFIED_BLOCKS = ['call', 'comment'];

    /* Errore di caricamento: interrompe la lettura e risale fino a importFprg. */
    function LoadFailure(code, params) {
        this.error = { code: code, params: params || {} };
    }

    function fail(code, params) {
        throw new LoadFailure(code, params);
    }

    /* Elementi figli, saltando testo e commenti XML (FMT-R-08). */
    function elementChildren(element) {
        return Array.prototype.slice.call(element.children);
    }

    function Reader() {
        this.warnings = [];
        this.warnedKeys = {};
    }

    /* Aggiunge un avviso una sola volta per chiave (FMT-R-05: una volta per coppia elemento/attributo). */
    Reader.prototype.warnOnce = function (key, code, params) {
        if (Object.prototype.hasOwnProperty.call(this.warnedKeys, key)) {
            return;
        }
        this.warnedKeys[key] = true;
        this.warnings.push({ code: code, params: params });
    };

    Reader.prototype.markUnverified = function (elementName) {
        this.warnOnce('unverified:' + elementName, 'WARN_LOAD_UNVERIFIED_FORMAT', { element: elementName });
    };

    /* Avvisa per ogni attributo non previsto: andrà perso al salvataggio (FMT-W-08). */
    Reader.prototype.checkAttributes = function (element, allowed) {
        var attributes = element.attributes;
        for (var i = 0; i < attributes.length; i++) {
            var name = attributes[i].name;
            if (allowed.indexOf(name) === -1) {
                this.warnOnce('attribute:' + element.tagName + '/' + name, 'WARN_LOAD_UNKNOWN_ATTRIBUTE',
                    { element: element.tagName, attribute: name });
            }
        }
    };

    function requireAttribute(element, name) {
        if (!element.hasAttribute(name)) {
            fail('ERR_LOAD_MISSING_ATTRIBUTE', { element: element.tagName, attribute: name });
        }
        return element.getAttribute(name);
    }

    function invalidValue(element, attribute, value) {
        fail('ERR_LOAD_INVALID_VALUE', { element: element.tagName, attribute: attribute, value: value });
    }

    /* Booleani accettati solo come True / False (FMT-R-02). */
    function readBoolean(element, attribute) {
        var value = requireAttribute(element, attribute);
        if (value === 'True') {
            return true;
        }
        if (value === 'False') {
            return false;
        }
        return invalidValue(element, attribute, value);
    }

    function readChoice(element, attribute, allowed) {
        var value = requireAttribute(element, attribute);
        if (allowed.indexOf(value) === -1) {
            invalidValue(element, attribute, value);
        }
        return value;
    }

    /* Un elemento che non deve avere figli: un figlio è un elemento sconosciuto in quel punto. */
    function rejectChildren(element) {
        var children = elementChildren(element);
        if (children.length > 0) {
            fail('ERR_LOAD_UNKNOWN_ELEMENT', { element: children[0].tagName, parent: element.tagName });
        }
    }

    /*
     * Cerca tra i figli gli elementi richiesti, ognuno esattamente una volta.
     * Restituisce { nome: elemento }. Altri elementi sono sconosciuti (FMT-R-03, FMT-R-04).
     */
    function requireUniqueChildren(element, names) {
        var found = {};
        elementChildren(element).forEach(function (child) {
            var tag = child.tagName;
            if (names.indexOf(tag) === -1) {
                fail('ERR_LOAD_UNKNOWN_ELEMENT', { element: tag, parent: element.tagName });
            }
            if (found[tag]) {
                fail('ERR_LOAD_DUPLICATE_ELEMENT', { element: tag, parent: element.tagName });
            }
            found[tag] = child;
        });
        names.forEach(function (name) {
            if (!found[name]) {
                fail('ERR_LOAD_MISSING_ELEMENT', { element: name, parent: element.tagName });
            }
        });
        return found;
    }

    Reader.prototype.readBlocks = function (container) {
        var self = this;
        return elementChildren(container).map(function (child) {
            return self.readBlock(child, container.tagName);
        });
    };

    Reader.prototype.readBlock = function (element, parentName) {
        var kind = element.tagName;
        if (!Object.prototype.hasOwnProperty.call(BLOCK_SCHEMA, kind)) {
            fail('ERR_LOAD_UNKNOWN_ELEMENT', { element: kind, parent: parentName });
        }
        var schema = BLOCK_SCHEMA[kind];
        if (UNVERIFIED_BLOCKS.indexOf(kind) !== -1) {
            this.markUnverified(kind);
        }
        this.checkAttributes(element, schema.attributes.map(function (entry) { return entry[0]; }));

        var values = {};
        schema.attributes.forEach(function (entry) {
            var attribute = entry[0];
            var valueKind = entry[1];
            var key = entry[2];
            if (valueKind === 'boolean') {
                values[key] = readBoolean(element, attribute);
            } else if (valueKind === 'type') {
                values[key] = readChoice(element, attribute, Model.TYPES);
            } else if (valueKind === 'direction') {
                values[key] = readChoice(element, attribute, Model.DIRECTIONS);
            } else {
                values[key] = requireAttribute(element, attribute);
            }
        });

        if (kind === 'declare' && !values.array && values.size !== '') {
            // FMT-R-07: dimensione su una variabile semplice, ignorata.
            this.warnings.push({ code: 'WARN_LOAD_IGNORED_SIZE', params: { names: values.names, size: values.size } });
            values.size = '';
        }

        if (schema.children === 'body') {
            values.body = this.readBlocks(element);
        } else if (schema.children === 'branches') {
            var branches = requireUniqueChildren(element, ['then', 'else']);
            values.then = this.readBlocks(branches.then);
            values['else'] = this.readBlocks(branches['else']);
            this.checkAttributes(branches.then, []);
            this.checkAttributes(branches['else'], []);
        } else {
            rejectChildren(element);
        }
        return Model.createBlock(kind, values);
    };

    Reader.prototype.readFunction = function (element) {
        this.checkAttributes(element, ['name', 'type', 'variable']);
        var name = requireAttribute(element, 'name');
        var type = readChoice(element, 'type', Model.FUNCTION_TYPES);
        var variable = requireAttribute(element, 'variable');
        if (name !== 'Main' || type !== 'None' || variable !== '') {
            this.markUnverified('function');
        }

        var parts = requireUniqueChildren(element, ['parameters', 'body']);
        this.checkAttributes(parts.parameters, []);
        this.checkAttributes(parts.body, []);
        var self = this;
        var parameters = elementChildren(parts.parameters).map(function (child) {
            if (child.tagName !== 'parameter') {
                fail('ERR_LOAD_UNKNOWN_ELEMENT', { element: child.tagName, parent: 'parameters' });
            }
            self.markUnverified('parameter');
            self.checkAttributes(child, ['name', 'type', 'array']);
            var parameter = {
                name: requireAttribute(child, 'name'),
                type: readChoice(child, 'type', Model.TYPES),
                array: readBoolean(child, 'array')
            };
            rejectChildren(child);
            return parameter;
        });

        return Model.createFunction({
            name: name, type: type, variable: variable, parameters: parameters,
            body: this.readBlocks(parts.body)
        });
    };

    Reader.prototype.readAttributes = function (element) {
        this.checkAttributes(element, []);
        var self = this;
        return elementChildren(element).map(function (child) {
            if (child.tagName !== 'attribute') {
                fail('ERR_LOAD_UNKNOWN_ELEMENT', { element: child.tagName, parent: 'attributes' });
            }
            self.checkAttributes(child, ['name', 'value']);
            var attribute = { name: requireAttribute(child, 'name'), value: requireAttribute(child, 'value') };
            rejectChildren(child);
            return attribute;
        });
    };

    Reader.prototype.readDocument = function (root) {
        if (root.tagName !== 'flowgorithm') {
            fail('ERR_LOAD_NOT_FLOWGORITHM', { element: root.tagName });
        }
        this.checkAttributes(root, ['fileversion']);
        var version = root.hasAttribute('fileversion') ? root.getAttribute('fileversion') : '';
        if (!VERSION_PATTERN.test(version)) {
            // FMT-R-06: versione diversa da 4.x, si prova comunque.
            this.warnings.push({ code: 'WARN_LOAD_UNSUPPORTED_VERSION', params: { version: version } });
        }

        var attributes = null;
        var functions = [];
        var self = this;
        elementChildren(root).forEach(function (child) {
            if (child.tagName === 'attributes') {
                if (attributes !== null) {
                    fail('ERR_LOAD_DUPLICATE_ELEMENT', { element: 'attributes', parent: 'flowgorithm' });
                }
                attributes = self.readAttributes(child);
            } else if (child.tagName === 'function') {
                functions.push(self.readFunction(child));
            } else {
                fail('ERR_LOAD_UNKNOWN_ELEMENT', { element: child.tagName, parent: 'flowgorithm' });
            }
        });

        var hasMain = functions.some(function (candidate) { return candidate.name === 'Main'; });
        if (!hasMain) {
            fail('ERR_LOAD_NO_MAIN', {});
        }
        return Model.createProgram({ attributes: attributes || [], functions: functions });
    };

    /* Come è scritto il file: BOM, tipo di a capo, a capo finale (DEC-002). */
    function detectFormat(text) {
        var bom = text.charCodeAt(0) === 0xFEFF;
        var body = bom ? text.slice(1) : text;
        return {
            bom: bom,
            newline: body.indexOf('\r\n') !== -1 ? '\r\n' : '\n',
            finalNewline: /\n$/.test(body)
        };
    }

    function parseXml(text) {
        var documentNode;
        try {
            documentNode = new DOMParser().parseFromString(text, 'application/xml');
        } catch (error) {
            return null;
        }
        // Firefox mette <parsererror> come radice, Chromium lo inserisce nel documento.
        if (!documentNode || !documentNode.documentElement ||
            documentNode.getElementsByTagName('parsererror').length > 0) {
            return null;
        }
        return documentNode;
    }

    function importFprg(text) {
        var source = String(text);
        if (source.length > MAX_FILE_CHARACTERS) {
            return { ok: false, error: { code: 'ERR_LOAD_FILE_TOO_LARGE', params: { max: 5 } }, warnings: [] };
        }
        var format = detectFormat(source);
        // FMT-R-01: il BOM iniziale si toglie prima di leggere.
        var body = format.bom ? source.slice(1) : source;
        var documentNode = body.trim() === '' ? null : parseXml(body);
        if (!documentNode) {
            return { ok: false, error: { code: 'ERR_LOAD_INVALID_XML', params: {} }, warnings: [] };
        }

        var reader = new Reader();
        try {
            var program = reader.readDocument(documentNode.documentElement);
            return { ok: true, program: program, format: format, warnings: reader.warnings };
        } catch (failure) {
            if (failure instanceof LoadFailure) {
                return { ok: false, error: failure.error, warnings: reader.warnings };
            }
            throw failure;
        }
    }

    Format.MAX_FILE_CHARACTERS = MAX_FILE_CHARACTERS;
    Format.BLOCK_SCHEMA = BLOCK_SCHEMA;
    Format.importFprg = importFprg;
})(window.OnoFlow);
