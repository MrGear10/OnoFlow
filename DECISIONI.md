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
- **Dove:** `PRODUCT.md` (verità di prodotto) e `.impeccable/surfaces/index-html.md` (contratto della direzione per la superficie dell'app). `DESIGN.md` si scrive alla fine del passo 6, dal costruito, dopo la revisione finale.
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
