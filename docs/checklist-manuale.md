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

---

## Passo 4 — Formato `.fprg`

Anche questo passo è solo logica: si verifica dalla pagina dei test. L'apertura e il salvataggio veri, con i pulsanti, arrivano al passo 6.

- [ ] `tests.html` mostra **"Tutti i test superati"** (182 test).
- [ ] Con il filtro `round-trip` si vedono i test di QA-05: il campione dell'Appendice A riesportato identico (salvo `saved`), anche con a capo CRLF e BOM.
- [ ] Con il filtro `lettura` si vedono le regole FMT-R (file non validi, elementi sconosciuti, avvisi).

---

## Passo 5 — Interprete e scheduler

Ancora solo logica: l'esecuzione con i pulsanti arriva al passo 6.

- [ ] `tests.html` mostra **"Tutti i test superati"** (267 test), in pochi secondi.
- [ ] Con il filtro `QA-04` si vede il caso di riferimento: l'Appendice A con gli input `5, s, 3, n, 4, 9` produce le tre righe finali attese.
- [ ] Con il filtro `Scheduler` passa anche l'ultimo test, quello con i timer veri: un ciclo infinito non blocca la pagina e Ferma risponde subito.

---

## Passo 6 — Interfaccia minima

Aprire `index.html` con doppio clic, in Firefox. Poi le stesse prove da telefono (Android e iPhone), dalla copia pubblicata.

- [ ] `tests.html` mostra **"Tutti i test superati"** (292 test).
- [ ] All'apertura: foglio a quadretti con Inizio e Fine, lavagna vuota a destra con il suo messaggio; nel piè di pagina "Copia locale".
- [ ] **Menu → Esempi → Somma, massimo e minimo**: compare lo schema del diagramma; nel campo in alto `somma-massimo-minimo.fprg`.
- [ ] **Esegui**, poi nella console `5`, `s`, `3`, `n`, `4`, `9`, ognuno con Invio: i valori restano in giallo, il blocco in attesa è evidenziato in giallo sul foglio, alla fine le tre righe di QA-04 e "Esecuzione terminata.".
- [ ] Durante l'attesa di un valore, Pausa è barrato; Nuovo, Apri ed Esempi nel menu sono barrati.
- [ ] Scrivere `2,5` quando il programma chiede un numero: compare il messaggio "accetta solo numeri interi" e il valore viene richiesto di nuovo.
- [ ] Cambiare il nome nel campo in alto e scegliere **Menu → Salva**: si scarica un file con quel nome e `.fprg`; riaprendolo con **Menu → Apri…** il diagramma è lo stesso.
- [ ] **Apri…** su un file che non è un diagramma (per esempio un `.txt`): barra rossa con il motivo, il diagramma di prima resta.
- [ ] Ricaricare la pagina (F5): il diagramma torna, con la barra "Il diagramma è stato ripristinato".
- [ ] Un file con un errore di sintassi (per esempio `x = 2,5` in un'assegnazione) si apre con il blocco cerchiato in rosso, l'onda sotto `2,5` e il messaggio sotto il blocco; Esegui elenca gli errori nella console.
- [ ] Un ciclo infinito (`while true`): dopo circa 5 secondi la console chiede se continuare; **Continua** riprende, **Ferma** ferma e mostra il blocco e le variabili.
- [ ] Tutto da tastiera: Tab arriva ai comandi con le parentesi del focus; nel menu le frecce scorrono le voci, Esc lo chiude.
- [ ] Tema scuro del sistema: foglio blu notte, lavagna più scura, tutto leggibile.
- [ ] Al proiettore, dal fondo dell'aula: testo del diagramma e della console leggibile.
- [ ] **Telefono:** schede Diagramma e Console in basso; Esegui porta da solo alla console; il campo della console resta sopra la tastiera (Android e iPhone); toccando un campo la pagina non si ingrandisce; nessuno scorrimento orizzontale; dopo un errore **Mostra nel diagramma** porta al blocco.
- [ ] **iPhone:** Salva mette il file in File → Download con il nome e l'estensione `.fprg` (FR-MOB-20).
