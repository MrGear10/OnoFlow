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
 * Ogni esempio: { id, titleKey (chiave del catalogo), fileName, text }.
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

    var list = [
        { id: 'somma-massimo-minimo', titleKey: 'examples.sumMaxMin.title', fileName: 'somma-massimo-minimo.fprg', text: SUM_MAX_MIN }
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
