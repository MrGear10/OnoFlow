/*
 * OnoFlow — operazioni dell'editor sul modello (passo 9: inserimento; passo 11: cancellazione).
 *
 * Dipendenze: js/namespace.js, js/core/model.js.
 * Definisce: OnoFlow.Editor.{INSERTABLE_KINDS, createNewBlock, canEdit, slotAfter, insertAt,
 *            removeAt, countInside, contentOf, setContent, sameContent}
 *
 * L'editor modifica solo il modello; il disegno si rifà dopo (§10.3). Nella fase 1 si
 * modifica solo Main (DEC-004): le altre funzioni di un file importato si vedono e si
 * eseguono, ma non hanno punti di inserimento.
 *
 * Un punto di inserimento (slot) è { ownerId, list, index }: il proprietario (la funzione
 * o il blocco che contiene l'elenco), il nome dell'elenco ('body', 'then', 'else') e la
 * posizione. È la stessa forma dei punti calcolati da DiagramLayout.
 *
 *     insertAt(program, slot, block) → { block, slot }   (per annulla/ripeti, passo 12)
 *     removeAt(program, blockId)     → { block, slot }   insertAt(program, slot, block) lo rimette
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

    /* Si può modificare dentro questo proprietario? Solo in Main (DEC-004). */
    function canEdit(program, ownerId) {
        var found = Model.findById(program, ownerId);
        return Boolean(found) && found.function.name === 'Main';
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

    /* Il punto subito dopo un blocco ("Inserisci dopo", B3). */
    function slotAfter(program, blockId) {
        var found = Model.findById(program, blockId);
        if (!found || found.node.kind === undefined) {
            throw new RangeError('Editor: blocco inesistente ' + blockId);
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
            throw new RangeError('Editor: si modifica solo Main (DEC-004)');
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
        if (!canEdit(program, blockId)) {
            throw new RangeError('Editor: si modifica solo Main (DEC-004)');
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

    OnoFlow.Editor = {
        INSERTABLE_KINDS: INSERTABLE_KINDS,
        createNewBlock: createNewBlock,
        canEdit: canEdit,
        slotAfter: slotAfter,
        insertAt: insertAt,
        removeAt: removeAt,
        countInside: countInside,
        contentOf: contentOf,
        setContent: setContent,
        sameContent: sameContent
    };
})(window.OnoFlow);
