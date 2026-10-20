/*
 * OnoFlow — formato .fprg: scrittura (export).
 *
 * Dipendenze: js/namespace.js, js/core/fprg-import.js (Format.BLOCK_SCHEMA).
 * Definisce: OnoFlow.Format.{exportFprg, formatSavedDate, escapeAttribute, DEFAULT_FILE_FORMAT}
 *
 * exportFprg(program, { format, now }) restituisce il testo del file. Regole (§7.6):
 *   - FMT-W-01: dichiarazione <?xml version="1.0"?>, fileversion="4.2", rientro di 4 spazi;
 *     a capo, BOM e a capo finale come nel file importato (DEC-002), altrimenti LF
 *     senza BOM con a capo finale;
 *   - FMT-W-02: attributi nell'ordine di Flowgorithm (lo stesso schema dell'import);
 *   - FMT-W-03: elementi senza contenuto autochiusi;
 *   - FMT-W-04: escape scritti qui, non da un serializzatore;
 *   - FMT-W-05, FMT-W-09: i campi si scrivono con il testo dello studente, mai dall'AST;
 *   - FMT-W-06: attributi del file conservati nell'ordine; solo "saved" diventa l'ora
 *     dell'export, se c'era;
 *   - FMT-W-07, FMT-W-08: non si generano created/edited né attributi sconosciuti.
 */
(function (OnoFlow) {
    'use strict';

    var Format = OnoFlow.Format;
    if (!Format || !Format.BLOCK_SCHEMA) {
        throw new Error('fprg-export.js richiede fprg-import.js, da caricare prima');
    }

    var INDENT = '    ';
    var DEFAULT_FILE_FORMAT = { newline: '\n', bom: false, finalNewline: true };

    /* Escape di un valore di attributo (FMT-W-04). L'apostrofo resta com'è. */
    function escapeAttribute(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/\n/g, '&#10;')
            .replace(/\r/g, '&#13;')
            .replace(/\t/g, '&#9;');
    }

    function pad(number) {
        return (number < 10 ? '0' : '') + number;
    }

    /* "AAAA-MM-GG hh:mm:ss " nell'ora locale, con lo spazio finale come Flowgorithm (§7.2). */
    function formatSavedDate(date) {
        return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' +
            pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) + ' ';
    }

    function attributesText(pairs) {
        return pairs.map(function (pair) {
            return ' ' + pair[0] + '="' + escapeAttribute(pair[1]) + '"';
        }).join('');
    }

    /* Valori degli attributi XML di un blocco, nell'ordine dello schema. */
    function blockAttributes(block) {
        return Format.BLOCK_SCHEMA[block.kind].attributes.map(function (entry) {
            var attribute = entry[0];
            var valueKind = entry[1];
            var key = entry[2];
            var value;
            if (valueKind === 'field') {
                // La dimensione si scrive solo per gli array (FMT-R-07).
                value = (block.kind === 'declare' && key === 'size' && !block.array) ? '' : block.fields[key].text;
            } else if (valueKind === 'boolean') {
                value = block[key] ? 'True' : 'False';
            } else {
                value = block[key];
            }
            return [attribute, value];
        });
    }

    function Writer() {
        this.lines = [];
    }

    Writer.prototype.line = function (depth, text) {
        this.lines.push(INDENT.repeat(depth) + text);
    };

    /* Elemento con un elenco di blocchi: autochiuso se vuoto (FMT-W-03). */
    Writer.prototype.container = function (depth, tag, attributes, blocks) {
        if (blocks.length === 0) {
            this.line(depth, '<' + tag + attributes + '/>');
            return;
        }
        this.line(depth, '<' + tag + attributes + '>');
        this.blocks(depth + 1, blocks);
        this.line(depth, '</' + tag + '>');
    };

    Writer.prototype.blocks = function (depth, blocks) {
        for (var i = 0; i < blocks.length; i++) {
            this.block(depth, blocks[i]);
        }
    };

    Writer.prototype.block = function (depth, block) {
        var schema = Format.BLOCK_SCHEMA[block.kind];
        var attributes = attributesText(blockAttributes(block));
        if (schema.children === 'body') {
            this.container(depth, block.kind, attributes, block.body);
        } else if (schema.children === 'branches') {
            // then ed else ci sono sempre, anche vuoti (§7.3).
            this.line(depth, '<' + block.kind + attributes + '>');
            this.container(depth + 1, 'then', '', block.then);
            this.container(depth + 1, 'else', '', block['else']);
            this.line(depth, '</' + block.kind + '>');
        } else {
            this.line(depth, '<' + block.kind + attributes + '/>');
        }
    };

    Writer.prototype.programFunction = function (depth, programFunction) {
        this.line(depth, '<function' + attributesText([
            ['name', programFunction.name], ['type', programFunction.type], ['variable', programFunction.variable]
        ]) + '>');
        if (programFunction.parameters.length === 0) {
            this.line(depth + 1, '<parameters/>');
        } else {
            this.line(depth + 1, '<parameters>');
            var self = this;
            programFunction.parameters.forEach(function (parameter) {
                self.line(depth + 2, '<parameter' + attributesText([
                    ['name', parameter.name], ['type', parameter.type], ['array', parameter.array ? 'True' : 'False']
                ]) + '/>');
            });
            this.line(depth + 1, '</parameters>');
        }
        this.container(depth + 1, 'body', '', programFunction.body);
        this.line(depth, '</function>');
    };

    function exportFprg(program, options) {
        var settings = options || {};
        var format = settings.format || DEFAULT_FILE_FORMAT;
        var now = settings.now || new Date();
        var writer = new Writer();

        writer.lines.push('<?xml version="1.0"?>');
        writer.line(0, '<flowgorithm fileversion="4.2">');
        if (program.attributes.length === 0) {
            writer.line(1, '<attributes/>');
        } else {
            writer.line(1, '<attributes>');
            program.attributes.forEach(function (attribute) {
                var value = attribute.name === 'saved' ? formatSavedDate(now) : attribute.value;
                writer.line(2, '<attribute' + attributesText([['name', attribute.name], ['value', value]]) + '/>');
            });
            writer.line(1, '</attributes>');
        }
        program.functions.forEach(function (programFunction) {
            writer.programFunction(1, programFunction);
        });
        writer.line(0, '</flowgorithm>');

        var text = writer.lines.join(format.newline) + (format.finalNewline ? format.newline : '');
        return (format.bom ? '\uFEFF' : '') + text;
    }

    Format.DEFAULT_FILE_FORMAT = DEFAULT_FILE_FORMAT;
    Format.escapeAttribute = escapeAttribute;
    Format.formatSavedDate = formatSavedDate;
    Format.exportFprg = exportFprg;
})(window.OnoFlow);
