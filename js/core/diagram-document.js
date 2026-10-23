/*
 * OnoFlow — il diagramma aperto come documento: origine, nome, stato "modificato" (passo 8).
 *
 * Dipendenze: js/namespace.js, js/core/fprg-export.js.
 * Definisce: OnoFlow.DiagramDocument.{create, newFileAttributes, baseName}
 *
 * Tiene insieme il programma, il formato del file, il testo da cui è stato aperto e due
 * numeri: la versione di adesso e quella salvata. "Modificato" vuol dire che sono diverse
 * (FR-FILE-08, FR-FILE-11). L'editor chiama markChanged a ogni modifica, che dà al programma
 * una versione mai usata prima; annulla/ripeti (passo 12, DEC-068) rimette con setRevision la
 * versione di prima, così annullando fino al salvataggio "modificato" si spegne (QA-13).
 *
 * Origine:
 *   'new'  diagramma creato in OnoFlow: a ogni salvataggio gli attributi sono quelli di
 *          DEC-061 (name dal nome del file, authors e about vuoti, saved), mai created/edited;
 *   'file' diagramma aperto da un file o da un esempio: gli attributi si conservano
 *          (FMT-W-06), solo saved si aggiorna.
 *
 *     create({ program, format, sourceText, fileName, origin, saved }) → documento
 *     documento.isModified(), markChanged(), revision(), setRevision(n), setFileName(nome),
 *     documento.save(nome, ora) → testo del file salvato,
 *     documento.sessionCopy(ora) → { text, fileName, saved, origin } (NFR-PRIV-08)
 */
(function (OnoFlow) {
    'use strict';

    var Format = OnoFlow.Format;
    if (!Format || !Format.exportFprg) {
        throw new Error('diagram-document.js richiede fprg-export.js, da caricare prima');
    }

    /* Nome del file senza l'estensione .fprg: è il valore di name in un file nuovo. */
    function baseName(fileName) {
        return String(fileName).replace(/\.fprg$/i, '');
    }

    /* Attributi di un file creato da zero (D-01, DEC-061): nessun dato dell'utente. */
    function newFileAttributes(fileName) {
        return [
            { name: 'name', value: baseName(fileName) },
            { name: 'authors', value: '' },
            { name: 'about', value: '' },
            { name: 'saved', value: '' } // il valore lo scrive l'export, con l'ora del salvataggio
        ];
    }

    function create(values) {
        var program = values.program;
        var format = values.format;
        var sourceText = values.sourceText;
        var origin = values.origin === 'new' ? 'new' : 'file';
        // Un documento ripristinato con modifiche non salvate parte già "modificato".
        var revision = values.saved === false ? 1 : 0;
        var savedRevision = 0;
        var lastRevision = revision;

        var document = {
            program: program,
            format: format,
            origin: origin,
            fileName: values.fileName,

            isModified: function () {
                return revision !== savedRevision;
            },

            markChanged: function () {
                lastRevision += 1;
                revision = lastRevision;
            },

            revision: function () {
                return revision;
            },

            /* Versione già vista (annulla/ripeti): non se ne crea una nuova. */
            setRevision: function (value) {
                revision = value;
            },

            setFileName: function (name) {
                document.fileName = name;
            },

            /* Testo del file da scaricare; da qui il documento risulta salvato. */
            save: function (name, now) {
                document.fileName = name;
                if (origin === 'new') {
                    program.attributes = newFileAttributes(name);
                }
                sourceText = Format.exportFprg(program, { format: format, now: now });
                savedRevision = revision;
                return sourceText;
            },

            /* Copia per il ripristino: il testo d'origine se non ci sono modifiche, così il
               round-trip resta identico; altrimenti il programma di adesso. */
            sessionCopy: function (now) {
                var modified = document.isModified();
                return {
                    text: modified ? Format.exportFprg(program, { format: format, now: now }) : sourceText,
                    fileName: document.fileName,
                    saved: !modified,
                    origin: origin
                };
            }
        };
        return document;
    }

    OnoFlow.DiagramDocument = { create: create, newFileAttributes: newFileAttributes, baseName: baseName };
})(window.OnoFlow);
