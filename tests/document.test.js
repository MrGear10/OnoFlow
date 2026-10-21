/*
 * OnoFlow — test del documento aperto (passo 8): stato "modificato", attributi di un file
 * nuovo (D-01, DEC-061), salvataggio di un file aperto, copia di sessione.
 *
 * Dipendenze: tests/framework/*, tests/helpers.js, js/core/*, js/examples/examples.js.
 */
(function () {
    'use strict';

    var T = window.OnoFlowTest;
    var H = window.OnoFlowTestHelpers;
    var OnoFlow = window.OnoFlow;
    var Format = OnoFlow.Format;
    var Model = OnoFlow.Model;
    var DiagramDocument = OnoFlow.DiagramDocument;

    var NOW = new Date(2026, 9, 21, 15, 40, 12);

    function newDocument(program) {
        var start = program || Model.createEmptyProgram();
        return DiagramDocument.create({
            program: start, format: Format.DEFAULT_FILE_FORMAT, sourceText: Format.exportFprg(start),
            fileName: 'diagramma.fprg', origin: 'new', saved: true
        });
    }

    function sampleDocument() {
        var text = OnoFlow.Examples.byId('somma-massimo-minimo').text;
        var result = Format.importFprg(text);
        return {
            text: text,
            document: DiagramDocument.create({
                program: result.program, format: result.format, sourceText: text,
                fileName: 'somma-massimo-minimo.fprg', origin: 'file', saved: true
            })
        };
    }

    function attributesOf(text) {
        return Format.importFprg(text).program.attributes;
    }

    function withoutSaved(text) {
        return text.replace(/<attribute name="saved" value="[^"]*"\/>/, '');
    }

    T.suite('Documento › stato "modificato" (FR-FILE-08, FR-FILE-11)', function () {
        T.test('un diagramma nuovo o appena aperto non è modificato', function (assert) {
            assert.isFalse(newDocument().isModified());
            assert.isFalse(sampleDocument().document.isModified());
        });

        T.test('una modifica lo rende modificato, il salvataggio no', function (assert) {
            var doc = newDocument();
            doc.markChanged();
            assert.isTrue(doc.isModified());
            doc.save('diagramma.fprg', NOW);
            assert.isFalse(doc.isModified());
            doc.markChanged();
            assert.isTrue(doc.isModified(), 'una modifica dopo il salvataggio');
        });

        T.test('cambiare il nome non è una modifica', function (assert) {
            var doc = newDocument();
            doc.setFileName('altro.fprg');
            assert.isFalse(doc.isModified());
            assert.equal(doc.fileName, 'altro.fprg');
        });

        T.test('un documento ripristinato con modifiche resta modificato', function (assert) {
            var doc = DiagramDocument.create({
                program: Model.createEmptyProgram(), format: Format.DEFAULT_FILE_FORMAT, sourceText: '',
                fileName: 'a.fprg', origin: 'new', saved: false
            });
            assert.isTrue(doc.isModified());
            doc.save('a.fprg', NOW);
            assert.isFalse(doc.isModified());
        });
    });

    T.suite('Documento › attributi di un file nuovo (D-01, DEC-061)', function () {
        T.test('name, authors, about e saved, in quest\'ordine; niente created ed edited', function (assert) {
            var text = newDocument(H.program([H.output('1')])).save('esercizio 3.fprg', NOW);
            assert.deepEqual(attributesOf(text), [
                { name: 'name', value: 'esercizio 3' },
                { name: 'authors', value: '' },
                { name: 'about', value: '' },
                { name: 'saved', value: '2026-10-21 15:40:12 ' }
            ]);
            assert.equal(text.indexOf('created'), -1);
            assert.equal(text.indexOf('edited'), -1);
        });

        T.test('name segue il nome del file a ogni salvataggio', function (assert) {
            var doc = newDocument();
            doc.save('primo.fprg', NOW);
            var text = doc.save('secondo.FPRG', NOW);
            assert.equal(attributesOf(text)[0].value, 'secondo');
        });

        T.test('il file salvato si riapre con lo stesso programma (FR-FILE-10)', function (assert) {
            var program = H.program([H.declare('x', 'Integer'), H.input('x'), H.output('x * 2')]);
            var text = newDocument(program).save('doppio.fprg', NOW);
            var reopened = Format.importFprg(text);
            assert.isTrue(reopened.ok);
            assert.equal(reopened.warnings.length, 0, 'nessun avviso');
            assert.equal(Format.exportFprg(reopened.program, { format: reopened.format, now: NOW }), text);
        });

        T.test('un file aperto conserva i suoi attributi: cambia solo saved (FMT-W-06)', function (assert) {
            var sample = sampleDocument();
            var text = sample.document.save('copia.fprg', NOW);
            assert.equal(withoutSaved(text), withoutSaved(sample.text));
            assert.isTrue(text.indexOf('value="2026-10-21 15:40:12 "') !== -1);
            assert.equal(attributesOf(text)[0].value, 'test_per_WebApp', 'name non segue il nome del file');
        });
    });

    T.suite('Documento › copia di sessione (NFR-PRIV-08, FR-MOB-15)', function () {
        T.test('senza modifiche: il testo d\'origine, identico', function (assert) {
            var sample = sampleDocument();
            assert.deepEqual(sample.document.sessionCopy(NOW), {
                text: sample.text, fileName: 'somma-massimo-minimo.fprg', saved: true, origin: 'file'
            });
        });

        T.test('con modifiche: il programma di adesso, non salvato, con la sua origine', function (assert) {
            var program = Model.createEmptyProgram();
            var doc = newDocument(program);
            program.functions[0].body.push(H.output('"nuovo"'));
            doc.markChanged();
            var copy = doc.sessionCopy(NOW);
            assert.isFalse(copy.saved);
            assert.equal(copy.origin, 'new');
            assert.isTrue(copy.text.indexOf('&quot;nuovo&quot;') !== -1, 'il blocco aggiunto c\'è');
        });
    });
})();
