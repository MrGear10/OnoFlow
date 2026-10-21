/*
 * OnoFlow — modello del programma: albero di funzioni e blocchi.
 *
 * Dipendenze: js/namespace.js, js/core/expression-lexer.js, js/core/expression-parser.js.
 * Definisce: OnoFlow.Model
 *
 * È l'unica fonte di verità del diagramma (§10.2), senza dettagli grafici.
 *
 *     Programma: { attributes: [{ name, value }], functions: [Funzione] }
 *     Funzione:  { id, name, type, variable, parameters: [{ name, type, array }], body: [Blocco] }
 *     Blocco:    { id, kind, fields: { nome: Campo }, ...proprietà, ...elenchi di blocchi figli }
 *     Campo:     { kind, text, ast, error }   (§10.3: il testo resta anche se c'è un errore)
 *
 * Ogni funzione e ogni blocco ha un ID stabile ("n1", "n2", ...) che collega il modello
 * al disegno; gli ID non si scrivono nel file e non cambiano quando si modifica un campo.
 *
 * Tipi di blocco e loro contenuto (§7.3, §7.4):
 *     declare  campi names (nameList), size (expression); proprietà type, array
 *     assign   campi variable (target), expression
 *     input    campo variable (target)
 *     output   campo expression; proprietà newline
 *     if       campo expression; figli then, else
 *     while    campo expression; figli body
 *     do       campo expression; figli body
 *     for      campi variable (name), start, end (expression), step (forStep);
 *              proprietà direction ('inc' | 'dec'); figli body
 *     call     campo expression
 *     comment  proprietà text (non si analizza)
 */
(function (OnoFlow) {
    'use strict';

    var Expressions = OnoFlow.Expressions;
    if (!Expressions || !Expressions.parse) {
        throw new Error('model.js richiede expression-parser.js, da caricare prima');
    }

    var TYPES = ['Integer', 'Real', 'String', 'Boolean'];
    var FUNCTION_TYPES = ['None'].concat(TYPES);
    var DIRECTIONS = ['inc', 'dec'];

    /*
     * Definizione di ogni tipo di blocco: campi analizzati (nome → tipo di campo),
     * proprietà semplici con il valore predefinito, elenchi di blocchi figli.
     */
    var BLOCK_DEFINITIONS = {
        declare: {
            fields: { names: 'nameList', size: 'expression' },
            properties: { type: 'Integer', array: false },
            children: []
        },
        assign: { fields: { variable: 'target', expression: 'expression' }, properties: {}, children: [] },
        input: { fields: { variable: 'target' }, properties: {}, children: [] },
        output: { fields: { expression: 'expression' }, properties: { newline: true }, children: [] },
        'if': { fields: { expression: 'expression' }, properties: {}, children: ['then', 'else'] },
        'while': { fields: { expression: 'expression' }, properties: {}, children: ['body'] },
        'do': { fields: { expression: 'expression' }, properties: {}, children: ['body'] },
        'for': {
            fields: { variable: 'name', start: 'expression', end: 'expression', step: 'forStep' },
            properties: { direction: 'inc' },
            children: ['body']
        },
        call: { fields: { expression: 'expression' }, properties: {}, children: [] },
        comment: { fields: {}, properties: { text: '' }, children: [] }
    };

    // Valori predefiniti dei campi di un blocco nuovo (D-09 deciderà il contenuto iniziale).
    var FIELD_DEFAULTS = { step: '1' };

    var lastId = 0;

    /* ID nuovo, unico nella sessione. */
    function nextId() {
        lastId++;
        return 'n' + lastId;
    }

    /* Campo analizzato: conserva sempre il testo, anche quando contiene un errore. */
    function createField(kind, text) {
        var source = text === undefined || text === null ? '' : String(text);
        var result = Expressions.parse(kind, source);
        return { kind: kind, text: source, ast: result.ast, error: result.error };
    }

    function definitionOf(kind) {
        var definition = BLOCK_DEFINITIONS[kind];
        if (!definition) {
            throw new TypeError('Model: tipo di blocco sconosciuto ' + kind);
        }
        return definition;
    }

    function checkProperty(kind, name, value) {
        if (name === 'type' && TYPES.indexOf(value) === -1) {
            throw new TypeError('Model: tipo non valido ' + value);
        }
        if (name === 'direction' && DIRECTIONS.indexOf(value) === -1) {
            throw new TypeError('Model: direzione non valida ' + value);
        }
        if ((name === 'array' || name === 'newline') && typeof value !== 'boolean') {
            throw new TypeError('Model: ' + kind + '.' + name + ' deve essere true o false');
        }
        if (name === 'text' && typeof value !== 'string') {
            throw new TypeError('Model: il testo del commento deve essere una stringa');
        }
    }

    /*
     * Crea un blocco. values contiene i testi dei campi, le proprietà e gli elenchi
     * di figli, es. createBlock('assign', { variable: 'x', expression: 'x + 1' }).
     * Chiavi sconosciute sono un difetto di chi chiama.
     */
    function createBlock(kind, values) {
        var definition = definitionOf(kind);
        var source = values || {};
        Object.keys(source).forEach(function (key) {
            var known = Object.prototype.hasOwnProperty.call(definition.fields, key) ||
                Object.prototype.hasOwnProperty.call(definition.properties, key) ||
                definition.children.indexOf(key) !== -1;
            if (!known) {
                throw new TypeError('Model: ' + kind + ' non ha "' + key + '"');
            }
        });

        var block = { id: nextId(), kind: kind, fields: {} };
        Object.keys(definition.fields).forEach(function (fieldName) {
            var text = source[fieldName] !== undefined ? source[fieldName] : (FIELD_DEFAULTS[fieldName] || '');
            block.fields[fieldName] = createField(definition.fields[fieldName], text);
        });
        Object.keys(definition.properties).forEach(function (propertyName) {
            var value = source[propertyName] !== undefined ? source[propertyName] : definition.properties[propertyName];
            checkProperty(kind, propertyName, value);
            block[propertyName] = value;
        });
        definition.children.forEach(function (listName) {
            block[listName] = (source[listName] || []).slice();
        });
        return block;
    }

    function createFunction(values) {
        var source = values || {};
        var type = source.type || 'None';
        if (FUNCTION_TYPES.indexOf(type) === -1) {
            throw new TypeError('Model: tipo di funzione non valido ' + type);
        }
        return {
            id: nextId(),
            name: source.name || 'Main',
            type: type,
            variable: source.variable || '',
            parameters: (source.parameters || []).map(function (parameter) {
                if (TYPES.indexOf(parameter.type) === -1) {
                    throw new TypeError('Model: tipo di parametro non valido ' + parameter.type);
                }
                return { name: parameter.name, type: parameter.type, array: Boolean(parameter.array) };
            }),
            body: (source.body || []).slice()
        };
    }

    function createProgram(values) {
        var source = values || {};
        return {
            attributes: (source.attributes || []).map(function (attribute) {
                return { name: attribute.name, value: attribute.value };
            }),
            functions: (source.functions || []).slice()
        };
    }

    /* Programma nuovo: funzione Main senza blocchi (FR-FILE-07). Gli attributi sono la decisione D-01. */
    function createEmptyProgram() {
        return createProgram({ functions: [createFunction({ name: 'Main' })] });
    }

    /* Cambia il testo di un campo e lo rianalizza; l'ID del blocco non cambia. */
    function setFieldText(block, fieldName, text) {
        var field = block.fields[fieldName];
        if (!field) {
            throw new TypeError('Model: ' + block.kind + ' non ha il campo "' + fieldName + '"');
        }
        block.fields[fieldName] = createField(field.kind, text);
        return block.fields[fieldName];
    }

    /* Cambia una proprietà semplice (tipo, array, newline, direction, text), con lo stesso controllo della creazione. */
    function setProperty(block, name, value) {
        if (!Object.prototype.hasOwnProperty.call(definitionOf(block.kind).properties, name)) {
            throw new TypeError('Model: ' + block.kind + ' non ha la proprietà "' + name + '"');
        }
        checkProperty(block.kind, name, value);
        block[name] = value;
        return value;
    }

    function childListsOf(block) {
        return definitionOf(block.kind).children;
    }

    /*
     * Visita i blocchi in ordine di lettura (prima il blocco, poi i suoi figli, then prima di else).
     * visitor(block, context) con context = { function, list, index, parent, depth }.
     * Se visitor restituisce false, la visita si ferma.
     */
    function walk(program, visitor) {
        var stopped = false;

        function visitList(list, parent, owner, depth) {
            for (var index = 0; index < list.length && !stopped; index++) {
                var block = list[index];
                if (visitor(block, { function: owner, list: list, index: index, parent: parent, depth: depth }) === false) {
                    stopped = true;
                    return;
                }
                var lists = childListsOf(block);
                for (var l = 0; l < lists.length && !stopped; l++) {
                    visitList(block[lists[l]], block, owner, depth + 1);
                }
            }
        }

        for (var f = 0; f < program.functions.length && !stopped; f++) {
            visitList(program.functions[f].body, null, program.functions[f], 0);
        }
    }

    /*
     * Cerca una funzione o un blocco per ID.
     * Restituisce { node, function, list, index, parent } oppure null.
     */
    function findById(program, id) {
        for (var f = 0; f < program.functions.length; f++) {
            if (program.functions[f].id === id) {
                return { node: program.functions[f], function: program.functions[f], list: program.functions, index: f, parent: null };
            }
        }
        var found = null;
        walk(program, function (block, context) {
            if (block.id === id) {
                found = {
                    node: block, function: context.function, list: context.list,
                    index: context.index, parent: context.parent
                };
                return false;
            }
            return true;
        });
        return found;
    }

    /* Campi di un blocco che contano: la dimensione si analizza solo per gli array. */
    function activeFieldNames(block) {
        return Object.keys(block.fields).filter(function (fieldName) {
            return !(block.kind === 'declare' && fieldName === 'size' && !block.array);
        });
    }

    /*
     * Errori di sintassi di tutti i campi, nell'ordine dei blocchi (FR-RUN-02, L-12).
     * Ogni errore porta nodeId (il blocco) e field (il campo).
     */
    function collectFieldErrors(program) {
        var errors = [];
        walk(program, function (block) {
            activeFieldNames(block).forEach(function (fieldName) {
                var error = block.fields[fieldName].error;
                if (error) {
                    errors.push({
                        code: error.code, params: error.params, position: error.position,
                        nodeId: block.id, field: fieldName
                    });
                }
            });
        });
        return errors;
    }

    OnoFlow.Model = {
        TYPES: TYPES,
        FUNCTION_TYPES: FUNCTION_TYPES,
        DIRECTIONS: DIRECTIONS,
        BLOCK_KINDS: Object.keys(BLOCK_DEFINITIONS),
        createField: createField,
        createBlock: createBlock,
        createFunction: createFunction,
        createProgram: createProgram,
        createEmptyProgram: createEmptyProgram,
        setFieldText: setFieldText,
        setProperty: setProperty,
        childListsOf: childListsOf,
        activeFieldNames: activeFieldNames,
        walk: walk,
        findById: findById,
        collectFieldErrors: collectFieldErrors
    };
})(window.OnoFlow);
