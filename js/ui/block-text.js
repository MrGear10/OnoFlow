/*
 * OnoFlow — testo di un blocco, diviso in parti da mostrare (FR-VIEW-05, FR-ERR-01).
 *
 * Dipendenze: js/namespace.js, js/core/model.js.
 * Definisce: OnoFlow.BlockText.{segments, plainText, templateKey}
 *
 * Il testo di ogni tipo di blocco viene da un modello del catalogo, per esempio
 * 'block.input': 'Input {variable}'. I segnaposto con il nome di un campo diventano parti
 * che portano il testo del campo esattamente come è scritto, con il suo errore: così il
 * disegno può sottolineare il punto esatto. Gli altri segnaposto sono proprietà del
 * blocco (type, text). Il resto del modello è testo fisso (parole chiave, "=").
 *
 *     segments(block, t) → [{ text, role: 'keyword' | 'field' | 'property', field, error }]
 *
 * Il do si mostra su due righe (do in alto, while in fondo): per il do, part sceglie
 * 'head' oppure 'tail'. Il modulo non tocca la pagina: è provato in tests/ui.test.js.
 */
(function (OnoFlow) {
    'use strict';

    var Model = OnoFlow.Model;
    if (!Model) {
        throw new Error('block-text.js richiede model.js, da caricare prima');
    }

    var PLACEHOLDER = /\{([A-Za-z_][A-Za-z0-9_]*)\}/g;

    /* Chiave del catalogo con il modello del testo del blocco. */
    function templateKey(block, part) {
        switch (block.kind) {
            case 'declare':
                return block.array ? 'block.declare.array' : 'block.declare';
            case 'output':
                return block.newline ? 'block.output' : 'block.output.noNewline';
            case 'do':
                return part === 'tail' ? 'block.do.tail' : 'block.do';
            case 'for':
                return 'block.for.' + block.direction + (block.fields.step.text.trim() === '1' ? '' : '.step');
            default:
                return 'block.' + block.kind;
        }
    }

    function segments(block, t, part) {
        // Il modello si chiede senza parametri: i segnaposto restano visibili e si dividono qui.
        var template = t(templateKey(block, part));
        var result = [];
        var last = 0;
        var match;
        PLACEHOLDER.lastIndex = 0;
        while ((match = PLACEHOLDER.exec(template)) !== null) {
            if (match.index > last) {
                result.push({ text: template.slice(last, match.index), role: 'keyword', field: null, error: null });
            }
            var name = match[1];
            var field = block.fields[name];
            if (field) {
                result.push({ text: field.text, role: 'field', field: name, error: field.error });
            } else {
                var value = block[name];
                result.push({ text: value === undefined ? match[0] : String(value), role: 'property', field: null, error: null });
            }
            last = PLACEHOLDER.lastIndex;
        }
        if (last < template.length) {
            result.push({ text: template.slice(last), role: 'keyword', field: null, error: null });
        }
        return result;
    }

    /* Testo di una riga in una sola stringa, per i messaggi (FR-ERR-01). */
    function plainText(block, t, part) {
        return segments(block, t, part).map(function (segment) { return segment.text; }).join('');
    }

    OnoFlow.BlockText = { segments: segments, plainText: plainText, templateKey: templateKey };
})(window.OnoFlow);
