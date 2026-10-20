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
