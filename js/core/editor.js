/*
 * OnoFlow — operazioni dell'editor sul modello (passo 9: inserimento; passo 11: cancellazione;
 * passo 18: funzioni).
 *
 * Dipendenze: js/namespace.js, js/core/expression-lexer.js, js/core/model.js.
 * Definisce: OnoFlow.Editor.{INSERTABLE_KINDS, RETURN_TYPES, createNewBlock, canEdit, slotAfter,
 *            insertAt, removeAt, countInside, contentOf, setContent, sameContent,
 *            newFunction, insertFunction, removeFunction, signatureOf, setSignature,
 *            sameSignature, renameCalls, applyTexts}
 *
 * L'editor modifica solo il modello; il disegno si rifà dopo (§10.3). Dal passo 18 si
 * modificano tutte le funzioni (FR-EDIT-11, DEC-078); nella fase 1 solo Main (DEC-004).
 *
 * Un punto di inserimento (slot) è { ownerId, list, index }: il proprietario (la funzione
 * o il blocco che contiene l'elenco), il nome dell'elenco ('body', 'then', 'else') e la
 * posizione. È la stessa forma dei punti calcolati da DiagramLayout.
 *
 *     insertAt(program, slot, block) → { block, slot }   (per annulla/ripeti, passo 12)
 *     removeAt(program, blockId)     → { block, slot }   insertAt(program, slot, block) lo rimette
 *     removeFunction(program, id)    → { fn, index }     insertFunction(program, index, fn) la rimette
 *     renameCalls(program, da, a)    → [{ blockId, field, before, after }]   applyTexts le rimette
 */
(function (OnoFlow) {
    'use strict';

    var Model = OnoFlow.Model;
    if (!Model) {
        throw new Error('editor.js richiede model.js, da caricare prima');
    }

    // I blocchi del menu (FR-EDIT-01, §7.3; call e comment dal passo 17, FR-EDIT-10), nell'ordine in cui si mostrano.
    var INSERTABLE_KINDS = ['declare', 'assign', 'input', 'output', 'if', 'while', 'do', 'for', 'call', 'comment'];

    /* Blocco nuovo (D-09, DEC-063): campi vuoti; il suggerimento sta solo nella finestra di modifica. */
    function createNewBlock(kind) {
        if (INSERTABLE_KINDS.indexOf(kind) === -1) {
            throw new TypeError('Editor: tipo di blocco non inseribile ' + kind);
        }
        return Model.createBlock(kind);
    }

    // Valori restituiti da una funzione (§6.8): 'None' è "nessuno".
    var RETURN_TYPES = Model.FUNCTION_TYPES;

    /* Si può modificare dentro questo proprietario? In ogni funzione dal passo 18 (DEC-078). */
    function canEdit(program, ownerId) {
        return Boolean(Model.findById(program, ownerId));
    }

    /* Elenco di un proprietario; la funzione ha solo 'body'. */
    function listOf(program, slot) {
        var found = Model.findById(program, slot.ownerId);
        if (!found) {
            throw new RangeError('Editor: proprietario inesistente ' + slot.ownerId);
        }
        var owner = found.node;
        var allowed = owner.kind === undefined ? ['body'] : Model.childListsOf(owner);
        if (allowed.indexOf(slot.list) === -1) {
            throw new RangeError('Editor: ' + slot.ownerId + ' non ha l\'elenco ' + slot.list);
        }
        return owner[slot.list];
    }

    /* Il punto subito dopo un blocco ("Inserisci dopo", B3); dopo l'Inizio di una funzione, il primo. */
    function slotAfter(program, blockId) {
        var found = Model.findById(program, blockId);
        if (!found) {
            throw new RangeError('Editor: blocco inesistente ' + blockId);
        }
        if (found.node.kind === undefined) {
            return { ownerId: found.node.id, list: 'body', index: 0 };
        }
        var listName = 'body';
        var ownerId = found.function.id;
        if (found.parent) {
            ownerId = found.parent.id;
            Model.childListsOf(found.parent).forEach(function (name) {
                if (found.parent[name] === found.list) {
                    listName = name;
                }
            });
        }
        return { ownerId: ownerId, list: listName, index: found.index + 1 };
    }

    function insertAt(program, slot, block) {
        if (!canEdit(program, slot.ownerId)) {
            throw new RangeError('Editor: proprietario inesistente ' + slot.ownerId);
        }
        var list = listOf(program, slot);
        if (!(slot.index >= 0 && slot.index <= list.length)) {
            throw new RangeError('Editor: posizione fuori dall\'elenco ' + slot.index);
        }
        list.splice(slot.index, 0, block);
        return { block: block, slot: { ownerId: slot.ownerId, list: slot.list, index: slot.index } };
    }

    /*
     * Cancella un blocco, e per if e cicli tutto il contenuto (FR-EDIT-04). Il blocco tolto
     * resta intatto, con gli stessi ID: rimesso con insertAt torna com'era.
     */
    function removeAt(program, blockId) {
        var found = Model.findById(program, blockId);
        if (!found || found.node.kind === undefined) {
            throw new RangeError('Editor: blocco inesistente ' + blockId);
        }
        var slot = slotAfter(program, blockId);
        slot.index -= 1;
        found.list.splice(found.index, 1);
        return { block: found.node, slot: slot };
    }

    /* Quanti blocchi ci sono dentro un blocco, a ogni livello. */
    function countInside(block) {
        var count = 0;
        Model.childListsOf(block).forEach(function (name) {
            block[name].forEach(function (child) {
                count += 1 + countInside(child);
            });
        });
        return count;
    }

    /*
     * Contenuto di un blocco: testi dei campi e proprietà, senza figli né ID. È quello che
     * cambia la finestra di modifica; annulla/ripeti lo rimette com'era (passo 12).
     */
    function contentOf(block) {
        var content = { fields: {}, properties: {} };
        Object.keys(block.fields).forEach(function (name) {
            content.fields[name] = block.fields[name].text;
        });
        Model.propertyNamesOf(block.kind).forEach(function (name) {
            content.properties[name] = block[name];
        });
        return content;
    }

    function setContent(block, content) {
        Object.keys(content.fields).forEach(function (name) {
            if (block.fields[name].text !== content.fields[name]) {
                Model.setFieldText(block, name, content.fields[name]);
            }
        });
        Object.keys(content.properties).forEach(function (name) {
            Model.setProperty(block, name, content.properties[name]);
        });
    }

    function sameContent(a, b) {
        return ['fields', 'properties'].every(function (part) {
            var keys = Object.keys(a[part]);
            return keys.length === Object.keys(b[part]).length && keys.every(function (key) {
                return a[part][key] === b[part][key];
            });
        });
    }

    // --- Funzioni (passo 18, FR-EDIT-11) ------------------------------------------------

    /* Funzione nuova: nome libero (Funzione, Funzione2…), senza parametri e senza valore. */
    function newFunction(program) {
        var taken = {};
        program.functions.forEach(function (programFunction) { taken[programFunction.name.toLowerCase()] = true; });
        var name = 'Funzione';
        for (var n = 2; taken[name.toLowerCase()]; n++) {
            name = 'Funzione' + n;
        }
        return Model.createFunction({ name: name });
    }

    function functionIndex(program, functionId) {
        for (var i = 0; i < program.functions.length; i++) {
            if (program.functions[i].id === functionId) {
                return i;
            }
        }
        return -1;
    }

    /* Mette una funzione nell'elenco; senza indice in fondo. Main resta la prima. */
    function insertFunction(program, index, programFunction) {
        var at = index === undefined || index === null ? program.functions.length : index;
        if (!(at >= 1 && at <= program.functions.length)) {
            throw new RangeError('Editor: posizione di funzione non valida ' + at);
        }
        program.functions.splice(at, 0, programFunction);
        return { fn: programFunction, index: at };
    }

    /* Toglie una funzione con tutto il corpo; Main non si toglie (§6.8). */
    function removeFunction(program, functionId) {
        var index = functionIndex(program, functionId);
        if (index === -1) {
            throw new RangeError('Editor: funzione inesistente ' + functionId);
        }
        if (program.functions[index].name === 'Main') {
            throw new RangeError('Editor: Main non si cancella');
        }
        return { fn: program.functions.splice(index, 1)[0], index: index };
    }

    /* Firma: nome, valore restituito e parametri (copiati), senza il corpo. */
    function signatureOf(programFunction) {
        return {
            name: programFunction.name,
            type: programFunction.type,
            variable: programFunction.variable,
            parameters: programFunction.parameters.map(function (parameter) {
                return { name: parameter.name, type: parameter.type, array: parameter.array };
            })
        };
    }

    function setSignature(programFunction, signature) {
        if (RETURN_TYPES.indexOf(signature.type) === -1) {
            throw new TypeError('Editor: tipo restituito non valido ' + signature.type);
        }
        signature.parameters.forEach(function (parameter) {
            if (Model.TYPES.indexOf(parameter.type) === -1) {
                throw new TypeError('Editor: tipo di parametro non valido ' + parameter.type);
            }
        });
        var copy = signatureOf(signature);
        programFunction.name = copy.name;
        programFunction.type = copy.type;
        // Senza valore non c'è variabile restituita (FMT-W: variable="").
        programFunction.variable = copy.type === 'None' ? '' : copy.variable;
        programFunction.parameters = copy.parameters;
    }

    function sameSignature(a, b) {
        return JSON.stringify(signatureOf(a)) === JSON.stringify(signatureOf(b));
    }

    // Campi in cui può comparire una chiamata: espressioni e bersagli (l'indice di a[F(1)]).
    var CALL_FIELD_KINDS = ['expression', 'target'];

    /*
     * Rinomina le chiamate a una funzione in tutto il programma, lasciando il resto del testo
     * com'è (stile e spazi dello studente, FMT-W-05): solo un identificatore seguito da "(".
     * Restituisce i campi cambiati, per annulla/ripeti.
     */
    function renameCalls(program, oldName, newName) {
        var changes = [];
        Model.walk(program, function (block) {
            Object.keys(block.fields).forEach(function (fieldName) {
                var field = block.fields[fieldName];
                if (CALL_FIELD_KINDS.indexOf(field.kind) === -1 || field.text.indexOf(oldName) === -1) {
                    return;
                }
                var tokens = OnoFlow.Expressions.tokenize(field.text);
                var text = field.text;
                for (var i = tokens.length - 2; i >= 0; i--) {
                    var token = tokens[i];
                    var next = tokens[i + 1];
                    if (token.type === 'identifier' && token.text === oldName && next.type === 'operator' && next.text === '(') {
                        text = text.slice(0, token.start) + newName + text.slice(token.end);
                    }
                }
                if (text !== field.text) {
                    changes.push({ blockId: block.id, field: fieldName, before: field.text, after: text });
                    Model.setFieldText(block, fieldName, text);
                }
            });
        });
        return changes;
    }

    /* Rimette i testi di renameCalls: backwards = quelli di prima. */
    function applyTexts(program, changes, backwards) {
        changes.forEach(function (change) {
            var found = Model.findById(program, change.blockId);
            if (found) {
                Model.setFieldText(found.node, change.field, backwards ? change.before : change.after);
            }
        });
    }

    OnoFlow.Editor = {
        INSERTABLE_KINDS: INSERTABLE_KINDS,
        RETURN_TYPES: RETURN_TYPES,
        createNewBlock: createNewBlock,
        canEdit: canEdit,
        slotAfter: slotAfter,
        insertAt: insertAt,
        removeAt: removeAt,
        countInside: countInside,
        contentOf: contentOf,
        setContent: setContent,
        sameContent: sameContent,
        newFunction: newFunction,
        insertFunction: insertFunction,
        removeFunction: removeFunction,
        signatureOf: signatureOf,
        setSignature: setSignature,
        sameSignature: sameSignature,
        renameCalls: renameCalls,
        applyTexts: applyTexts
    };
})(window.OnoFlow);
