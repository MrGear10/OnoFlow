# OnoFlow — Controlli manuali

Controlli da fare a mano, in **Firefox da `file://`** (QA-09), alla fine di ogni passo. Si spuntano copiando la sezione nella descrizione del commit o della consegna.

---

## Passo 1 — Pagina dei test e mini-framework

Aprire `tests.html` con doppio clic dalla cartella del progetto (non da un server).

- [ ] La pagina mostra in verde **"Tutti i test superati"**, con il numero dei test superati e la durata; il titolo della scheda inizia con ✓.
- [ ] Le suite superate sono chiuse; cliccando sul nome di una suite si apre l'elenco dei suoi test.
- [ ] Scrivere `deepEqual` nel campo del filtro e premere **Filtra**: restano solo i test della suite `Framework › deepEqual`, gli altri risultano saltati e compare "mostra tutti".
- [ ] **Tutti** riporta all'elenco completo.
- [ ] Il link **solo questa** accanto a una suite e il clic sul nome di un test filtrano su quella suite o su quel test.
- [ ] Aggiungere `?dimostrazione` all'indirizzo: la pagina diventa rossa (titolo con ✗) e mostra
  - il riquadro **Script non caricati** con `tests/framework/script-inesistente.js` e il consiglio sullo ZIP;
  - cinque test falliti nella suite `Dimostrazione › fallimenti voluti` (0 contro -0, differenza in una struttura con il percorso `$.params.index`, eccezione imprevista, test senza asserzioni, tempo scaduto);
  - la suite `Dimostrazione › suite rotta` con l'errore nella definizione;
  - sotto ogni errore, **Dove** apre lo stack.
- [ ] Rinominare temporaneamente `tests/framework/assert.js`: ricaricando, la pagina spiega che il framework non si è caricato e cita lo ZIP. Rimettere il nome giusto.
- [ ] Con il tema scuro del sistema la pagina è scura e leggibile.
- [ ] A larghezza da telefono (Strumenti di sviluppo → Visualizzazione flessibile, 360 px) non c'è scorrimento orizzontale.

---

## Passo 2 — Localizzazione e formato dei numeri

Questo passo è solo logica: si verifica dalla pagina dei test.

- [ ] `tests.html` mostra **"Tutti i test superati"** (95 test).
- [ ] Con il filtro `NumberFormat` restano le suite del formato dei numeri; aprendo `NumberFormat › output Real (§6.10)` si vedono i casi della specifica (`1.005` → `1,01`, `-0.001` → `0`, ...).
- [ ] Con il filtro `Localization` restano le suite della localizzazione, compreso il controllo dei cataloghi (NFR-I18N-06).

---

## Passo 3 — Modello ed espressioni

Anche questo passo è solo logica: si verifica dalla pagina dei test.

- [ ] `tests.html` mostra **"Tutti i test superati"** (151 test).
- [ ] Con il filtro `precedenze` si vedono i casi della §6.3 (`-2 ^ 2` → `(-(2 ^ 2))`, `not x > 5` → `((not x) > 5)`).
- [ ] Con il filtro `tipici` si vedono gli errori della §8.4 (`x = 2,5`, `a AND b`, `'ciao'`, `età`, `.5`, `2x`, ...) con la loro posizione.
