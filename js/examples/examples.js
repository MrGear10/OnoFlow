/*
 * OnoFlow — esempi pronti del menu Esempi (FR-FILE-06).
 *
 * Dipendenze: js/namespace.js.
 * Definisce: OnoFlow.Examples.{list, byId}
 *
 * Da file:// non si possono leggere altri file con fetch (NFR-DIST-04): gli esempi sono
 * stringhe qui dentro. È l'unica copia: i test usano questi stessi testi (L-10).
 * Gli attributi authors, created ed edited hanno valori neutri (NFR-PRIV-05).
 *
 * Ogni esempio: { id, titleKey (chiave del catalogo), fileName, text }. Il primo è il caso di
 * riferimento; gli altri sono esempi brevi da proporre in classe (B6, DEC-070).
 */
(function (OnoFlow) {
    'use strict';

    // Appendice A del documento di progetto: file reale di Flowgorithm 4.2, anonimizzato.
    // È il caso di riferimento di QA-04 e QA-05.
    var SUM_MAX_MIN = [
        '<?xml version="1.0"?>',
        '<flowgorithm fileversion="4.2">',
        '    <attributes>',
        '        <attribute name="name" value="test_per_WebApp"/>',
        '        <attribute name="authors" value="studente"/>',
        '        <attribute name="about" value=""/>',
        '        <attribute name="saved" value="2026-10-10 11:27:35 "/>',
        '        <attribute name="created" value="c3R1ZGVudGU7UEMtTEFCOzIwMjYtMTAtMTA7IjExOjA2OjMwICI7MjIzOQ=="/>',
        '        <attribute name="edited" value="c3R1ZGVudGU7UEMtTEFCOzIwMjYtMTAtMTA7IjExOjI3OjM1ICI7MjsyMzU2"/>',
        '    </attributes>',
        '    <function name="Main" type="None" variable="">',
        '        <parameters/>',
        '        <body>',
        '            <declare name="n, max, min, dim, i" type="Integer" array="False" size=""/>',
        '            <declare name="risultato" type="Integer" array="False" size=""/>',
        '            <declare name="risposta" type="String" array="False" size=""/>',
        '            <assign variable="dim" expression="0"/>',
        '            <assign variable="risultato" expression="0"/>',
        '            <do expression="risposta == &quot;s&quot;">',
        '                <output expression="&quot;Quale numero vuoi sommare?&quot;" newline="True"/>',
        '                <input variable="n"/>',
        '                <assign variable="dim" expression="dim + 1"/>',
        '                <assign variable="risultato" expression="risultato + n"/>',
        '                <output expression="&quot;Vuoi continuare? s/n&quot;" newline="True"/>',
        '                <input variable="risposta"/>',
        '            </do>',
        '            <declare name="numeri" type="Integer" array="True" size="dim"/>',
        '            <for variable="i" start="0" end="dim -1" direction="inc" step="1">',
        '                <output expression="&quot;Inserisci un numero&quot;" newline="True"/>',
        '                <input variable="n"/>',
        '                <assign variable="numeri[i]" expression="n"/>',
        '            </for>',
        '            <assign variable="i" expression="0"/>',
        '            <assign variable="max" expression="numeri[0]"/>',
        '            <assign variable="min" expression="numeri[0]"/>',
        '            <while expression="i&lt;dim">',
        '                <if expression="max &lt; numeri[i]">',
        '                    <then>',
        '                        <assign variable="max" expression="numeri[i]"/>',
        '                    </then>',
        '                    <else/>',
        '                </if>',
        '                <if expression="min &gt; numeri[i]">',
        '                    <then>',
        '                        <assign variable="min" expression="numeri[i]"/>',
        '                    </then>',
        '                    <else/>',
        '                </if>',
        '                <assign variable="i" expression="i + 1"/>',
        '            </while>',
        '            <output expression="&quot;Somma del primo set di numeri: &quot; &amp; risultato" newline="True"/>',
        '            <output expression="&quot;Numero massimo trovato nel secondo set di numeri: &quot; &amp; max" newline="True"/>',
        '            <output expression="&quot;Numero minimo trovato nel secondo set di numeri: &quot; &amp; min" newline="True"/>',
        '        </body>',
        '    </function>',
        '</flowgorithm>',
        ''
    ].join('\n');

    /*
     * Esempi brevi (B6), uno per costrutto: if, for, for con if e Real, accumulo, while, do.
     * Scritti da OnoFlow come un file nuovo (DEC-061): name, authors e about vuoti, saved neutro.
     * Solo operatori sicuri in Flowgorithm (Q-02): mod, ==, >, & invece di %, !=, &&.
     */
    var PARI_DISPARI = [
        '<?xml version="1.0"?>',
        '<flowgorithm fileversion="4.2">',
        '    <attributes>',
        '        <attribute name="name" value="pari_dispari"/>',
        '        <attribute name="authors" value=""/>',
        '        <attribute name="about" value=""/>',
        '        <attribute name="saved" value="2026-10-23 10:00:00 "/>',
        '    </attributes>',
        '    <function name="Main" type="None" variable="">',
        '        <parameters/>',
        '        <body>',
        '            <declare name="n" type="Integer" array="False" size=""/>',
        '            <output expression="&quot;Scrivi un numero intero&quot;" newline="True"/>',
        '            <input variable="n"/>',
        '            <if expression="n mod 2 == 0">',
        '                <then>',
        '                    <output expression="n &amp; &quot; è pari&quot;" newline="True"/>',
        '                </then>',
        '                <else>',
        '                    <output expression="n &amp; &quot; è dispari&quot;" newline="True"/>',
        '                </else>',
        '            </if>',
        '        </body>',
        '    </function>',
        '</flowgorithm>',
        ''
    ].join('\n');

    var TABELLINA = [
        '<?xml version="1.0"?>',
        '<flowgorithm fileversion="4.2">',
        '    <attributes>',
        '        <attribute name="name" value="tabellina"/>',
        '        <attribute name="authors" value=""/>',
        '        <attribute name="about" value=""/>',
        '        <attribute name="saved" value="2026-10-23 10:00:00 "/>',
        '    </attributes>',
        '    <function name="Main" type="None" variable="">',
        '        <parameters/>',
        '        <body>',
        '            <declare name="n, i" type="Integer" array="False" size=""/>',
        '            <output expression="&quot;Di quale numero vuoi la tabellina?&quot;" newline="True"/>',
        '            <input variable="n"/>',
        '            <for variable="i" start="1" end="10" direction="inc" step="1">',
        '                <output expression="n &amp; &quot; x &quot; &amp; i &amp; &quot; = &quot; &amp; n * i" newline="True"/>',
        '            </for>',
        '        </body>',
        '    </function>',
        '</flowgorithm>',
        ''
    ].join('\n');

    var MEDIA = [
        '<?xml version="1.0"?>',
        '<flowgorithm fileversion="4.2">',
        '    <attributes>',
        '        <attribute name="name" value="media"/>',
        '        <attribute name="authors" value=""/>',
        '        <attribute name="about" value=""/>',
        '        <attribute name="saved" value="2026-10-23 10:00:00 "/>',
        '    </attributes>',
        '    <function name="Main" type="None" variable="">',
        '        <parameters/>',
        '        <body>',
        '            <declare name="quanti, i" type="Integer" array="False" size=""/>',
        '            <declare name="numero, somma" type="Real" array="False" size=""/>',
        '            <output expression="&quot;Quanti numeri vuoi inserire?&quot;" newline="True"/>',
        '            <input variable="quanti"/>',
        '            <assign variable="somma" expression="0"/>',
        '            <for variable="i" start="1" end="quanti" direction="inc" step="1">',
        '                <output expression="&quot;Numero &quot; &amp; i" newline="True"/>',
        '                <input variable="numero"/>',
        '                <assign variable="somma" expression="somma + numero"/>',
        '            </for>',
        '            <if expression="quanti &gt; 0">',
        '                <then>',
        '                    <output expression="&quot;Media: &quot; &amp; somma / quanti" newline="True"/>',
        '                </then>',
        '                <else>',
        '                    <output expression="&quot;Nessun numero inserito&quot;" newline="True"/>',
        '                </else>',
        '            </if>',
        '        </body>',
        '    </function>',
        '</flowgorithm>',
        ''
    ].join('\n');

    var FATTORIALE = [
        '<?xml version="1.0"?>',
        '<flowgorithm fileversion="4.2">',
        '    <attributes>',
        '        <attribute name="name" value="fattoriale"/>',
        '        <attribute name="authors" value=""/>',
        '        <attribute name="about" value=""/>',
        '        <attribute name="saved" value="2026-10-23 10:00:00 "/>',
        '    </attributes>',
        '    <function name="Main" type="None" variable="">',
        '        <parameters/>',
        '        <body>',
        '            <declare name="n, i, f" type="Integer" array="False" size=""/>',
        '            <output expression="&quot;Di quale numero vuoi il fattoriale?&quot;" newline="True"/>',
        '            <input variable="n"/>',
        '            <assign variable="f" expression="1"/>',
        '            <for variable="i" start="2" end="n" direction="inc" step="1">',
        '                <assign variable="f" expression="f * i"/>',
        '            </for>',
        '            <output expression="n &amp; &quot;! = &quot; &amp; f" newline="True"/>',
        '        </body>',
        '    </function>',
        '</flowgorithm>',
        ''
    ].join('\n');

    var MCD = [
        '<?xml version="1.0"?>',
        '<flowgorithm fileversion="4.2">',
        '    <attributes>',
        '        <attribute name="name" value="mcd"/>',
        '        <attribute name="authors" value=""/>',
        '        <attribute name="about" value=""/>',
        '        <attribute name="saved" value="2026-10-23 10:00:00 "/>',
        '    </attributes>',
        '    <function name="Main" type="None" variable="">',
        '        <parameters/>',
        '        <body>',
        '            <declare name="a, b, resto" type="Integer" array="False" size=""/>',
        '            <output expression="&quot;Primo numero&quot;" newline="True"/>',
        '            <input variable="a"/>',
        '            <output expression="&quot;Secondo numero&quot;" newline="True"/>',
        '            <input variable="b"/>',
        '            <while expression="b &gt; 0">',
        '                <assign variable="resto" expression="a mod b"/>',
        '                <assign variable="a" expression="b"/>',
        '                <assign variable="b" expression="resto"/>',
        '            </while>',
        '            <output expression="&quot;Massimo comun divisore: &quot; &amp; a" newline="True"/>',
        '        </body>',
        '    </function>',
        '</flowgorithm>',
        ''
    ].join('\n');

    var SOMMA_POSITIVI = [
        '<?xml version="1.0"?>',
        '<flowgorithm fileversion="4.2">',
        '    <attributes>',
        '        <attribute name="name" value="somma_positivi"/>',
        '        <attribute name="authors" value=""/>',
        '        <attribute name="about" value=""/>',
        '        <attribute name="saved" value="2026-10-23 10:00:00 "/>',
        '    </attributes>',
        '    <function name="Main" type="None" variable="">',
        '        <parameters/>',
        '        <body>',
        '            <declare name="n, somma" type="Integer" array="False" size=""/>',
        '            <assign variable="somma" expression="0"/>',
        '            <do expression="n &gt; 0">',
        '                <output expression="&quot;Un numero positivo (0 per finire)&quot;" newline="True"/>',
        '                <input variable="n"/>',
        '                <if expression="n &gt; 0">',
        '                    <then>',
        '                        <assign variable="somma" expression="somma + n"/>',
        '                    </then>',
        '                    <else/>',
        '                </if>',
        '            </do>',
        '            <output expression="&quot;Somma: &quot; &amp; somma" newline="True"/>',
        '        </body>',
        '    </function>',
        '</flowgorithm>',
        ''
    ].join('\n');

    var list = [
        { id: 'somma-massimo-minimo', titleKey: 'examples.sumMaxMin.title', fileName: 'somma-massimo-minimo.fprg', text: SUM_MAX_MIN },
        { id: 'pari-dispari', titleKey: 'examples.evenOdd.title', fileName: 'pari_dispari.fprg', text: PARI_DISPARI },
        { id: 'tabellina', titleKey: 'examples.timesTable.title', fileName: 'tabellina.fprg', text: TABELLINA },
        { id: 'media', titleKey: 'examples.average.title', fileName: 'media.fprg', text: MEDIA },
        { id: 'fattoriale', titleKey: 'examples.factorial.title', fileName: 'fattoriale.fprg', text: FATTORIALE },
        { id: 'mcd', titleKey: 'examples.gcd.title', fileName: 'mcd.fprg', text: MCD },
        { id: 'somma-positivi', titleKey: 'examples.sumPositive.title', fileName: 'somma_positivi.fprg', text: SOMMA_POSITIVI }
    ];

    function byId(id) {
        for (var i = 0; i < list.length; i++) {
            if (list[i].id === id) {
                return list[i];
            }
        }
        return null;
    }

    OnoFlow.Examples = { list: list, byId: byId };
})(window.OnoFlow);
