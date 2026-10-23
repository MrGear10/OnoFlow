# OnoFlow — Registro delle decisioni

Decisioni prese durante lo sviluppo che non erano nel [documento di progetto](OnoFlow_progetto.md) o che ne cambiano un punto. Ogni voce indica il passo in cui è stata presa, chi l'ha decisa e quali sezioni del documento tocca. Le voci non si cancellano: una decisione superata si marca come tale e si rimanda a quella nuova.

| Campo | Significato |
|---|---|
| **Decisa da** | *Autore*: scelta tra opzioni proposte. *Sviluppo*: scelta tecnica minore presa durante l'implementazione, che l'autore può rivedere |

---

## DEC-001 — Il meno davanti ai letterali

- **Passo:** prima del passo 1 · **Decisa da:** autore · **Tocca:** §6.2, §6.3
- **Problema:** la §6.2 diceva che il meno davanti a un letterale fa parte del letterale; con quella regola `-2 ^ 2` varrebbe `4`, mentre la §6.3 vuole `-4`.
- **Decisione:** il `-` è sempre un operatore unario. Solo il letterale `2147483648`, quando è operando diretto di un meno unario, supera il controllo di intervallo, così `-2147483648` resta accettato.
- **Conseguenze:** `-2 ^ 2` → `-4`; `dim -1` resta una sottrazione (L-13).

## DEC-002 — A capo e BOM nel round-trip

- **Passo:** prima del passo 1 · **Decisa da:** autore · **Tocca:** FMT-W-01, FR-FILE-03
- **Problema:** FMT-W-01 imponeva LF; se Flowgorithm scrive CRLF o il BOM (Q-05 aperta), il round-trip a testo identico sarebbe impossibile.
- **Decisione:** all'import si rilevano tipo di a capo, BOM e a capo finale, e l'export li riproduce. I file nuovi seguono FMT-W-01 (LF, senza BOM, con a capo finale).

## DEC-003 — Scrittura dei blocchi non modificati

- **Passo:** prima del passo 1 · **Decisa da:** autore · **Tocca:** FMT-W-05, FR-FILE-09
- **Decisione:** gli elementi XML si rigenerano sempre dal modello secondo la §7.6; le espressioni restano col testo originale. Non si conserva il testo sorgente degli elementi.
- **Rischio accettato:** se Flowgorithm scrive un elemento in una forma diversa da quella prevista, il round-trip non sarà identico; QA-05 lo segnala e si corregge la §7.6.

## DEC-004 — Funzioni, `call` e `comment` nella fase 1

- **Passo:** prima del passo 1 · **Decisa da:** autore · **Tocca:** §7.4, FMT-R-04, FR-EDIT-10, FR-EDIT-11, §8.3
- **Decisione:** nella fase 1 un file con funzioni, `call` o `comment` nel formato presunto della §7.4 si carica, si disegna e si esegue, con l'avviso `WARN_LOAD_UNVERIFIED_FORMAT` (una volta per file). L'editor modifica solo `Main` e i blocchi della §7.3.

## DEC-005 — Strumenti di verifica in `tools/`

- **Passo:** prima del passo 1 · **Decisa da:** autore · **Tocca:** NFR-DIST-02, QA-09, QA-15
- **Decisione:** la cartella `tools/` ha un proprio `package.json` con Playwright, usato solo per le verifiche automatiche. `tools/node_modules/` è escluso da git. L'app e `tests.html` non dipendono da nulla in `tools/`.
- **Uso:** `cd tools && npm install && npx playwright install && node run-tests.mjs`.

## DEC-006 — Registro delle decisioni in un file separato

- **Passo:** prima del passo 1 · **Decisa da:** autore · **Tocca:** §0
- **Decisione:** il registro è questo file; il documento di progetto lo richiama.

## DEC-007 — Comportamento del runner dei test

- **Passo:** 1 · **Decisa da:** sviluppo · **Tocca:** QA-01
- **Decisione:**
  - un test che non esegue nessuna asserzione **fallisce**: non potrebbe mai fallire e di solito nasconde una promessa non restituita;
  - un test è asincrono se restituisce una promessa; limite di tempo predefinito 2 secondi, modificabile per test (`{ timeout: ms }`);
  - i test girano uno alla volta, nell'ordine in cui sono definiti; ogni 50 ms il runner restituisce il controllo al browser;
  - il filtro si passa con `?filtro=testo` e cerca, senza distinguere maiuscole, in "suite › test"; i test esclusi risultano *saltati*;
  - `throws`/`rejects` accettano come secondo argomento un costruttore di errore, un predicato o un oggetto da confrontare campo per campo (es. `{ code: 'ERR_DIVISION_BY_ZERO' }`);
  - le suite non si annidano.
- **Limite noto:** un ciclo infinito **sincrono** dentro un test blocca la pagina: JavaScript non può interromperlo dall'esterno. La protezione di QA-10 sta nell'esecuzione sincrona dell'interprete (limite di passi e di tempo), al passo 5.

## DEC-008 — Modalità dimostrazione della pagina dei test

- **Passo:** 1 · **Decisa da:** sviluppo · **Tocca:** QA-01, verifica del passo 1
- **Decisione:** `tests.html?dimostrazione` carica in più `tests/framework/demo-failures.js` (test che falliscono di proposito in ogni modo previsto) e uno script inesistente, per vedere come la pagina mostra i problemi senza modificare il codice.

## DEC-009 — Oggetto globale del framework di test

- **Passo:** 1 · **Decisa da:** sviluppo · **Tocca:** §10.1
- **Decisione:** il framework di test vive in `window.OnoFlowTest`, separato da `window.OnoFlow`, perché `index.html` non lo carica mai. La pagina dei test usa anche `window.OnoFlowTestBoot` per raccogliere gli script non caricati prima che il framework esista.

## DEC-010 — Testi della pagina dei test

- **Passo:** 1 · **Decisa da:** sviluppo · **Tocca:** NFR-I18N-01
- **Decisione:** `tests.html` è uno strumento per chi sviluppa, non parte dell'interfaccia: i suoi testi sono in italiano direttamente nel codice e non passano dal catalogo.

## DEC-011 — `Random` sostituibile nei test

- **Passo:** prima del passo 1 (si applica al passo 5) · **Decisa da:** sviluppo · **Tocca:** §6.9
- **Decisione:** l'interprete riceve la sorgente casuale come opzione; l'app usa `Math.random`, i test una sequenza nota.

## DEC-012 — Un branch per passo

- **Passo:** 1 · **Decisa da:** sviluppo
- **Decisione:** ogni passo si sviluppa su un branch `fase1/passo-NN`, con un commit a fine passo.

## DEC-013 — Struttura dei cataloghi e del modulo dei numeri

- **Passo:** 2 · **Decisa da:** sviluppo · **Tocca:** NFR-I18N-03, NFR-I18N-04, §10.2
- **Decisione:** un catalogo è `{ name, number: { decimalSeparator, inputDecimalSeparators }, messages }`, in `js/i18n/catalog.<lingua>.js`, e si registra con `OnoFlow.Localization.registerCatalog`. Le chiavi sono piatte con i punti (`ERR_INPUT_NOT_CONVERTIBLE.decimal`). Il modulo dei numeri è `OnoFlow.NumberFormat` e riceve il formato numerico come argomento, così non dipende dalla localizzazione.
- **Motivazione:** ogni modulo si prova da solo; aggiungere una lingua = aggiungere un file.

## DEC-014 — Parametri dei messaggi

- **Passo:** 2 · **Decisa da:** sviluppo · **Tocca:** NFR-I18N-02, QA-07
- **Decisione:** i parametri si inseriscono con `String()`; chi chiama passa i numeri già formattati quando serve il separatore della lingua. Un parametro mancante lascia `{nome}` visibile nel testo.
- **Motivazione:** un segnaposto rimasto si vede e i test (QA-07) lo trovano; un testo vuoto passerebbe inosservato.

## DEC-015 — Chiave più specifica tra lingua attiva e italiano

- **Passo:** 2 · **Decisa da:** sviluppo · **Tocca:** §8.2, NFR-I18N-05
- **Decisione:** per un errore si prova ogni chiave, dalla più specifica, prima nella lingua attiva e poi in italiano; vince la prima trovata. Un messaggio specifico in italiano batte quindi uno generico nella lingua attiva. `type` senza `reason` non sceglie una chiave (la §8.2 elenca solo `CODICE.reason.type` → `CODICE.reason` → `CODICE`).
- **Motivazione:** con NFR-I18N-06 i cataloghi hanno le stesse chiavi, quindi il caso si presenta solo con un catalogo incompleto; meglio il messaggio più preciso.

## DEC-016 — Forma degli errori di input

- **Passo:** 2 · **Decisa da:** sviluppo · **Tocca:** §6.11, §8.3
- **Decisione:** `parseInput` restituisce `{ ok: true, value }` oppure `{ ok: false, error: { code: 'ERR_INPUT_NOT_CONVERTIBLE', params: { reason, type, text } } }`, con `text` esattamente come digitato. L'interprete aggiunge `nodeId`. Un `Boolean` non valido ha `reason` `format`.

## DEC-017 — `"2,5"` per un `Integer` nelle lingue col punto

- **Passo:** 2 · **Decisa da:** sviluppo · **Tocca:** §6.11
- **Decisione:** nelle lingue con il solo punto come separatore, `"2,5"` per un `Integer` è errore `format` (la virgola lì non è un separatore decimale), non `decimal`.

## DEC-018 — Arrotondamento di `ToFixed`

- **Passo:** 2 · **Decisa da:** sviluppo · **Tocca:** §6.9
- **Decisione:** `ToFixed` usa lo stesso arrotondamento dell'output (rappresentazione più corta, metà lontano dallo zero) e non scrive mai `-0` (`ToFixed(-0.001, 2)` → `"0,00"`). Un numero di cifre fuori da 0–15 è un errore che l'interprete trasformerà in `ERR_BUILTIN_ARGUMENT` (passo 5).
- **Da verificare:** il comportamento di Flowgorithm (Q-09).

## DEC-019 — Spazi ai bordi dell'input

- **Passo:** 2 · **Decisa da:** sviluppo · **Tocca:** §6.11
- **Decisione:** si tolgono con `String.prototype.trim`, quindi anche tabulazioni, a capo e spazio non separabile. Le stringhe (`String`) restano esattamente come digitate.

## DEC-020 — Forma dell'AST e operatori canonici

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** §6.3, §8.4, §10.2
- **Decisione:** nodi `literal` (con `type`, `value` e `text` originale), `variable`, `index`, `call`, `unary`, `binary`, più `nameList` e `name` per i campi dei nomi; ogni nodo ha `start`/`end` nel testo. Gli operatori sono canonici: `==` (per `=`), `!=` (per `<>`), `and`, `or`, `not`, `mod`. Le parentesi non producono nodi. `Expressions.describe(ast)` dà la forma canonica completamente parentesizzata, usata dai test e, in seguito, dai messaggi.

## DEC-021 — Tipi di campo e variabile del `for`

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** §6.5, §6.7, §7.3, §8.3
- **Decisione:** cinque tipi di campo: `expression`, `target` (nome o `nome[espr]`), `nameList`, `name` (un solo nome, per la variabile del `for` e in futuro per funzioni e parametri), `forStep`. Un errore nel campo `name` usa `ERR_INVALID_NAME`, con i motivi `keyword` e `indexed` (`i[0]` come variabile del `for`).

## DEC-022 — Forma e ordine degli errori di sintassi

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** §8.2
- **Decisione:** `{ code, params, position: { start, end, column } }`, con `start`/`end` in unità del testo JavaScript e `column = start + 1`. Si riporta il primo errore nell'ordine di lettura: il lexer si ferma al primo carattere sbagliato e il parser lo incontra solo quando ci arriva, quindi un errore di sintassi prima di quel punto ha la precedenza.
- **Esempio:** in `(a + 2x` l'errore è `2x`, non la parentesi non chiusa.

## DEC-023 — Annidamento massimo: `ERR_SYNTAX_TOO_COMPLEX`

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** §8.3, NFR-PERF-03
- **Decisione:** oltre 100 livelli di annidamento (parentesi, segni, operatori) l'analisi si ferma con il nuovo codice `ERR_SYNTAX_TOO_COMPLEX`.
- **Motivazione:** un testo patologico in un file (migliaia di parentesi) esaurirebbe lo stack e bloccherebbe il caricamento.

## DEC-024 — Riconoscimento degli errori tipici (§8.4)

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** §8.4
- **Decisione:** i suggerimenti si esprimono con `params.reason`:
  - `ERR_SYNTAX_UNEXPECTED_CHARACTER`: `singleQuote`, `typographicQuote`, `accentedLetter`, `invisible`;
  - `ERR_SYNTAX_INVALID_NUMBER`: `leadingPoint` (`.5`), `trailingPoint` (`5.`), `exponent` (`1e3`), `missingOperator` (`2x`), con `suggestion`; `1.2.3` resta generico;
  - `ERR_SYNTAX_UNEXPECTED_TOKEN`: `decimalComma` solo se numero, virgola e intero sono attaccati (`2,5`, non `2, 5` né `f(2,5)`); `keywordCase` se il token inatteso, o quello prima, è una parola chiave con le maiuscole (`AND`, `NOT a`);
  - `ERR_SYNTAX_INVALID_INDEX`: `nested` (`a[i][j]`, `f(x)[0]`), `empty` (`a[]`), `multiple` (`a[1, 2]`).
- `x = True` non è un errore di sintassi (`True` è un nome): il suggerimento resta alla D-06, fase 2.
- Un test verifica che ogni motivo abbia un proprio messaggio nel catalogo.

## DEC-025 — Spazi ammessi nelle espressioni

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** §6.2
- **Decisione:** separano i token solo spazio, tabulazione, CR e LF. Gli spazi speciali (non separabile, a larghezza zero, BOM) sono errore con il motivo `invisible`.
- **Motivazione:** principio di prudenza (Flowgorithm potrebbe rifiutarli) e messaggio chiaro per un errore invisibile.

## DEC-026 — Identificativi e campi del modello

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** §10.2, §10.3, FR-VIEW-02
- **Decisione:** gli ID sono `n1`, `n2`, ... da un contatore unico per la sessione: restano validi anche tra programmi diversi e dopo annulla/ripeti, perché i comandi conserveranno gli oggetti. Ogni campo si analizza alla creazione e quando cambia (`setFieldText`), conservando il testo anche con errore. La dimensione di una dichiarazione conta solo se `array` è vero. Il passo di un `for` nuovo vale `1`; gli altri campi di un blocco nuovo sono vuoti finché non si decide D-09.
- **Rinviato:** i controlli statici che non sono di sintassi (dichiarazioni e funzioni duplicate, firma di `Main`, blocchi `call` senza chiamata) si fanno al passo 5, insieme all'interprete.

## DEC-027 — Ordine dei blocchi

- **Passo:** 3 · **Decisa da:** sviluppo · **Tocca:** FR-RUN-02, L-12
- **Decisione:** "ordine dei blocchi" = funzioni nell'ordine del file, e in ciascuna i blocchi in ordine di lettura: prima il blocco, poi i suoi figli, `then` prima di `else`. Gli errori si raccolgono in quest'ordine, campo per campo nell'ordine della definizione del blocco.

## DEC-028 — Interfaccia del modulo del formato

- **Passo:** 4 · **Decisa da:** sviluppo · **Tocca:** §10.2, FR-FILE-04
- **Decisione:** `OnoFlow.Format.importFprg(testo)` restituisce `{ ok: true, program, format, warnings }` oppure `{ ok: false, error, warnings }`; `exportFprg(program, { format, now })` restituisce il testo. `format` = `{ newline, bom, finalNewline }` descrive come era scritto il file e resta fuori dal modello: l'applicazione lo conserva accanto al programma aperto. L'import non ha effetti collaterali, quindi un file che non si apre lascia intatto quello aperto (FR-FILE-04). Lo schema degli attributi dei blocchi (`BLOCK_SCHEMA`) è unico per lettura e scrittura.

## DEC-029 — Avviso per gli elementi da verificare: uno per tipo

- **Passo:** 4 · **Decisa da:** sviluppo · **Tocca:** DEC-004, §7.4
- **Decisione:** affina DEC-004 ("una volta per file"): `WARN_LOAD_UNVERIFIED_FORMAT` compare una volta per tipo di elemento presunto (`comment`, `call`, `function`, `parameter`), con il nome dell'elemento nel messaggio. Una `function` conta come presunta se non è `Main` senza tipo e senza variabile di ritorno. I tipi `Real` e `Boolean`, pur elencati nella §7.4, non danno avviso: sono i nomi dei tipi in Flowgorithm ed è molto probabile che siano scritti così; un avviso su quasi ogni file sarebbe rumore.
- **Motivazione:** dire allo studente quale elemento controllare.

## DEC-030 — `fileversion` mancante

- **Passo:** 4 · **Decisa da:** sviluppo · **Tocca:** FMT-R-06
- **Decisione:** un file senza `fileversion` si carica con `WARN_LOAD_UNSUPPORTED_VERSION` e versione vuota. L'export scrive sempre `fileversion="4.2"` (FMT-W-01).

## DEC-031 — Elementi e attributi obbligatori

- **Passo:** 4 · **Decisa da:** sviluppo · **Tocca:** §7.3, §7.5
- **Decisione:** `<attributes>` può mancare (nessun attributo). Tutto il resto della §7.3 è obbligatorio: in `<function>` `name`, `type`, `variable`, `<parameters>` e `<body>`; in ogni blocco tutti i suoi attributi; in `<if>` `<then>` ed `<else>`. Un elemento dentro un blocco che non ne prevede (es. `<input>`) è un elemento sconosciuto.

## DEC-032 — File troppo grande: `ERR_LOAD_FILE_TOO_LARGE`

- **Passo:** 4 · **Decisa da:** sviluppo · **Tocca:** NFR-PERF-02, §8.3
- **Decisione:** nuovo codice `ERR_LOAD_FILE_TOO_LARGE` (`params.max` = 5). L'import controlla la lunghezza del testo in caratteri; l'interfaccia (passo 6) controllerà anche la dimensione in byte prima di leggere il file.

## DEC-033 — Attributo `saved`

- **Passo:** 4 · **Decisa da:** sviluppo · **Tocca:** FMT-W-06, §7.2
- **Decisione:** `saved` si scrive nell'ora locale del dispositivo, formato `AAAA-MM-GG hh:mm:ss ` con lo spazio finale, e solo se il file lo aveva già. Per i file nuovi decide D-01 (prima del passo 8). `created` ed `edited` non si generano mai (FMT-W-07).

## DEC-034 — Dimensione delle variabili semplici

- **Passo:** 4 · **Decisa da:** sviluppo · **Tocca:** FMT-R-07
- **Decisione:** per una dichiarazione con `array="False"` l'export scrive sempre `size=""`, anche se nel modello è rimasto un testo (per esempio dopo aver tolto la spunta "array" nell'editor). All'import, una dimensione su una variabile semplice dà `WARN_LOAD_IGNORED_SIZE` e si azzera.

## DEC-035 — Casi di round-trip non identico accettati

- **Passo:** 4 · **Decisa da:** sviluppo · **Tocca:** FR-FILE-03, Q-05, Q-06
- **Decisione:** il round-trip è identico per i file scritti come il campione. Non lo è, ed è accettato, quando il file ha: una dichiarazione XML diversa da `<?xml version="1.0"?>` (es. con `encoding`); `fileversion` diverso da `4.2`; a capo o tabulazioni letterali dentro un attributo (il parser XML li trasforma in spazi; Flowgorithm presumibilmente scrive `&#10;`); attributi sconosciuti; `size` su una variabile semplice. Se un file reale di Flowgorithm rientra in uno di questi casi, si rivede la §7.6.

## DEC-036 — Esempi incorporati

- **Passo:** 4 · **Decisa da:** sviluppo · **Tocca:** FR-FILE-06, NFR-DIST-04, L-10
- **Decisione:** gli esempi stanno in `js/examples/examples.js` (`OnoFlow.Examples`), ciascuno con `id`, chiave del titolo nel catalogo, nome del file e testo. Per ora c'è solo l'Appendice A ("Somma, massimo e minimo"); gli altri dipendono da B6. I test usano questi testi, senza copie.

## DEC-037 — Caratteri speciali nel codice sorgente

- **Passo:** 4 · **Decisa da:** sviluppo · **Tocca:** NFR-CODE-01
- **Decisione:** nel codice, caratteri invisibili o facili da confondere (BOM, spazi speciali, virgolette tipografiche) si scrivono come sequenze `\uXXXX`, mai letterali. Le virgolette « » nei testi del catalogo sono invece testo dell'interfaccia e restano letterali. Corretto al passo 4 anche il codice dei passi precedenti.

## DEC-038 — Controlli statici della fase 1

- **Passo:** 5 · **Decisa da:** sviluppo · **Tocca:** §8.1, FR-RUN-02, DEC-026
- **Decisione:** `OnoFlow.StaticCheck.check(program)` restituisce tutti gli errori che impediscono l'esecuzione, per funzione: prima quelli della funzione (nome non valido, `ERR_FUNCTION_NAME_RESERVED`, `ERR_DUPLICATE_FUNCTION`, `ERR_MAIN_SIGNATURE`, nomi di parametri e variabile di ritorno), poi quelli dei blocchi nell'ordine di DEC-027 (sintassi, `ERR_DUPLICATE_DECLARATION` anche per un nome ripetuto nello stesso blocco o per un parametro ridichiarato, `ERR_CALL_BLOCK_NOT_CALL`). `Main` non si può chiamare (`ERR_UNKNOWN_FUNCTION`).

## DEC-039 — Valori ed errori durante l'esecuzione

- **Passo:** 5 · **Decisa da:** sviluppo · **Tocca:** §6.1, §8.2, FR-ERR-03
- **Decisione:** un valore è `{ type, value }`; un array `{ type, array: true, elements }` con `undefined` per gli elementi non inizializzati. Un errore di runtime è `{ code, params, nodeId, functionName, variables }`, dove `variables` è la fotografia delle variabili della funzione in esecuzione, nell'ordine in cui sono state dichiarate. Gli errori sugli argomenti sono del blocco chiamante; quelli sul valore di ritorno (`ERR_RETURN_*`) della funzione chiamata, con le sue variabili.

## DEC-040 — Valore non valido nella console: si richiede

- **Passo:** 5 · **Decisa da:** sviluppo, **confermata dall'autore (DEC-049)** · **Tocca:** §6.11, §8.1, FR-CON-02
- **Problema:** la §8.1 elenca "input non convertibile" tra gli errori di runtime, ma non dice se l'esecuzione si ferma.
- **Decisione provvisoria:** la console mostra l'errore e chiede di nuovo il valore (l'evento `input` porta l'errore del tentativo precedente). L'interprete ha anche la modalità `invalidInput: 'error'`, che ferma l'esecuzione con `ERR_INPUT_NOT_CONVERTIBLE`.
- **Motivazione:** uno studente che scrive `2,5` per un `Integer` dovrebbe poter correggere senza rifare tutti gli input precedenti.

## DEC-041 — Interprete a trampolino

- **Passo:** 5 · **Decisa da:** sviluppo · **Tocca:** §10.3, §6.8
- **Problema:** con `yield*` ogni chiamata annida circa dieci generatori e ogni ripresa attraversa tutta la catena: lo stack del motore si esauriva verso i 470 livelli di ricorsione, sotto i 1000 richiesti.
- **Decisione:** i generatori dell'interprete cedono il sotto-generatore (`yield this.evaluate(...)`) invece di delegarlo; un motore (`trampoline`) tiene la pila in un array e passa valori ed eccezioni. Il codice dell'interprete resta uguale, lo stack nativo costante, il costo di un passo non dipende dalla profondità.
- **Misura:** circa un milione di passi al secondo su un computer da laboratorio.

## DEC-042 — Tempo massimo per turno e Ferma

- **Passo:** 5 · **Decisa da:** sviluppo · **Tocca:** §10.3, FR-RUN-01, NFR-PERF-01, NFR-PERF-04
- **Decisione:** oltre al budget di 10.000 passi, un turno finisce dopo circa 25 ms (l'orologio si legge ogni 256 passi): su un telefono lento 10.000 passi possono durare 50–100 ms. Ferma fa entrare `ERR_STOPPED` nel generatore nel punto in cui era fermo, quindi l'errore ha blocco e variabili. Pausa non ha effetto mentre si attende un input.

## DEC-043 — Passi e commenti

- **Passo:** 5 · **Decisa da:** sviluppo · **Tocca:** §10.3, FR-RUN-05
- **Decisione:** un passo prima di ogni blocco eseguibile. `while` e `for`: la prima verifica della condizione usa il passo del blocco, le successive ne cedono uno nuovo; `do`: un passo prima di ogni verifica, dopo il corpo. I commenti non si eseguono e non consumano passi (il passo-passo della fase 2 non si fermerà sui commenti).

## DEC-044 — Cortocircuito e tipi

- **Passo:** 5 · **Decisa da:** sviluppo · **Tocca:** §6.4
- **Decisione:** con `and`/`or` cortocircuitati, il secondo operando non valutato non si controlla: `true or 1` vale `true`. Lo troverà l'analisi statica dei tipi (FR-ERR-06, fase 2).

## DEC-045 — Dettagli delle funzioni predefinite

- **Passo:** 5 · **Decisa da:** sviluppo, **da verificare con Flowgorithm (Q-09)** · **Tocca:** §6.9
- **Decisione:**
  - `Len`, `Char` contano le unità di testo di JavaScript (un'emoji può valere 2);
  - `ToChar` accetta codici da 0 a 1.114.111 tranne 55.296–57.343 (surrogati); `ToCode` restituisce il codice del primo carattere;
  - `Random(n)` = `floor(random() * n)`;
  - `Int` di un valore fuori dagli `Integer` è `ERR_INTEGER_OVERFLOW`;
  - argomenti numerici di tipo sbagliato: `ERR_ARGUMENT_TYPE` con motivo `number`; `Size` vuole il nome di un array (`ERR_ARRAY_ARGUMENT`);
  - `ToInteger`/`ToReal` usano le regole dell'input; un errore è `ERR_CONVERSION_FAILED` con lo stesso motivo (`empty`, `format`, `decimal`, `range`);
  - `ERR_BUILTIN_ARGUMENT` ha i motivi `position`, `random`, `charCode`, `empty`, `digits`.

## DEC-046 — Motivi specifici degli errori sugli operatori

- **Passo:** 5 · **Decisa da:** sviluppo · **Tocca:** §8.4
- **Decisione:** `ERR_BINARY_OPERATOR_TYPES` con motivo `stringPlus` (`"a" + "b"`: "per unire testi usa &") e `booleanOrder` (`true < false`); `ERR_UNARY_OPERATOR_TYPE` con motivo `not` (`not x > 5`: "usa le parentesi"); `ERR_ASSIGN_TYPE` con motivo `realToInteger` ("/ dà sempre un Real; usa Int(...)"); `ERR_UNINITIALIZED_VARIABLE` con motivo `element` per gli elementi di array; `ERR_FOR_VARIABLE_TYPE` con motivo `array`.

## DEC-047 — Esecuzione sincrona per i test

- **Passo:** 5 · **Decisa da:** sviluppo · **Tocca:** §10.3, QA-10
- **Decisione:** `Interpreter.runSync(program, inputs, { maxSteps, maxMs, ... })` restituisce `{ status, output, error, errors, steps }`. `output` è il testo della console con gli input digitati seguiti da un a capo. Oltre a `done`, `error`, `invalid`: `limit` (troppi passi), `timeout` (troppo tempo, controllato ogni 1000 passi), `waitingInput` (input finiti).
- **Limite noto:** un difetto dell'interprete che giri senza produrre passi non si può interrompere; la verifica automatica (`tools/run-tests.mjs`) lo segnala con il suo timeout di 60 secondi.

## DEC-048 — Conteggio della ricorsione

- **Passo:** 5 · **Decisa da:** sviluppo · **Tocca:** §6.8, NFR-PERF-02
- **Decisione:** il limite di 1000 conta le chiamate di funzioni utente annidate, senza `Main`: `Giu(999)` (1000 chiamate) va bene, `Giu(1000)` no. Se il motore esaurisse comunque lo stack, l'errore è `ERR_RECURSION_LIMIT`; gli altri `RangeError` sono difetti interni (`ERR_INTERNAL`).

## DEC-049 — Decisioni dell'autore prima del passo 5b

- **Passo:** prima del passo 5b · **Decisa da:** autore (proposte consigliate approvate in blocco) · **Tocca:** §5.9, §6.11, §11, FR-CON-03, FR-FILE-06
- **DEC-040 confermata:** con un valore non valido nella console si mostra l'errore e si richiede il valore.
- **B1:** il divieto di finestre modali vale per esecuzione e console. La modifica di un blocco avviene in un pannello (a tutto schermo sul telefono); le conferme, come "modifiche non salvate", sono barre in linea non bloccanti.
- **B2:** il nome di un file nuovo si sceglie in un campo nella barra superiore, con valore iniziale `diagramma.fprg`.
- **B3:** sul telefono un tocco seleziona il blocco e mostra "Modifica" e "Inserisci dopo"; un secondo tocco apre la modifica.
- **B4a:** solo font di sistema (NFR-PRIV-02).
- **B4b:** si parte dalla metafora della classe (quaderno a quadretti, lavagna, penna rossa, evidenziatore) in versione sobria, rifinita con le skill di design.
- **B5:** la verifica di FR-MOB-03 (blocco dell'errore inquadrato) si sposta al passo 7.
- **B6:** lo sviluppo scrive 5–6 esempi brevi (es. pari/dispari, tabellina, media, fattoriale) da sottoporre all'autore.
- **D-11:** sul telefono due schede in basso, Diagramma e Console; all'avvio dell'esecuzione si passa da soli alla console.
- **D-12:** tastiera normale per gli input della console (la tastiera numerica di iOS spesso non ha il meno né la virgola).
- **D-13:** versioni minime iOS/iPadOS 15.4 e Chrome per Android delle ultime 3 versioni circa.

## DEC-050 — Priorità d'uso e tono dei testi

- **Passo:** 5b · **Decisa da:** autore · **Tocca:** §4, §9.5, §11.1, PRODUCT.md
- **Priorità:** quando le esigenze sono in conflitto vince il **docente al proiettore**: leggibilità a distanza e contrasto prima di tutto.
- **Tono:** i testi dell'interfaccia e i messaggi sono **impersonali**, senza "tu" (es. "Per unire testi si usa &", non "usa &").
- **Conseguenza:** i messaggi già nel catalogo, scritti con il "tu" nei passi 2–5, vanno riscritti in forma impersonale. Fatto all'inizio del passo 6: 26 messaggi riscritti, §8.4 del documento di progetto allineata (v1.11), e un test in `tests/localization.test.js` che segnala le forme con il "tu" non ambigue (pronomi, "hai", "puoi", imperativi in -ere/-ire, "usa" non preceduto da "si", imperativi con il pronome attaccato). "controlla" e "indica" restano fuori dal controllo perché possono essere una terza persona.

## DEC-051 — Direzione visiva

- **Passo:** 5b · **Decisa da:** autore, sulla pagina di decisione della skill impeccable · **Tocca:** §11.2
- **Decisione:** quaderno a quadretti e lavagna, sobri, con la grammatica degli stati della segnaletica stradale: ogni stato ha un segno con un solo significato. Penna rossa solo per gli errori, evidenziatore giallo solo per il blocco in esecuzione, inchiostro blu per i blocchi, console come ardesia con il gesso. Linee a un pixel, niente gradienti, ombre o rilievi; quadretti tenui e contenuto al massimo contrasto. Da evitare: aria da giocattolo e metafora spinta fino al costume.
- **Aggiornata da DEC-071:** `.impeccable/` non è più nel repository pubblico, quindi `.nojekyll` si usa.
- **Dove:** `PRODUCT.md` (verità di prodotto) e `.impeccable/surfaces/index-html.md` (contratto della direzione per la superficie dell'app, solo in locale). `DESIGN.md` si scrive alla fine del passo 6, dal costruito, dopo la revisione finale.
- **Vincolo di pubblicazione:** il contratto della direzione non deve essere servito con l'app. GitHub Pages, con Jekyll attivo come da impostazione predefinita, non pubblica le cartelle che iniziano con il punto: per questo **non si aggiunge un file `.nojekyll`** al repository. Da ricontrollare prima della pubblicazione.

## DEC-052 — Schema testuale del diagramma fino al renderer

- **Superata al passo 7** da DEC-057 e DEC-058: lo schema è sostituito dal disegno SVG.

- **Passo:** 6 · **Decisa da:** autore (proposta consigliata) · **Tocca:** §5.2, FR-VIEW-02, FR-VIEW-03
- **Decisione:** fino al renderer SVG (passo 7) la zona del diagramma mostra un elenco rientrato sul foglio a quadretti: una riga per blocco, con la forma del suo tipo, il testo come è scritto e l'ID in `data-id`. Evidenziatore e penna rossa funzionano già, con la sottolineatura nel punto esatto dei campi (`js/ui/diagram-outline.js`). Il do si mostra su due righe (`do` in alto, `while …` in fondo).
- **Perché:** esecuzione ed errori si verificano già al passo 6; al passo 7 si sostituisce solo il disegno, collegato agli stessi ID.
- **Conseguenza:** l'invito "Toccare la freccia per inserire il primo blocco" (contratto della direzione) arriva con l'editor (passo 9). Per ora il diagramma vuoto rimanda al menu, perché la freccia non è ancora attiva.

## DEC-053 — Testi dei blocchi e dei comandi nel catalogo

- **Passo:** 6 · **Decisa da:** sviluppo · **Tocca:** NFR-I18N-01, NFR-I18N-02, DEC-050
- **Decisione:** il testo di ogni tipo di blocco viene da un modello del catalogo (`'block.input': 'Input {variable}'`); i segnaposto con il nome di un campo diventano parti che portano il testo e l'errore del campo (`js/ui/block-text.js`). L'HTML non contiene testi: gli elementi hanno `data-i18n` e `data-i18n-label`.
- **Comandi:** i nomi dei comandi (Nuovo, Apri, Salva, Esegui, Pausa, Riprendi, Ferma, Annulla, Ripeti, Continua, Chiudi) restano all'imperativo, come nella §11.1: sono etichette di azioni, non frasi rivolte allo studente. Il test sul "tu" (DEC-050) li esclude per nome.

## DEC-054 — Comandi del passo 6

- **Passo:** 6 · **Decisa da:** sviluppo · **Tocca:** §11.1, FR-FILE-02, FR-FILE-07, FR-MOB-10
- **Barra:** OnoFlow, nome del file (B2) con "Non salvato", stato dell'esecuzione, Esegui, Pausa/Riprendi, Ferma, Menu. Nel menu: Nuovo, Apri…, Salva; Esempi; Annulla e Ripeti, disabilitati fino al passo 12. Sotto i 27,5rem Pausa e Ferma mostrano solo l'icona, con il nome per i lettori di schermo.
- **Nuovo:** disponibile già ora (`Main` vuota). Senza editor non ci sono modifiche, quindi non serve ancora l'avviso di FR-FILE-08 (passo 8). Un diagramma nuovo salvato ha `<attributes/>` (FMT-W-11): gli attributi di un file nuovo restano D-01, da decidere prima del passo 8.
- **Salvataggio:** download con tipo `application/octet-stream`, perché su iOS il file arrivi con il nome e l'estensione `.fprg` (FR-MOB-20). Va verificato su un iPhone.
- **Durante l'esecuzione** Nuovo, Apri ed Esempi sono disabilitati; Salva e il nome del file restano attivi.

## DEC-055 — Stati dell'esecuzione come segni

- **Passo:** 6 · **Decisa da:** sviluppo · **Tocca:** FR-RUN-01, DEC-051
- **Decisione:** lo stato accanto al nome del file ha un segno per significato: quadrato giallo per "In esecuzione", quadrato vuoto per "In pausa", lavagna con il gesso per "In attesa di un valore", cerchio rosso solo per gli errori ("Terminato con un errore", "Non eseguito"), quadrato pieno d'inchiostro per "Terminato". "Fermato" non è un errore: niente penna rossa.
- **Pulsanti:** premuto pieno, focus come due parentesi quadre, disabilitato barrato (contratto della direzione).

## DEC-056 — Verifica automatica della pagina

- **Passo:** 6 · **Decisa da:** sviluppo · **Tocca:** QA-09, QA-14, DEC-005
- **Decisione:** `tools/check-ui.mjs` apre `index.html` da `file://` in Chromium e Firefox, a 1440 × 900, 360 × 640 e 375 × 667. Verifica che non ci sia scorrimento orizzontale e prova questi percorsi: esempio, esecuzione con gli input di QA-04, console in primo piano sul telefono, salvataggio, file non valido, ripristino dopo il ricaricamento, menu da tastiera, ciclo infinito con la pausa dopo 5 secondi. Non sostituisce la prova su telefoni veri: tastiera, aree sicure e download su iOS si verificano solo lì.

## DEC-057 — Decisioni dell'autore per il renderer SVG

- **Passo:** 7 · **Decisa da:** autore · **Tocca:** FR-VIEW-01, FR-VIEW-03, FR-MOB-06, §11.2, DEC-051
- **Rami dell'`if`:** affiancati sotto il rombo, **Falso a sinistra e Vero a destra**, come in Flowgorithm; si riuniscono sotto in un punto. Con `if` annidati il diagramma si allarga e si usano scorrimento e zoom.
- **Messaggi d'errore:** sul blocco solo i segni (cerchio di penna rossa, onda nel punto esatto, numero rosso); i messaggi in un elenco numerato sopra il foglio, fuori dal disegno. Toccando un messaggio si inquadra il suo blocco.
- **Colore dei blocchi:** oltre alla forma, **un riempimento tenue per tipo**. Le tinte stanno lontano dal giallo dell'evidenziatore e dal rosso della penna, così la regola del segno unico resta valida. Il blocco in esecuzione prende il giallo pieno al posto della sua tinta.
- **Zoom:** un diagramma si apre sempre al **100%**; "Adatta allo schermo" è un comando a un tocco; lo zoom non si memorizza.

## DEC-058 — Struttura del renderer

- **Passo:** 7 · **Decisa da:** sviluppo · **Tocca:** §10.2, FR-VIEW-01, FR-VIEW-02, NFR-CODE-03
- **Decisione:** il renderer è diviso in quattro moduli. `js/ui/diagram-layout.js` calcola la disposizione senza toccare la pagina (provato con una misura finta dei testi). `js/ui/diagram-renderer.js` disegna l'SVG, con un `<g data-id>` per blocco, e gestisce evidenziatore e penna rossa. `js/ui/diagram-errors.js` mostra l'elenco degli errori. `js/ui/diagram-viewport.js` si occupa di zoom e inquadratura. `js/ui/diagram-outline.js` (DEC-052) è tolto.
- **Misura dei testi:** con lo stesso SVG nascosto nella pagina (`getComputedTextLength`) e gli stessi stili del disegno, non con un canvas: i font di sistema come `ui-monospace` non sono garantiti nel canvas di ogni browser. La misura funziona anche con la scheda Diagramma nascosta sul telefono.
- **Funzioni:** una sotto l'altra, ciascuna con il suo asse e, se sono più d'una, il nome. Un errore della funzione si segna sul suo Inizio.
- **Punti di inserimento:** il layout restituisce già, per ogni freccia di una sequenza, il punto dove si potrà inserire un blocco (`slots`: proprietario, elenco, posizione). Una sequenza di n blocchi ne ha n + 1, anche un ramo vuoto. Il disegno del punto si decide al passo 9 (D-04).

## DEC-059 — Geometria del disegno

- **Passo:** 7 · **Decisa da:** sviluppo · **Tocca:** FR-VIEW-01, FR-MOB-04, DESIGN.md
- **Misure in quadretti:** i blocchi sono alti 2 quadretti (il rombo 3) e larghi un multiplo di 2, almeno 4. Le frecce tra i blocchi sono lunghe 2 quadretti. Così gli assi cadono sulle righe del foglio, e al passo 9 una freccia offre un'area di tocco vicina ai 44 px.
- **Testo:** su una sola riga e mai accorciato (FR-VIEW-05). Un testo lungo allarga il blocco.
- **Parole chiave:** il testo dei blocchi resta quello del catalogo (DEC-053), con la parola chiave (`if`, `while`, `Output`). Forma, tinta e parola dicono il tipo tre volte, e si legge anche senza distinguere i colori.
- **Cicli:** while e for hanno il ritorno a sinistra e l'uscita a destra (Falso); il do ha il ritorno a sinistra (Vero) fino a un punto d'incontro con l'etichetta `do`.

## DEC-060 — Zoom e inquadratura

- **Passo:** 7 · **Decisa da:** sviluppo · **Tocca:** FR-MOB-03, FR-MOB-06, FR-MOB-21, NFR-PERF-04
- **Scorrimento:** è quello nativo del foglio, fluido anche sui telefoni lenti. Lo zoom cambia la misura dell'SVG, del margine e dei quadretti. Quando i quadretti scendono sotto gli 8 px se ne disegna uno ogni 2 o 4.
- **Gesti:** sul foglio `touch-action: pan-x pan-y`. Il pizzico a due dita arriva con gli eventi touch (`preventDefault`, perché Safari ignora `user-scalable=no`); sono gestiti anche i gesti di Safari, Ctrl + rotella (che è anche il pizzico dei touchpad) e i tasti + − 0. Il punto sotto le dita resta fermo.
- **Limiti:** dal 10% al 300%, a passi del 25%. Il 10% serve perché "Adatta allo schermo" faccia entrare in un telefono anche l'Appendice A, alta circa 2700 px al 100%. "Adatta allo schermo" non va oltre il 200%.
- **Apertura:** al 100% (DEC-057), con Inizio al centro in orizzontale. Con cicli e if l'asse può stare oltre il bordo del telefono.
- **FR-MOB-03 (B5):** alla fine con un errore, il blocco si inquadra subito se il foglio è visibile; altrimenti si inquadra appena si passa alla scheda Diagramma. Lo fanno anche "Mostra nel diagramma" nella console e un tocco su un messaggio dell'elenco.
- **Da verificare su telefoni veri:** il pizzico su iPhone e su Android, soprattutto se il dito ha già cominciato a scorrere il foglio prima che arrivi il secondo.

## DEC-061 — Attributi di un file nuovo (D-01)

- **Passo:** prima del passo 8 · **Decisa da:** autore · **Tocca:** §7.2, FMT-W-07, FMT-W-10, FMT-W-11, NFR-PRIV-05
- **Decisione:** un file creato da zero in OnoFlow ha gli attributi di Flowgorithm **tranne `created` ed `edited`**, nello stesso ordine: `name`, `authors`, `about`, `saved`.
  - `name`: il nome del file senza `.fprg`, aggiornato a ogni salvataggio finché il file non è stato importato. Un file importato conserva il suo (FMT-W-06).
  - `authors`: vuoto. OnoFlow non conosce il nome di chi lo usa e non deve conoscerlo.
  - `about`: vuoto.
  - `saved`: ora locale del salvataggio, nel formato `AAAA-MM-GG hh:mm:ss ` (DEC-033).
- **Perché:** il file assomiglia il più possibile a uno di Flowgorithm, senza dati dell'utente. `created` ed `edited` restano esclusi (FMT-W-07): se Q-04 dimostrasse che Flowgorithm li richiede, si aggiungeranno con valori neutri.
- **Conseguenza:** dal passo 8 un diagramma nuovo non si salva più con `<attributes/>` (DEC-054), ma con questi quattro attributi (`js/core/diagram-document.js`).

## DEC-062 — Documento aperto e modifiche non salvate

- **Passo:** 8 · **Decisa da:** sviluppo · **Tocca:** FR-FILE-07, FR-FILE-08, FR-FILE-11, NFR-PRIV-08, B1, D-02
- **Documento:** `js/core/diagram-document.js` tiene il programma aperto con la sua **origine** (`new`, creato in OnoFlow; `file`, aperto da un file o da un esempio) e due contatori, quello delle modifiche e quello del salvataggio. "Modificato" vuol dire che sono diversi. L'editor chiamerà `markChanged()` a ogni modifica; annulla/ripeti (D-02, passo 12) potrà riportare il contatore a un valore già salvato.
- **Il nome del file non è una modifica:** vale per il prossimo salvataggio e non accende "Non salvato".
- **Copia di sessione:** oltre a testo, nome e stato salvato conserva l'**origine** (`new`/`file`), così un diagramma nuovo ripristinato continua a prendere gli attributi di DEC-061. Non è un dato dell'utente: NFR-PRIV-08 è aggiornato. Senza modifiche la copia è il testo d'origine, così il round-trip resta identico; con modifiche è il programma di adesso.
- **Avviso (FR-FILE-08, B1):** prima di Nuovo, Apri, un esempio o un file trascinato, se ci sono modifiche compare una barra in linea: «Il diagramma «nome» ha modifiche non salvate, che andrebbero perse.», con **Salva** (scarica il file, poi continua), **Non salvare** (continua) e **Chiudi** (rinuncia). Il focus va su Salva. Non si usa "Annulla" perché è già il nome di annulla/ripeti (§11.1: un nome per azione).
- **Chiusura della pagina:** con modifiche, `beforeunload` chiede conferma al browser. Sui telefoni non è affidabile: lì protegge la copia di sessione (FR-MOB-15).
- **Senza editor:** fino al passo 9 un diagramma risulta modificato solo se è stato ripristinato con modifiche non salvate. È il caso usato nelle verifiche automatiche.

## DEC-063 — Inserimento al tocco e blocchi nuovi (D-04, D-09)

- **Passo:** prima del passo 9 · **Decisa da:** autore · **Tocca:** FR-EDIT-01, FR-EDIT-03, FR-EDIT-07, FR-MOB-04, FR-MOB-05, B3
- **D-04, inserimento:** **entrambi i modi.** A metà di ogni freccia c'è un punto di inserimento **sempre visibile**: un piccolo cerchio con il +, in inchiostro diluito, con un'area di tocco di almeno 44 × 44 px. Toccandolo si apre il menu dei blocchi. Durante l'esecuzione i punti si nascondono (FR-EDIT-07). Inoltre, come in B3, sul blocco selezionato compare "Inserisci dopo". Solo i punti permettono di inserire il primo blocco e di riempire un ramo vuoto.
- **Menu dei blocchi** (sviluppo, salvo obiezioni dell'autore): un pannello in basso sul telefono e un riquadro vicino alla freccia sul computer, mai una finestra modale (B1). Contiene gli otto tipi di blocco della §7.3, ciascuno con la sua forma e la sua tinta (DEC-057).
- **D-09, blocco nuovo:** parte **vuoto**, con un **suggerimento grigio** nel campo (per esempio "es. x + 1"). Il suggerimento non entra né nel file né nel diagramma. Il blocco apre subito la finestra di modifica e resta segnato in rosso finché non è completo (FR-EDIT-03).

## DEC-064 — Inserimento: forma del passo 9

- **Passo:** 9 · **Decisa da:** sviluppo · **Tocca:** FR-EDIT-01, FR-EDIT-03, FR-EDIT-06, FR-EDIT-07, FR-MOB-04, FR-MOB-05, NFR-ACC-01, DEC-063
- **Moduli:** `js/core/editor.js` (blocchi nuovi, inserimento in un punto, "Inserisci dopo"; solo in Main, DEC-004) e `js/ui/block-menu.js` (menu dei blocchi). Il renderer disegna i punti e la selezione.
- **Area di tocco:** i punti si trovano con un calcolo sul punto toccato, non con la misura del disegno. Un tocco entro 22 px CSS dal centro di un punto lo colpisce a ogni zoom, così l'area resta di 44 px (FR-MOB-04). Un blocco toccato direttamente ha la precedenza.
- **Tastiera:** punti e blocchi di Main sono pulsanti raggiungibili con Tab, con Invio o Spazio. Ogni punto ha un nome che dice dove inserisce, per esempio «dopo «x = 0»» o «all'inizio del ramo Vero di «if x > 0»». Nel menu le frecce scorrono le voci, Esc chiude e il focus torna al punto.
- **Selezione (B3):** contorno d'inchiostro attorno al blocco, mai rosso o giallo. Un tocco sul foglio vuoto o Esc la tolgono. La barra della selezione ha per ora solo "Inserisci dopo"; "Modifica" arriva con la finestra di modifica (passo 10), la cancellazione al passo 11.
- **FR-EDIT-03 in due tempi:** al passo 9 il blocco nuovo resta vuoto, segnato in rosso (con l'errore nell'elenco), e viene selezionato e messo a fuoco. Al passo 10 aprirà subito la finestra di modifica.
- **Durante l'esecuzione** (FR-EDIT-07) i punti si nascondono, il menu si chiude e la selezione si toglie.
- **Ogni inserimento** (FR-EDIT-06): il documento risulta modificato, gli errori si ricalcolano, il disegno si rifà con lo stesso zoom e la copia di sessione si aggiorna.

## DEC-065 — Piè di pagina in una riga e pannello Informazioni

- **Passo:** 9 · **Decisa da:** autore (opzione consigliata) · **Tocca:** FR-INFO-01…04, §11.1
- **Richiesta:** il piè di pagina era troppo grande e invadente.
- **Decisione:** in fondo al foglio resta **una sola riga**, piccola (0,75rem) e tenue: «Progetto indipendente, non affiliato a Flowgorithm · Ospitato su GitHub Pages (USA, fuori dall'UE), che registra l'IP dei visitatori; OnoFlow non invia altri dati · Privacy di GitHub · Informazioni». Aperta dal disco: «Copia locale: nessun dato inviato · Informazioni». FR-INFO-03 resta rispettato in forma breve.
- **Informazioni (FR-INFO-02):** un pannello sopra il foglio, non modale (Chiudi o Esc), aperto dalla riga e dal menu (sezione "Progetto"). Contiene nome e sottotitolo, indipendenza da Flowgorithm, uso dell'IA, avviso completo sull'hosting con il collegamento all'informativa di GitHub (o la copia locale), copia di sessione (NFR-PRIV-08), licenza MIT.
- **Tocco:** i collegamenti della riga sono piccoli ma hanno l'area di 44 px (FR-MOB-04), senza alzare la riga.
- **Test del tono:** il controllo del "tu" (DEC-050) scambiava "USA" per l'imperativo "usa"; ora distingue le maiuscole.

## DEC-066 — Finestra di modifica

- **Passo:** 10 · **Decisa da:** sviluppo (l'autore può rivederla) · **Tocca:** FR-EDIT-02, FR-EDIT-03, FR-EDIT-06, FR-EDIT-08, FR-MOB-07…09, FR-MOB-16, FR-MOB-17, B1, B3, D-02
- **Dove:** un pannello, non una finestra modale (B1). Sul computer prende il posto della console, con il diagramma accanto che si aggiorna mentre si scrive. Sul telefono è a tutto schermo, alto quanto la parte visibile sopra la tastiera: campi in alto, barra dei simboli in fondo, quindi subito sopra la tastiera (FR-MOB-07, FR-MOB-08). Modulo `js/ui/block-editor.js`.
- **Le modifiche valgono mentre si scrive:** ogni tasto rianalizza il campo, aggiorna il modello, gli errori e il disegno. Non c'è un "Conferma": c'è **Fatto** (o Esc) che chiude. Così non serve un pulsante per rinunciare, che si sarebbe dovuto chiamare "Annulla", già usato per annulla/ripeti. Per tornare indietro ci sarà annulla/ripeti (passo 12); D-02 dovrà raggruppare in un solo passo le modifiche fatte in una stessa apertura della finestra.
- **Errore mentre si scrive (FR-EDIT-02):** sotto il campo, il messaggio della §8.4 e il testo del campo con l'onda rossa nel punto esatto (o un trattino dove manca qualcosa). Un campo **vuoto** non si segnala mentre lo si sta scrivendo, ma quando lo si lascia: un blocco appena inserito non si apre già tutto rosso. Gli errori di un blocco che esiste già si vedono subito.
- **Campi (FR-EDIT-08):** dichiarazione con nomi, tipo (elenco), array (casella) e numero di elementi solo se array; output con "A capo dopo l'output"; for con variabile, da, a, verso (Crescente/Decrescente) e passo. I suggerimenti di D-09 sono i segnaposto dei campi («es. somma + n») e non entrano mai nel file.
- **Aprire la finestra:** subito dopo un inserimento (completa FR-EDIT-03); con **Modifica** nella barra della selezione; con un secondo tocco sul blocco selezionato (B3); con un doppio clic (FR-EDIT-02); da tastiera con Invio sul blocco già selezionato. Mentre la finestra è aperta, un tocco su un altro blocco passa a quel blocco. Chiamate e commenti non si modificano nella fase 1 (FR-EDIT-10): "Modifica" è barrato.
- **Tastiera:** il focus va sul primo campo; Invio passa al campo successivo e dall'ultimo chiude; Esc chiude e il focus torna al blocco.
- **Telefono:** correzione, maiuscole e suggerimenti disattivati (FR-MOB-09); campi da 16 px in su (FR-MOB-17); le virgolette tipografiche diventano dritte mentre si scrive, senza spostare il cursore (FR-MOB-16); i pulsanti dei simboli non tolgono il focus al campo, così la tastiera resta aperta. La barra dei simboli c'è anche sul computer: non disturba e serve a chi usa uno schermo touch.
- **Modello:** nuovo `Model.setProperty`, con gli stessi controlli della creazione (tipo, verso, valori vero/falso).
- **Esecuzione:** Esegui chiude la finestra (FR-EDIT-07).
- **DEC-037:** le virgolette tipografiche nel codice e nei test sono scritte come `\uXXXX`.

## DEC-067 — Cancellazione

- **Passo:** 11 · **Decisa da:** sviluppo (l'autore può rivederla) · **Tocca:** FR-EDIT-04, FR-EDIT-05, FR-EDIT-06, FR-EDIT-07, B1, B3, D-02
- **Come si cancella:** **Elimina** (icona del cestino) nella barra della selezione, oppure **Canc** o **Backspace** sul blocco a fuoco. Si cancella qualunque blocco di Main, anche un commento o una chiamata, che non si modificano (DEC-004). Durante l'esecuzione no (FR-EDIT-07): la barra è nascosta e il tasto non fa nulla.
- **If e cicli:** si cancellano con tutto il contenuto, come chiede FR-EDIT-04, **senza conferma** (B1: niente finestre modali). La rete di sicurezza è l'avviso informativo «Blocco «…» eliminato, con i N blocchi che conteneva.» con **Annulla**, che rimette il blocco nello stesso punto, con lo stesso contenuto e gli stessi ID (vincolo della §10 per annulla/ripeti).
- **Annulla prima del passo 12:** vale solo per l'ultima cancellazione e l'avviso sparisce alla modifica successiva (inserimento, campo, altra cancellazione, nuovo diagramma), perché il punto dove rimettere il blocco potrebbe non esistere più. Con annulla/ripeti (passo 12, D-02) diventerà un passo della storia come gli altri; il pulsante dell'avviso potrà restare come scorciatoia.
- **Dopo la cancellazione** non resta selezionato nulla e il focus va sul punto di inserimento dove c'era il blocco: un secondo Canc non cancella il blocco vicino togliendo l'Annulla del primo.
- **Modello:** `Editor.removeAt(program, id) → { block, slot }`; `Editor.insertAt(program, slot, block)` è l'operazione inversa. `Editor.countInside` conta i blocchi contenuti, a ogni livello.
- **Telefono:** tre pulsanti con il testo non stanno in 360 px; sotto i 27,5rem Elimina resta con il solo cestino (il nome resta per i lettori di schermo), come Pausa e Ferma.

## DEC-068 — Annulla e ripeti (D-02)

- **Passo:** 12 · **Decisa da:** autore (proposta approvata) · **Tocca:** FR-EDIT-05, FR-EDIT-07, FR-MOB-10, QA-13, §10.3, §11.1, D-02, DEC-062, DEC-066, DEC-067
- **Meccanismo:** operazioni reversibili sul modello, non copie del programma (§10.3). `js/core/history.js` registra tre tipi di passo: inserimento (si annulla togliendo il blocco), cancellazione (si annulla rimettendolo nello stesso punto), modifica del contenuto (testi dei campi e proprietà prima e dopo, `Editor.contentOf`/`setContent`). I blocchi tolti restano gli stessi oggetti: rimessi, hanno gli stessi ID. La storia è lineare: una modifica nuova cancella i passi da ripetere.
- **Finestra di modifica:** tutto quello che cambia in una stessa apertura è **un passo** (DEC-066). Il passo si chiude con Fatto o Esc, passando a un altro blocco, cancellando, eseguendo, con Annulla/Ripeti. Se il blocco è appena stato inserito, il primo riempimento entra nel passo dell'inserimento: Annulla toglie il blocco già riempito, Ripeti lo rimette com'era. Un'apertura senza cambiamenti non è un passo.
- **Limite:** 100 passi; oltre si dimenticano i più vecchi. La storia si svuota quando si apre un altro diagramma (Nuovo, Apri, Esempi, trascinamento, ripristino).
- **Stato "modificato" (QA-13):** il documento non conta più le modifiche ma dà a ognuna una **versione** mai usata; ogni passo ricorda le versioni prima e dopo. Annullando fino al salvataggio "Non salvato" si spegne; ripetendo oltre si riaccende (DEC-062 aggiornata).
- **Comandi:** Menu → Annulla/Ripeti; **pulsanti con la sola icona** (frecce curve, barrato diagonale quando non c'è nulla da fare), nella barra superiore prima di Esegui da 64rem in su, sotto in basso a sinistra del foglio, accanto allo zoom (FR-MOB-10: un tocco). Tra 56 e 64rem nella barra il nome del file si riduceva a pochi caratteri (B2). Tastiera: **Ctrl/Cmd + Z**, **Ctrl/Cmd + Maiusc + Z**, **Ctrl + Y**; dentro un campo di testo resta l'annulla del browser.
- **Dopo Annulla/Ripeti** il blocco toccato è selezionato e inquadrato; se è sparito, il focus va sul punto di inserimento dove stava. Il focus resta sul pulsante premuto, così si può premere più volte.
- **Durante l'esecuzione** Annulla e Ripeti sono disabilitati (FR-EDIT-07).
- **Avviso della cancellazione (DEC-067):** il suo Annulla ora è Annulla della storia; vale finché la cancellazione è l'ultimo passo (l'avviso sparisce alla modifica successiva).
- **Barra della selezione su un foglio stretto:** con una finestra del computer di circa 900 px copriva i comandi dello zoom (tre pulsanti dal passo 11). Quando il foglio è sotto i 44rem sale sopra lo zoom, come sul telefono (container query sul pannello del diagramma). Le verifiche automatiche provano anche 900 × 700.

## DEC-069 — Verifiche di QA-11 e QA-12 e focus nel diagramma in Firefox

- **Passo:** 13 · **Decisa da:** sviluppo · **Tocca:** QA-11, QA-12, QA-14, FR-FILE-09, FR-FILE-10, NFR-ACC-01, DEC-056
- **QA-11 e QA-12 si verificano due volte:** nella pagina dei test sul modello e sul file (`tests/files.test.js`), e nella pagina vera con `tools/check-ui.mjs`, al tocco sul telefono. QA-11: l'Appendice A costruita blocco per blocco (il primo di ogni elenco dal suo punto con il +, gli altri con "Inserisci dopo", ogni campo nella finestra di modifica), eseguita con gli input di QA-04, salvata e riaperta. QA-12: l'Appendice A con la fine del `for` cambiata, un output aggiunto e la dichiarazione di `risultato` cancellata; nel file salvato cambiano solo quelle righe e `saved`.
- **I punti di inserimento dicono dove inseriscono:** attributi `data-owner`, `data-list`, `data-index` sul gruppo SVG del punto. Servono alle verifiche, che così scelgono il punto come lo sceglie una persona guardando il disegno.
- **Difetto trovato e corretto:** in Firefox il focus su un `<g>` dell'SVG (blocco o punto, con Tab) non fa scorrere il foglio, e `scrollIntoView` lo sposta in un punto sbagliato. Chi usa la tastiera perdeva di vista ciò che aveva selezionato. Ora, quando il focus entra in un blocco o in un punto **del tutto fuori dal foglio**, lo inquadra la pagina (`DiagramViewport.reveal`). Se è anche solo in parte visibile non si muove nulla, così un clic su un ciclo grande non fa saltare il foglio.
- **Verifiche e Firefox:** per lo stesso motivo lo scorrimento automatico di Playwright non porta in vista un `<g>` in Firefox; nelle verifiche di QA-11 e QA-12 il foglio si fa scorrere fino all'elemento e si tocca il suo centro, controllando che lì non ci sia un altro elemento.
- **Resta da verificare in Flowgorithm (Q-04):** che i file salvati, creati da zero e modificati, si aprano anche lì (seconda metà di FR-FILE-10).

## DEC-070 — Esempi brevi del menu (B6) e riga in fondo al foglio

- **Data:** 23 ottobre 2026, dopo il passo 13 · **Decisa da:** sviluppo, da sottoporre all'autore (B6) · **Tocca:** FR-FILE-06, QA-06, NFR-PRIV-05, Q-02, DEC-036, DEC-061, DEC-065
- **Sei esempi brevi**, uno per costrutto, dopo "Somma, massimo e minimo": **Pari o dispari** (if, `mod`), **Tabellina** (for), **Media di più numeri** (for con Real, if che evita la divisione per zero), **Fattoriale** (accumulo; 13 esce dagli Integer, un errore utile in classe), **Massimo comun divisore** (while, Euclide), **Somma fino allo zero** (do).
- **Scritti da OnoFlow come file nuovi** (DEC-061): `name`, `authors` e `about` vuoti, `saved` neutro (23 ottobre 2026, 10:00); niente `created`/`edited`. Così il round-trip è identico per costruzione e non c'è nessun dato personale (NFR-PRIV-05). Il test della privacy accetta per `authors` il valore neutro dell'Appendice A ("studente") o il vuoto.
- **Solo operatori prudenti (Q-02):** `mod`, `==`, `>`, `&`; niente `%`, `!=`, `&&`, `||`, `!`, finché non si verifica che Flowgorithm li accetti.
- **QA-06:** `tests/examples.test.js` controlla per ogni esempio apertura senza avvisi né errori, round-trip, titolo nel catalogo, e l'output con input noti.
- **Riga in fondo al foglio (DEC-065):** non scorre più di lato con un disegno largo (`position: sticky`) e, su un foglio stretto, ha sotto lo spazio per le due file di comandi (selezione e zoom), così non finisce sotto la barra della selezione.

## DEC-071 — Preparazione alla pubblicazione

- **Data:** 23 ottobre 2026 · **Decisa da:** autore (firma, documenti, email); sviluppo (il resto) · **Tocca:** FR-INFO-02, NFR-PRIV-05…07, NFR-DIST-01, FR-MOB-13, DEC-051
- **Firma:** «MrGear10». Il pannello Informazioni dice «Progettato da MrGear10 e sviluppato con l'assistenza di Claude (Anthropic).» (FR-INFO-02); la licenza MIT è intestata a MrGear10.
- **README.md:** cosa fa l'app, uso online e offline (ZIP, `file://`), indipendenza da Flowgorithm, privacy (nessun dato salvato tranne la copia di sessione, hosting su GitHub Pages fuori dall'UE con l'IP registrato, dati personali dentro i `.fprg` che OnoFlow non aggiunge né toglie: NFR-PRIV-06, NFR-PRIV-07, NFR-PRIV-08), uso dell'IA, test e verifiche, documenti, licenza.
- **NFR-PRIV-07 ricontrollato il 23 ottobre 2026:** la documentazione di GitHub Pages dice ancora che l'IP di ogni visitatore "is logged and stored for security purposes", con o senza account; l'informativa generale di GitHub (in vigore dal 27 aprile 2026) è all'indirizzo usato dall'app.
- **Documenti pubblici:** specifica, `DECISIONI.md`, `DESIGN.md`, `PRODUCT.md`, `docs/checklist-manuale.md`. **Solo in locale** (in `.gitignore`): `CLAUDE.md`, `PROGRESS.md`, `.impeccable/`. Prima della pubblicazione la storia si riscrive anche per toglierli dai commit vecchi.
- **`.nojekyll`:** senza `.impeccable/` non c'è più nulla da nascondere; GitHub Pages serve i file come sono, senza Jekyll.
- **Email dei commit:** prima della pubblicazione la storia si riscrive con l'indirizzo noreply di GitHub dell'autore, perché l'email personale non diventi pubblica.
- **FR-MOB-13:** le verifiche ruotano il telefono a metà dell'esecuzione (in attesa di un valore): l'esecuzione e il diagramma restano.

## DEC-072 — Q-04 verificata in Flowgorithm

- **Data:** 23 ottobre 2026 · **Verificata da:** autore · **Tocca:** Q-04, FR-FILE-10, FMT-W-06, FMT-W-07, DEC-061
- **Esito:** i file salvati da OnoFlow si aprono in Flowgorithm, sia quello creato da zero (attributi di DEC-061, senza `created`/`edited`) sia l'Appendice A modificata con `created`/`edited` conservati (checklist del passo 13). FR-FILE-10 è soddisfatto anche nella sua seconda metà.

## DEC-073 — Piano della fase 2 e decisioni D-03, D-05, D-06

- **Data:** 23 ottobre 2026 · **Decisa da:** autore (proposte consigliate) · **Tocca:** §13, FR-RUN-05, FR-RUN-06, FR-ERR-06, FR-EDIT-10…12, D-03, D-05, D-06
- **Ordine:** 14 passo-passo, 15 pannello delle variabili, 16 analisi statica completa, 17 `call` e `comment` nell'editor, 18 funzioni, 19 spostamento dei blocchi. Un branch per passo (`fase2/passo-NN`), come DEC-012.
- **D-03 (spostamento):** "Sposta" nella barra della selezione stacca il blocco con il contenuto; un tocco su un + lo mette lì. Funziona uguale con dito, mouse e tastiera, non litiga con lo scorrimento e il pizzico, ed è un solo passo di annulla/ripeti.
- **D-05 (valori Real):** nel pannello il valore come lo stampa la console («0,3»); solo se è diverso, sotto in piccolo il valore completo («0,30000000000000004»), con il separatore della lingua.
- **D-06 (maiuscole):** un nome sconosciuto che differisce solo per le maiuscole da una parola chiave, una variabile o una funzione (`True`, `Somma`, `tostring`) dà l'errore con il suggerimento.
- **Pannello delle variabili sul telefono:** durante il passo-passo, una striscia in fondo alla scheda Diagramma, che si allarga con un tocco: blocco evidenziato e variabili insieme.

## DEC-074 — Passo-passo

- **Passo:** 14 · **Decisa da:** sviluppo (l'autore può rivederla) · **Tocca:** FR-RUN-05, FR-MOB-02, FR-MOB-10, §11.1, DEC-043, DEC-055
- **Scheduler:** `step()` esegue il blocco evidenziato e si ferma prima del successivo, che diventa quello evidenziato; da fermo avvia l'esecuzione e si ferma prima del primo blocco. Funziona anche dopo una Pausa dell'esecuzione continua. Riprendi torna all'esecuzione continua. Un input a metà passo si chiede come sempre; dopo il valore il passo arriva al blocco successivo. I commenti non sono un passo (DEC-043).
- **Comandi:** **Passo** (icona: triangolo e barra) nella barra accanto a Esegui da 28rem in su; Menu → Esecuzione → **Esegui passo a passo**; **F10**, come nei debugger. Sul telefono la barra è piena: si comincia dal menu, e durante l'esecuzione Passo prende il posto di Annulla e Ripeti in basso a sinistra del foglio (lì disabilitati comunque, FR-EDIT-07).
- **Stato:** «Passo a passo» al posto di «In pausa», con lo stesso segno (quadrato vuoto, DEC-055).
- **Telefono:** nel passo-passo all'avvio resta in primo piano il **diagramma** (il punto è vedere il blocco evidenziato), non la console di FR-MOB-02. Un input porta alla console; dopo il valore si torna al diagramma. L'output che arriva mentre si guarda il diagramma mette il segno sulla scheda Console.
- **Inquadratura:** a ogni passo il blocco evidenziato si porta in vista se non lo è.

## DEC-075 — Pannello delle variabili

- **Passo:** 15 · **Decisa da:** sviluppo, dentro le scelte dell'autore di DEC-073 · **Tocca:** FR-RUN-06, D-05, FR-ERR-03, DEC-051
- **Da dove vengono:** a ogni blocco l'interprete comunica anche la chiamata in corso (`{ type: 'step', nodeId, frame }`); lo scheduler offre `variables()`, la fotografia di quel momento (la stessa degli errori, FR-ERR-03): le variabili della funzione in esecuzione, con il suo nome.
- **Cosa mostra:** «Variabili di Main» (o della funzione); per ogni variabile nome, tipo (per un array anche il numero di elementi) e valore come lo stampa la console, con le stringhe tra virgolette come negli errori; «nessun valore» se non è ancora assegnata. Un array mostra gli elementi con l'indice (al massimo 50, poi «e altri N»).
- **D-05:** per un Real il cui valore stampato è arrotondato, sotto in piccolo il valore completo (`NumberFormat.formatRealFull`: tutte le cifre della rappresentazione più corta, con la virgola, mai notazione scientifica né -0).
- **Cambiata nell'ultimo passo:** il valore è sottolineato col gesso (il giallo resta solo del blocco in esecuzione, DEC-051), e per i lettori di schermo c'è «(cambiata nell'ultimo passo)». Per un array si segnano solo gli elementi cambiati. Passando a un'altra funzione non si confronta.
- **Quando:** si aggiorna a ogni passo, a ogni turno dell'esecuzione continua e alla fine; i valori finali restano fino alla prossima esecuzione o modifica (una modifica cambia il programma, quindi il pannello sparisce).
- **Dove:** sul computer in cima alla console, sulla stessa lavagna (al massimo il 40% dell'altezza, poi scorre). Sul telefono, durante l'esecuzione, una striscia sotto il diagramma con il riassunto in una riga («n = 7 · i = 2»); un tocco la allarga. A programma finito la striscia sparisce, perché al suo posto torna la barra della selezione: i valori finali sono nel pannello della scheda Console.

## DEC-076 — Analisi statica completa

- **Passo:** 16 · **Decisa da:** sviluppo, dentro D-06 (DEC-073) · **Tocca:** FR-ERR-06, FR-RUN-02, FR-EDIT-02, §6.1, §6.4–6.9, §8.1, §8.3, DEC-022, DEC-044
- **Cosa trova prima di eseguire** (`js/core/type-check.js`, chiamato da `StaticCheck.check` per ogni blocco dopo i suoi errori di sintassi): variabili non dichiarate, funzioni inesistenti (anche `Main`), numero e tipo degli argomenti delle funzioni predefinite e dell'utente (array dello stesso tipo per i parametri array), funzioni senza valore in un'espressione, tipi di assegnazioni, condizioni, operatori (`+` tra testi, `mod` tra Real, `<` tra Boolean, confronti tra tipi diversi, `and`/`or`/`not`), indici, array senza indice, variabile ed estremi del `for`, dimensione degli array, variabile di ritorno (dichiarata, semplice, del tipo giusto).
- **Stessi codici e parametri dell'interprete** (§8.3), quindi gli stessi messaggi; con la posizione dell'espressione sbagliata, per l'onda. Un solo errore per campo, il primo da sinistra (DEC-022).
- **Nessun falso allarme:** una variabile vale come dichiarata se un declare della funzione o un parametro ha quel nome, in qualunque punto: l'uso prima della dichiarazione resta un errore di esecuzione, perché dipende dal percorso. `Integer ^ Integer` dipende dal segno dell'esponente: vale come "numero forse intero", accettato dove serve un Integer o un Real. Un difetto dell'analisi non blocca mai l'esecuzione: l'analisi si ritira e decide l'interprete.
- **`and`/`or`:** si controlla anche il secondo operando, che l'esecuzione salta per il cortocircuito (`true or 1`, DEC-044).
- **D-06:** un nome sconosciuto che differisce solo per le maiuscole da una variabile, da `true`/`false` o da una funzione ha `reason: 'case'` e `suggestion`: «La variabile «True» non è stata dichiarata. Forse si intendeva «true»: maiuscole e minuscole contano.» Lo stesso per le funzioni (`len` → `Len`).
- **Mentre si scrive:** se un campo non ha errori di sintassi, sotto compare l'errore dell'analisi statica di quel campo (opzione `fieldIssue` della finestra di modifica), così `b = True` si vede subito anche a tutto schermo sul telefono. Un campo vuoto mai lasciato resta senza errore anche quando si scrive in un altro (regola di DEC-066).
- **I controlli durante l'esecuzione restano**, per i casi che dipendono dai valori; i loro test usano l'opzione `typeCheck: false` dell'interprete, che salta l'analisi dei tipi (solo nei test).
- **Funzioni predefinite:** ognuna dichiara il tipo del risultato (`result`, oppure `'same'` per `Abs`).

## DEC-077 — Chiamata e commento nell'editor

- **Passo:** 17 · **Decisa da:** sviluppo · **Tocca:** FR-EDIT-10, FR-MOB-09, FR-MOB-16, §7.4, Q-06, Q-07, DEC-004
- **Menu dei blocchi:** dieci voci, con **Chiamata** e **Commento** in fondo, nell'ordine di Flowgorithm; sul telefono due colonne da cinque righe.
- **Chiamata:** un campo «Chiamata» (`es. Stampa(n)`), con gli errori di sintassi e dell'analisi statica mentre si scrive (funzione inesistente, argomenti; DEC-076). Il valore di una funzione con ritorno si scarta (§6.8).
- **Commento:** un'area di testo «Commento» (`es. Calcola la media dei voti`). Non è un'espressione: nessuna analisi, nessun errore. Un'area e non un campo a una riga, perché un campo a una riga toglierebbe senza dirlo gli a capo di un commento importato; Invio passa avanti come negli altri campi, quindi in OnoFlow non si aggiungono a capo nuovi (prudenza: Q-06 non è verificata). Virgolette tipografiche raddrizzate (FR-MOB-16) e niente correzione automatica (FR-MOB-09), perché un commento cita spesso i nomi delle variabili.
- **Formato:** `<call expression="…"/>` e `<comment text="…"/>`, come la §7.4 presume; gli escape di FMT-W-04 (`&#10;` per l'a capo). All'apertura di un file resta l'avviso `WARN_LOAD_UNVERIFIED_FORMAT` finché Q-07 non è verificata con un secondo file campione.
- **Fase 1 superata (DEC-004):** chiamate e commenti di Main ora si modificano (Modifica non è più barrato).

## DEC-078 — Gestione delle funzioni

- **Passo:** 18 · **Decisa da:** sviluppo (l'autore può rivederla) · **Tocca:** FR-EDIT-11, FR-EDIT-05, §6.8, §7.4, Q-07, DEC-004 (superata), DEC-066, DEC-067, DEC-068
- **Ogni funzione si modifica** (DEC-004 superata): punti di inserimento, selezione, finestra di modifica, cancellazione e annulla/ripeti anche nei corpi delle funzioni diverse da Main.
- **Creare:** Menu → Modifica → **Nuova funzione**. Va in fondo, con un nome libero («Funzione», «Funzione2»…), senza parametri né valore; la sua finestra si apre subito e il primo riempimento è un solo passo con la creazione.
- **Selezionare:** il blocco Inizio di una funzione diversa da Main si seleziona (Main no: la sua firma non cambia, §6.8). Nella barra: **Modifica** apre la firma, **Inserisci dopo** inserisce all'inizio del corpo, **Elimina** toglie la funzione con tutto il corpo.
- **Finestra della firma:** la stessa finestra dei blocchi (un pannello, lo stesso Fatto, la stessa disposizione su telefono e computer): Nome della funzione; Valore restituito (Nessuno, Integer, Real, String, Boolean); Variabile restituita, solo con un valore, «da dichiarare nel corpo»; Parametri, una riga ciascuno con nome, tipo, Array e **Togli**, e **Aggiungi parametro** (il focus va sul nome nuovo). Gli errori dell'analisi statica stanno sotto il campo giusto: nome (non valido, riservato, doppio), variabile restituita (non dichiarata, del tipo sbagliato), il parametro con il nome sbagliato.
- **Rinominare:** chiudendo la finestra, le chiamate alla funzione in tutto il programma si aggiornano (solo un identificatore seguito da «(», il resto del testo com'è); firma e chiamate sono un solo passo di Annulla. Non a ogni tasto: a metà parola il nome può coincidere con un'altra funzione (`Len`), e le sue chiamate verrebbero rinominate per sbaglio. Se il nome nuovo non è valido o è già preso, le chiamate restano com'erano e l'analisi statica segnala l'errore.
- **Cancellare:** senza conferma, con l'avviso «Funzione «…» eliminata, con i N blocchi che conteneva.» e Annulla (DEC-067); le chiamate rimaste diventano errori.
- **Disegno:** il titolo di ogni funzione mostra la firma, «Funzione Doppio(Integer n, Real v[]) → Integer r»; tra titolo e Inizio tre quadretti, per il cerchio di un errore sulla funzione.
- **Annulla/ripeti:** nuovi passi `addFunction`, `removeFunction`, `editFunction` (firma prima e dopo, chiamate rinominate).
- **Formato:** quello presunto della §7.4 (`<parameters><parameter name type array/></parameters>`, `variable` di `<function>`), già usato in lettura e scrittura dalla fase 1; resta l'avviso finché Q-07 non è verificata con un file di Flowgorithm.

## DEC-079 — Spostamento dei blocchi

- **Passo:** 19 · **Decisa da:** sviluppo, dentro D-03 (DEC-073) · **Tocca:** FR-EDIT-12, FR-EDIT-05, FR-MOB-04, NFR-ACC-01, B1, DEC-062
- **Come:** **Sposta** (icona delle quattro frecce) nella barra della selezione. Il blocco resta al suo posto, tratteggiato e tenue; un avviso dice «Spostamento di «…»: scegliere il + dove metterlo.» con **Non spostare** (non «Annulla», che è il nome di annulla/ripeti, DEC-062). Un tocco su un + porta lì il blocco con tutto il contenuto, anche in un ramo, in un ciclo o in un'altra funzione.
- **Dove no:** dentro sé stesso o un suo figlio, e nei due + subito prima e dopo, dove resterebbe dov'è. Quei + si spengono: quasi trasparenti, fuori dal giro del Tab, non si colpiscono col tocco neanche se sono i più vicini.
- **Rinunciare:** Non spostare, Chiudi dell'avviso, Esc, un tocco su un blocco o sul foglio vuoto. Ogni modifica, un'esecuzione o un altro diagramma rinunciano.
- **Tastiera:** con Sposta il focus va sul primo + possibile; Tab scorre solo quelli; Invio sposta.
- **Funzioni:** non si spostano (Sposta è disabilitato sull'Inizio di una funzione); si sposta un blocco.
- **Annulla/ripeti:** un solo passo `move` con il punto di partenza e quello d'arrivo (calcolato dopo aver tolto il blocco, quando il + sta più avanti nello stesso elenco). Gli ID non cambiano.
- **Telefono:** con quattro pulsanti la barra non starebbe in 360 px: sotto i 27,5rem Modifica, Sposta ed Elimina hanno la sola icona (il nome resta per i lettori di schermo e nel title), Inserisci dopo il testo.
