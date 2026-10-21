/*
 * OnoFlow — operazioni dell'editor sul modello (passo 9: inserimento).
 *
 * Dipendenze: js/namespace.js, js/core/model.js.
 * Definisce: OnoFlow.Editor.{INSERTABLE_KINDS, createNewBlock, canEdit, slotAfter, insertAt}
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
 */
(function (OnoFlow) {
    'use strict';

    var Model = OnoFlow.Model;
    if (!Model) {
        throw new Error('editor.js richiede model.js, da caricare prima');
    }

    // I blocchi del menu (FR-EDIT-01, §7.3), nell'ordine in cui si mostrano.
    var INSERTABLE_KINDS = ['declare', 'assign', 'input', 'output', 'if', 'while', 'do', 'for'];

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

    OnoFlow.Editor = {
        INSERTABLE_KINDS: INSERTABLE_KINDS,
        createNewBlock: createNewBlock,
        canEdit: canEdit,
        slotAfter: slotAfter,
        insertAt: insertAt
    };
})(window.OnoFlow);
