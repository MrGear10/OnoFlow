# OnoFlow

**Editor web di diagrammi di flusso, compatibile con i file `.fprg` di Flowgorithm.**

OnoFlow serve a scuola: si costruisce un diagramma di flusso, lo si esegue con la console e lo si salva come file `.fprg`. Funziona nel browser, sul computer del laboratorio e sul telefono, senza installare nulla e senza account.

> OnoFlow è un **progetto indipendente**, non affiliato a Flowgorithm né ai suoi autori. "Compatibile" vuol dire che legge e scrive lo stesso formato di file.

## Cosa si può fare

- **Aprire** un file `.fprg` (pulsante o trascinamento sulla pagina) o partire da uno degli **esempi** del menu.
- **Costruire e modificare** il diagramma: il + sulle frecce inserisce un blocco (dichiarazione, assegnazione, input, output, if, while, do, for); un tocco seleziona, un secondo tocco modifica; Elimina toglie un blocco con il suo contenuto; Annulla e Ripeti (anche Ctrl + Z e Ctrl + Y).
- **Eseguire** il programma: l'output e gli input nella console; Pausa e Ferma anche con un ciclo infinito; gli errori segnati in rosso sul blocco, con un messaggio pensato per lo studente.
- **Salvare** il file `.fprg`: un file aperto si riscrive cambiando solo quello che si è modificato.
- Sul **telefono** diagramma e console stanno in due schede; zoom con due dita.

## Come si usa

- **Online:** dall'indirizzo di GitHub Pages del repository. Sui telefoni si usa così.
- **Offline, sul computer:** scaricare lo ZIP del repository (Code → Download ZIP), estrarlo e aprire `index.html` con un doppio clic. Funziona da `file://`, senza rete; in fondo alla pagina compare "Copia locale".

Browser di riferimento: Firefox (anche su Linux), Chrome su Android, Safari su iPhone e iPad.

## Privacy

- **I file non lasciano il browser.** Si leggono sul dispositivo e si salvano con un download. Non c'è un server di OnoFlow e la pagina non usa risorse esterne: niente font remoti, statistiche o cookie.
- **Nessun dato salvato.** Niente `localStorage`, cookie o cronologia. L'unica eccezione è una **copia di sessione** del diagramma aperto (testo del file, nome, stato "salvato" e origine) in `sessionStorage`, perché un ricaricamento o una scheda chiusa dal telefono non facciano perdere il lavoro. Resta solo in quella scheda di quel dispositivo, il browser la cancella quando la scheda si chiude e non viene mai inviata. Se `sessionStorage` non c'è (per esempio in navigazione privata) l'app funziona lo stesso, senza ripristino.
- **Hosting.** La versione online è ospitata su **GitHub Pages**, un servizio di GitHub, Inc., con sede negli **Stati Uniti, quindi fuori dall'Unione Europea**. Secondo la documentazione di GitHub, di ogni visitatore "l'indirizzo IP viene registrato e conservato per motivi di sicurezza", anche senza un account GitHub. OnoFlow non invia altri dati. Vedi l'[informativa sulla privacy di GitHub](https://docs.github.com/site-policy/privacy-policies/github-general-privacy-statement). La copia offline non contatta GitHub.
- **Dati nei file `.fprg`.** Un file creato con Flowgorithm contiene il **nome utente e il nome del computer** di chi l'ha creato e modificato (negli attributi `authors`, `created` ed `edited`, gli ultimi due codificati in Base64). OnoFlow non li aggiunge, ma **non li toglie**: un file aperto e risalvato li conserva. Un file creato da zero in OnoFlow ha solo il nome, `authors` e `about` vuoti e la data di salvataggio.

## Sviluppo

Progettato da **MrGear10** e sviluppato con l'assistenza di **Claude (Anthropic)**.

- Nessuna dipendenza e nessun passaggio di build: il repository è già l'applicazione (`index.html`, `css/`, `js/`).
- **Test:** aprire `tests.html` nel browser, anche da `file://`.
- **Verifiche automatiche** (facoltative, servono Node.js e Playwright, solo nella cartella `tools/`):

  ```sh
  cd tools
  npm install
  npx playwright install
  node run-tests.mjs --engines chromium,firefox   # i test di tests.html
  node check-ui.mjs                               # la pagina vera, su computer e telefono
  ```

- Documenti: [`OnoFlow_progetto.md`](OnoFlow_progetto.md) (specifica), [`DECISIONI.md`](DECISIONI.md) (decisioni prese durante lo sviluppo), [`PRODUCT.md`](PRODUCT.md) e [`DESIGN.md`](DESIGN.md) (prodotto e sistema visivo), [`docs/checklist-manuale.md`](docs/checklist-manuale.md) (controlli a mano).

## Licenza

[MIT](LICENSE).
