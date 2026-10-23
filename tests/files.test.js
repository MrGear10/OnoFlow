/*
 * OnoFlow — test dei file creati e modificati con l'editor (passo 13): QA-11, QA-12,
 * FR-FILE-09, FR-FILE-10.
 *
 * Dipendenze: tests/framework/*, js/core/*, js/examples/examples.js.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var OnoFlow = window.OnoFlow;
    var Format = OnoFlow.Format;
    var Model = OnoFlow.Model;
    var Editor = OnoFlow.Editor;
    var History = OnoFlow.History;
    var DiagramDocument = OnoFlow.DiagramDocument;
    var Interpreter = OnoFlow.Interpreter;

    var QA04_INPUTS = ['5', 's', '3', 'n', '4', '9'];
    var NOW = new Date(2026, 9, 23, 18, 5, 9);
    var APPENDIX = OnoFlow.Examples.byId('somma-massimo-minimo').text;

    /* La struttura di un elenco di blocchi senza ID né AST: tipo, contenuto, figli. */
    function shape(list) {
        return list.map(function (block) {
            var item = { kind: block.kind, content: Editor.contentOf(block) };
            Model.childListsOf(block).forEach(function (name) {
                item[name] = shape(block[name]);
            });
            return item;
        });
    }

    function mainShape(program) {
        return shape(program.functions[0].body);
    }

    function outputOf(program) {
        var result = Interpreter.runSync(program, QA04_INPUTS);
        return result.status + ':' + result.output;
    }

    /* Le righe tra <body> e </body> di Main. */
    function bodyLines(text) {
        var lines = text.split('\n');
        return lines.slice(lines.indexOf('        <body>'), lines.indexOf('        </body>') + 1);
    }

    /*
     * QA-11: ricostruisce un elenco con le sole operazioni dell'editor, come farebbe chi usa la
     * pagina: blocco nuovo (vuoto), inserimento nel punto, campi e proprietà come nella finestra.
     */
    function rebuild(program, ownerId, listName, recipe) {
        recipe.forEach(function (item, index) {
            var block = Editor.createNewBlock(item.kind);
            Editor.insertAt(program, { ownerId: ownerId, list: listName, index: index }, block);
            Object.keys(item.content.properties).forEach(function (name) {
                Model.setProperty(block, name, item.content.properties[name]);
            });
            Object.keys(item.content.fields).forEach(function (name) {
                Model.setFieldText(block, name, item.content.fields[name]);
            });
            Model.childListsOf(block).forEach(function (name) {
                rebuild(program, block.id, name, item[name]);
            });
        });
    }

    function openAppendix() {
        var loaded = Format.importFprg(APPENDIX);
        return DiagramDocument.create({
            program: loaded.program, format: loaded.format, sourceText: APPENDIX,
            fileName: 'somma-massimo-minimo.fprg', origin: 'file', saved: true
        });
    }

    function attribute(text, name) {
        var match = new RegExp('<attribute name="' + name + '" value="([^"]*)"/>').exec(text);
        return match ? match[1] : null;
    }

    T.suite('File › creazione da zero (QA-11, FR-FILE-10)', function () {
        T.test('l\'Appendice A costruita con l\'editor: stesso output, stesso corpo nel file, stesso modello riaperto', function (assert) {
            var recipe = mainShape(Format.importFprg(APPENDIX).program);
            var program = Model.createEmptyProgram();
            var document = DiagramDocument.create({
                program: program, format: Format.DEFAULT_FILE_FORMAT, sourceText: Format.exportFprg(program),
                fileName: 'diagramma.fprg', origin: 'new', saved: true
            });
            rebuild(program, program.functions[0].id, 'body', recipe);
            document.markChanged();
            assert.deepEqual(mainShape(program), recipe, 'stessa struttura');
            assert.equal(OnoFlow.StaticCheck.check(program).length, 0, 'nessun errore');
            assert.equal(outputOf(program), outputOf(Format.importFprg(APPENDIX).program), 'QA-04: stesso output');

            var saved = document.save('esercizio.fprg', NOW);
            assert.deepEqual(bodyLines(saved), bodyLines(APPENDIX), 'il corpo è scritto come nel file di Flowgorithm');
            assert.equal(attribute(saved, 'name'), 'esercizio');
            assert.equal(attribute(saved, 'created'), null, 'mai created (FMT-W-07)');

            var reopened = Format.importFprg(saved);
            assert.equal(reopened.error, undefined);
            assert.deepEqual(reopened.warnings, [], 'si riapre senza avvisi');
            assert.deepEqual(mainShape(reopened.program), recipe, 'riaperto dà lo stesso modello');
            assert.equal(Format.exportFprg(reopened.program, { format: reopened.format, now: NOW }), saved, 'e si risalva identico');
        });
    });

    T.suite('File › modifica di un file importato (QA-12, FR-FILE-09)', function () {
        T.test('cambiare un\'espressione, aggiungere e cancellare un blocco: nel file solo queste righe cambiano', function (assert) {
            var document = openAppendix();
            var program = document.program;
            var main = program.functions[0];
            var forBlock = main.body.filter(function (block) { return block.kind === 'for'; })[0];
            var resetI = main.body[main.body.indexOf(forBlock) + 1];
            Model.setFieldText(forBlock, 'end', 'dim - 1');
            var added = Editor.createNewBlock('output');
            Model.setFieldText(added, 'expression', '"Fine dei numeri"');
            Editor.insertAt(program, Editor.slotAfter(program, forBlock.body[2].id), added);
            Editor.removeAt(program, main.body[1].id); // declare risultato
            document.markChanged();
            assert.equal(resetI.fields.expression.text, '0');

            var saved = document.save('somma-massimo-minimo.fprg', NOW);
            var expected = APPENDIX.split('\n');
            var at = function (text) {
                var index = expected.indexOf(text);
                assert.isTrue(index !== -1, 'riga dell\'originale: ' + text);
                return index;
            };
            expected[at('        <attribute name="saved" value="2026-10-10 11:27:35 "/>')] = '        <attribute name="saved" value="2026-10-23 18:05:09 "/>';
            expected[at('            <for variable="i" start="0" end="dim -1" direction="inc" step="1">')] =
                '            <for variable="i" start="0" end="dim - 1" direction="inc" step="1">';
            expected.splice(at('                <assign variable="numeri[i]" expression="n"/>') + 1, 0,
                '                <output expression="&quot;Fine dei numeri&quot;" newline="True"/>');
            expected.splice(at('            <declare name="risultato" type="Integer" array="False" size=""/>'), 1);
            assert.deepEqual(saved.split('\n'), expected, 'solo le righe cambiate, il resto identico');
            ['name', 'authors', 'about', 'created', 'edited'].forEach(function (name) {
                assert.equal(attribute(saved, name), attribute(APPENDIX, name), 'attributo conservato: ' + name);
            });

            var reopened = Format.importFprg(saved);
            assert.deepEqual(reopened.warnings, []);
            assert.deepEqual(mainShape(reopened.program), mainShape(program), 'riaperto dà lo stesso diagramma (FR-FILE-10)');
        });

        T.test('modifiche annullate: il file salvato è identico all\'originale, salvo saved', function (assert) {
            var document = openAppendix();
            var program = document.program;
            var main = program.functions[0];
            var history = History.create();
            var target = main.body[3];
            var before = Editor.contentOf(target);
            Model.setFieldText(target, 'expression', '1');
            history.record({ kind: 'edit', blockId: target.id, before: before, after: Editor.contentOf(target) });
            var removed = Editor.removeAt(program, main.body[5].id);
            history.record({ kind: 'remove', block: removed.block, slot: removed.slot });
            while (history.undo(program)) { /* fino all'inizio */ }
            var saved = document.save('somma-massimo-minimo.fprg', NOW);
            var withoutSaved = function (text) { return text.replace(/<attribute name="saved" value="[^"]*"\/>/, ''); };
            assert.equal(withoutSaved(saved), withoutSaved(APPENDIX));
        });
    });
})();
