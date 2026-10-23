/*
 * OnoFlow — storia delle modifiche per annulla/ripeti (passo 12, FR-EDIT-05, D-02, DEC-068).
 *
 * Dipendenze: js/namespace.js, js/core/model.js, js/core/editor.js.
 * Definisce: OnoFlow.History.{create, LIMIT}
 *
 * Ogni modifica è un'operazione reversibile sul modello (§10.3), non una copia del programma:
 *     { kind: 'insert', block, slot }            annullare = togliere il blocco
 *     { kind: 'remove', block, slot }            annullare = rimetterlo nello stesso punto
 *     { kind: 'edit', blockId, before, after }   contenuto prima e dopo (Editor.contentOf)
 * più revisions: { before, after }, le versioni del documento prima e dopo la modifica, perché
 * annullando si torni anche allo stato "salvato" (QA-13).
 *
 * I blocchi tolti restano gli stessi oggetti, con gli stessi ID: rimessi tornano com'erano.
 * La storia è lineare: una modifica nuova cancella quello che si poteva ripetere.
 *
 *     create({ limit }) → storia
 *     storia.record(passo), undo(program) → passo | null, redo(program) → passo | null,
 *     storia.canUndo(), canRedo(), last() → l'ultimo passo da annullare, clear()
 */
(function (OnoFlow) {
    'use strict';

    var Model = OnoFlow.Model;
    var Editor = OnoFlow.Editor;
    if (!Model || !Editor) {
        throw new Error('history.js richiede model.js ed editor.js, da caricare prima');
    }

    // Passi conservati (D-02): oltre si dimenticano i più vecchi.
    var LIMIT = 100;

    function blockOf(program, id) {
        var found = Model.findById(program, id);
        if (!found || found.node.kind === undefined) {
            throw new RangeError('History: blocco inesistente ' + id);
        }
        return found.node;
    }

    function apply(program, step, backwards) {
        var removing = (step.kind === 'insert') === backwards;
        if (step.kind === 'edit') {
            Editor.setContent(blockOf(program, step.blockId), backwards ? step.before : step.after);
        } else if (removing) {
            Editor.removeAt(program, step.block.id);
        } else {
            Editor.insertAt(program, step.slot, step.block);
        }
    }

    function create(options) {
        var limit = options && options.limit ? options.limit : LIMIT;
        var done = [];
        var undone = [];

        return {
            record: function (step) {
                if (['insert', 'remove', 'edit'].indexOf(step.kind) === -1) {
                    throw new TypeError('History: passo sconosciuto ' + step.kind);
                }
                done.push(step);
                if (done.length > limit) {
                    done.shift();
                }
                undone = [];
            },
            undo: function (program) {
                var step = done.pop();
                if (!step) {
                    return null;
                }
                apply(program, step, true);
                undone.push(step);
                return step;
            },
            redo: function (program) {
                var step = undone.pop();
                if (!step) {
                    return null;
                }
                apply(program, step, false);
                done.push(step);
                return step;
            },
            canUndo: function () { return done.length > 0; },
            canRedo: function () { return undone.length > 0; },
            last: function () { return done.length ? done[done.length - 1] : null; },
            clear: function () {
                done = [];
                undone = [];
            }
        };
    }

    OnoFlow.History = { create: create, LIMIT: LIMIT };
})(window.OnoFlow);
