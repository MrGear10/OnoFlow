/*
 * OnoFlow — parti comuni ai generatori di codice (fase 3, FR-GEN-01, DEC-093).
 *
 * Dipendenze: js/namespace.js, js/core/model.js, js/core/type-check.js.
 * Definisce: OnoFlow.Codegen.{analyze, variablesIn, assignsTo, simpleExpression, negate, Writer}
 *
 * Ogni linguaggio è un visitor sul modello (§9): js/core/codegen-python.js e
 * js/core/codegen-cpp.js. Qui ci sono le domande che entrambi fanno al programma:
 * il tipo di un'espressione, i nomi di una funzione, se un ciclo for si può scrivere nella
 * forma breve del linguaggio. I generatori lavorano su un programma senza errori: chi li
 * chiama controlla prima l'analisi statica.
 */
(function (OnoFlow) {
    'use strict';

    var Model = OnoFlow.Model;
    var TypeCheck = OnoFlow.TypeCheck;
    if (!Model || !TypeCheck) {
        throw new Error('codegen-common.js richiede model.js e type-check.js, da caricare prima');
    }

    /* Nomi delle variabili lette in un'espressione (anche come array: a[i] legge a e i). */
    function variablesIn(ast, into) {
        var names = into || [];
        if (!ast) {
            return names;
        }
        switch (ast.kind) {
            case 'variable':
                names.push(ast.name);
                break;
            case 'index':
                names.push(ast.name);
                variablesIn(ast.index, names);
                break;
            case 'call':
                ast.args.forEach(function (argument) { variablesIn(argument, names); });
                break;
            case 'unary':
                variablesIn(ast.operand, names);
                break;
            case 'binary':
                variablesIn(ast.left, names);
                variablesIn(ast.right, names);
                break;
            default:
                break;
        }
        return names;
    }

    /* Visita una lista di blocchi e i loro figli. */
    function eachBlock(blocks, visitor) {
        blocks.forEach(function (block) {
            visitor(block);
            Model.childListsOf(block).forEach(function (list) { eachBlock(block[list], visitor); });
        });
    }

    /* Nome scritto da un blocco: bersaglio di assegnazione o input, variabile di un for. */
    function writtenName(block) {
        if ((block.kind === 'assign' || block.kind === 'input') && block.fields.variable.ast) {
            return block.fields.variable.ast.name;
        }
        if (block.kind === 'for' && block.fields.variable.ast) {
            return block.fields.variable.ast.name;
        }
        return null;
    }

    /* Vero se uno dei blocchi (o dei loro figli) scrive la variabile. */
    function assignsTo(blocks, name) {
        var found = false;
        eachBlock(blocks, function (block) {
            if (writtenName(block) === name) {
                found = true;
            }
        });
        return found;
    }

    /* Vero se un campo di un blocco (escluse le dichiarazioni) nomina la variabile. */
    function blockMentions(block, name) {
        if (block.kind === 'declare') {
            return block.fields.size.ast ? variablesIn(block.fields.size.ast).indexOf(name) !== -1 : false;
        }
        if (writtenName(block) === name) {
            return true;
        }
        return Object.keys(block.fields).some(function (field) {
            var ast = block.fields[field].ast;
            return ast && variablesIn(ast).indexOf(name) !== -1;
        });
    }

    /* Vero se uno dei blocchi o dei loro figli nomina la variabile. */
    function mentionsDeep(block, name) {
        if (blockMentions(block, name)) {
            return true;
        }
        return Model.childListsOf(block).some(function (list) {
            return block[list].some(function (child) { return mentionsDeep(child, name); });
        });
    }

    /*
     * Come un blocco tratta la variabile, per chi la incontra dopo un ciclo: 'none' (non la
     * nomina), 'write' (le dà un valore nuovo prima di leggerla: assegnazione, input,
     * dichiarazione, for sulla stessa variabile), 'read' (in ogni altro caso, per prudenza).
     */
    function useOf(block, name) {
        if (!mentionsDeep(block, name)) {
            return 'none';
        }
        var fields = block.fields;
        if (block.kind === 'declare' && fields.names.ast &&
            fields.names.ast.names.some(function (entry) { return entry.name === name; }) &&
            !(fields.size.ast && variablesIn(fields.size.ast).indexOf(name) !== -1)) {
            return 'write';
        }
        if ((block.kind === 'assign' || block.kind === 'input') && fields.variable.ast &&
            fields.variable.ast.kind === 'variable' && fields.variable.ast.name === name &&
            !(block.kind === 'assign' && variablesIn(fields.expression.ast).indexOf(name) !== -1)) {
            return 'write';
        }
        if (block.kind === 'for' && fields.variable.ast.name === name &&
            variablesIn(fields.start.ast).indexOf(name) === -1 && variablesIn(fields.end.ast).indexOf(name) === -1) {
            return 'write';
        }
        return 'read';
    }

    /* Catena dalla funzione al blocco: [{ list, index, owner }], dall'esterno all'interno. */
    function pathTo(blocks, target, owner, path) {
        for (var index = 0; index < blocks.length; index++) {
            var block = blocks[index];
            var step = path.concat([{ list: blocks, index: index, owner: owner }]);
            if (block === target) {
                return step;
            }
            var lists = Model.childListsOf(block);
            for (var l = 0; l < lists.length; l++) {
                var found = pathTo(block[lists[l]], target, block, step);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }

    /*
     * Vero se il valore che la variabile ha dopo il blocco non lo legge nessuno: dopo il blocco,
     * in ordine di esecuzione, la prima volta che la variabile compare riceve un valore nuovo, o
     * non compare più. Se il blocco sta dentro un ciclo, il giro dopo potrebbe leggerla prima: la
     * variabile non deve comparire altrove in quel ciclo.
     */
    function valueAfterUnused(programFunction, block, name) {
        var path = pathTo(programFunction.body, block, null, []);
        for (var level = path.length - 1; level >= 0; level--) {
            var step = path[level];
            for (var next = step.index + 1; next < step.list.length; next++) {
                var use = useOf(step.list[next], name);
                if (use === 'write') {
                    return true;
                }
                if (use === 'read') {
                    return false;
                }
            }
            var owner = step.owner;
            if (owner && (owner.kind === 'while' || owner.kind === 'do' || owner.kind === 'for')) {
                var repeats = blockMentions(owner, name) || step.list.slice(0, step.index).some(function (earlier) {
                    return mentionsDeep(earlier, name);
                });
                if (repeats) {
                    return false;
                }
            }
        }
        return true;
    }

    /* Condizione opposta, scritta nel modo più semplice: a == b → a != b, not x → x. */
    var OPPOSITE = { '==': '!=', '!=': '==', '<': '>=', '>=': '<', '>': '<=', '<=': '>' };
    function negate(ast) {
        if (ast.kind === 'binary' && OPPOSITE[ast.operator]) {
            return { kind: 'binary', operator: OPPOSITE[ast.operator], left: ast.left, right: ast.right };
        }
        if (ast.kind === 'unary' && ast.operator === 'not') {
            return ast.operand;
        }
        return { kind: 'unary', operator: 'not', operand: ast };
    }

    /* Un'espressione che si può ripetere senza calcolarla di nuovo: un letterale o una variabile. */
    function simpleExpression(ast) {
        return ast.kind === 'literal' || ast.kind === 'variable' ||
            (ast.kind === 'unary' && ast.operator === '-' && ast.operand.kind === 'literal');
    }

    /*
     * Analisi del programma per i generatori:
     *     type(ast, funzione)        tipo dell'espressione (TypeCheck.expressionType)
     *     symbols(funzione)          { nome: { type, array } }
     *     forIsPlain(blocco, funzione)  il for si può scrivere con il ciclo del linguaggio
     *                                senza cambiare il significato: la variabile non si scrive
     *                                nel corpo e non si usa fuori dal ciclo (dopo il ciclo, in
     *                                OnoFlow vale il primo valore oltre la fine, §6.7)
     *     usesSize(funzione, nome)   la funzione chiede Size del parametro array
     */
    function analyze(program) {
        var types = TypeCheck.create(program);

        function forIsPlain(forBlock, programFunction) {
            var name = forBlock.fields.variable.ast.name;
            if (assignsTo(forBlock.body, name) || programFunction.variable === name) {
                return false;
            }
            return valueAfterUnused(programFunction, forBlock, name);
        }

        function usesSize(programFunction, name) {
            var found = false;
            function look(ast) {
                if (!ast || found) {
                    return;
                }
                if (ast.kind === 'call') {
                    if (ast.name === 'Size' && ast.args[0] && ast.args[0].kind === 'variable' && ast.args[0].name === name) {
                        found = true;
                    }
                    // Passato a un'altra funzione che vuole la lunghezza: anche questa la deve avere.
                    ast.args.forEach(look);
                    return;
                }
                if (ast.kind === 'index') {
                    look(ast.index);
                } else if (ast.kind === 'unary') {
                    look(ast.operand);
                } else if (ast.kind === 'binary') {
                    look(ast.left);
                    look(ast.right);
                }
            }
            eachBlock(programFunction.body, function (block) {
                Object.keys(block.fields).forEach(function (field) { look(block.fields[field].ast); });
            });
            return found;
        }

        return {
            type: function (ast, programFunction) { return types.expressionType(ast, programFunction); },
            symbols: function (programFunction) { return types.symbols(programFunction); },
            forIsPlain: forIsPlain,
            usesSize: usesSize
        };
    }

    /* Testo con il rientro: line() aggiunge una riga, indent() e dedent() cambiano il livello. */
    function Writer(unit) {
        this.unit = unit;
        this.level = 0;
        this.lines = [];
    }

    Writer.prototype.line = function (text) {
        this.lines.push(text === '' ? '' : new Array(this.level + 1).join(this.unit) + text);
    };

    Writer.prototype.indent = function () {
        this.level++;
    };

    Writer.prototype.dedent = function () {
        this.level--;
    };

    Writer.prototype.blank = function () {
        if (this.lines.length && this.lines[this.lines.length - 1] !== '') {
            this.lines.push('');
        }
    };

    Writer.prototype.text = function () {
        return this.lines.join('\n') + '\n';
    };

    OnoFlow.Codegen = {
        analyze: analyze,
        variablesIn: variablesIn,
        assignsTo: assignsTo,
        simpleExpression: simpleExpression,
        negate: negate,
        Writer: Writer
    };
})(window.OnoFlow);
