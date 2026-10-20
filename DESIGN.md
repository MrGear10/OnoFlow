---
name: OnoFlow
description: Editor web di diagrammi di flusso, compatibile con i file .fprg
colors:
  paper: "#ffffff"
  paper-grid: "#e3e9f1"
  paper-margin: "#e7a9a9"
  ink: "#1c3594"
  ink-soft: "#4d5f9c"
  text: "#15171c"
  text-muted: "#555a66"
  chrome: "#f4f5f7"
  chrome-line: "#c9ced8"
  line: "#d5dae3"
  on-ink: "#ffffff"
  pen: "#c0141c"
  pen-soft: "#fbe9e9"
  highlighter: "#fff06b"
  on-highlighter: "#15171c"
  warning: "#8a5a00"
  warning-soft: "#fdf3dc"
  info-soft: "#e8edf9"
  slate: "#213a33"
  slate-line: "#3c5a50"
  chalk: "#eef0e8"
  chalk-muted: "#b4c3b9"
  chalk-yellow: "#f3d75f"
  chalk-pen: "#ff9d93"
  chalk-field: "#2b4840"
typography:
  title:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.45
    letterSpacing: "-0.01em"
  content:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.45
  content-code:
    fontFamily: "ui-monospace, SFMono-Regular, Cascadia Mono, DejaVu Sans Mono, Liberation Mono, Menlo, Consolas, monospace"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.45
  body:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.45
rounded:
  radius: "4px"
  bracket: "2px"
  row: "1.25em"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-6: "1.5rem"
  square: "1.25rem"
  gutter: "1rem"
  touch: "2.75rem"
  bar-height: "3.5rem"
  tabs-height: "3.5rem"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.radius}"
    padding: "0 0.75rem"
    height: "{spacing.touch}"
  button-hover:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.ink}"
  button-pressed:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
  button-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-ink}"
    typography: "{typography.body}"
    rounded: "{rounded.radius}"
    padding: "0 0.75rem"
    height: "{spacing.touch}"
  button-primary-hover:
    backgroundColor: "{colors.ink-soft}"
    textColor: "{colors.on-ink}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.radius}"
    width: "{spacing.touch}"
    height: "{spacing.touch}"
  button-chalk:
    backgroundColor: "transparent"
    textColor: "{colors.chalk}"
    rounded: "{rounded.radius}"
    padding: "0 0.75rem"
    height: "{spacing.touch}"
  button-chalk-hover:
    backgroundColor: "{colors.chalk-field}"
    textColor: "{colors.chalk}"
  button-chalk-pressed:
    backgroundColor: "{colors.chalk}"
    textColor: "{colors.slate}"
  input-file-name:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text}"
    typography: "{typography.content-code}"
    rounded: "{rounded.radius}"
    padding: "0 0.5rem"
    height: "{spacing.touch}"
  input-console:
    backgroundColor: "{colors.chalk-field}"
    textColor: "{colors.chalk-yellow}"
    typography: "{typography.content-code}"
    rounded: "0"
    padding: "0 0.5rem"
    width: "14ch"
    height: "{spacing.touch}"
  menu:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text}"
    rounded: "{rounded.radius}"
    padding: "0.5rem 0"
  menu-item:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    padding: "0 1rem"
    height: "{spacing.touch}"
  menu-item-hover:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.text}"
  tab:
    backgroundColor: "transparent"
    textColor: "{colors.text-muted}"
    typography: "{typography.body}"
    padding: "0 0.75rem"
    height: "{spacing.tabs-height}"
  tab-selected:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
  notice-info:
    backgroundColor: "{colors.info-soft}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
  notice-error:
    backgroundColor: "{colors.pen-soft}"
    textColor: "{colors.pen}"
  notice-warning:
    backgroundColor: "{colors.warning-soft}"
    textColor: "{colors.text}"
  block-row:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    typography: "{typography.content}"
    rounded: "{rounded.row}"
    padding: "0.35em 0.6em"
  block-row-running:
    backgroundColor: "{colors.highlighter}"
    textColor: "{colors.on-highlighter}"
  sheet:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.text}"
    typography: "{typography.content}"
  slate:
    backgroundColor: "{colors.slate}"
    textColor: "{colors.chalk}"
    typography: "{typography.content-code}"
    padding: "{spacing.square}"
---

# Design System: OnoFlow

## Overview

**Creative North Star: "Il quaderno e la lavagna"**

Il diagramma sta su un foglio di quaderno a quadretti, con il margine rosso; la console è una lavagna d'ardesia scritta col gesso. Sopra questi due materiali gli stati dell'esecuzione si segnano come la segnaletica stradale: ogni segno ha un solo significato e non si usa per altro. Inchiostro blu da biro per i blocchi e i comandi, penna rossa solo per gli errori, evidenziatore giallo solo per il blocco in esecuzione, gesso giallo solo per i valori digitati nella console.

La densità è bassa e il contrasto del contenuto è massimo, perché la priorità è il docente al proiettore: diagramma e console usano un corpo più grande del resto dell'interfaccia e crescono ancora sugli schermi da 80rem in su. Il resto (barra, menu, piè di pagina) resta sottile e grigio-carta, perché non competa con il contenuto. Tutto è disegnato con linee a un pixel su superfici piatte: niente ombre, rilievi o sfumature decorative, solo font di sistema (nessuna risorsa esterna, NFR-PRIV-02). La metafora resta sobria: il quaderno è suggerito dai quadretti e dal margine, non da texture, carta strappata o caratteri scritti a mano. Si rifiutano la tela grigia da editor di forme e la barra piena di icone.

Il diagramma, al passo 6, è uno **schema testuale provvisorio** (DEC-052): un elenco rientrato sul foglio, una riga per blocco con la piccola forma del suo tipo. Il renderer SVG arriva al passo 7 e sostituirà solo il disegno, collegato agli stessi ID; gli stati (evidenziatore, penna rossa, onda nel punto esatto) sono già quelli definitivi.

**Key Characteristics:**
- Due superfici fisse: foglio a quadretti (diagramma) e lavagna (console), affiancati su computer, una alla volta sul telefono.
- Un significato per segno: blu = blocchi e comandi, rosso = errore, giallo evidenziatore = in esecuzione, giallo gesso = valore digitato.
- Linee a un pixel, superfici piatte, nessuna ombra.
- Grammatica dei comandi: premuto pieno, focus tra parentesi quadre, disabilitato barrato.
- Il quadretto (`--square`) è l'unità di spazio del foglio.
- Contenuto grande e ad alto contrasto, cornice dell'interfaccia piccola e tenue.

## Colors

Una carta bianca e fredda con inchiostro blu scuro, una cornice grigio-chiara, una lavagna verde scura; i colori di stato sono pochi, saturi e ciascuno riservato a un solo significato.

### Primary
- **Inchiostro di biro** (`ink`): blocchi del diagramma (forme, parole chiave, Inizio e Fine), titoli delle funzioni, marchio, bordi e testo dei pulsanti, pulsante principale pieno, scheda attiva, anello del focus, segno "Non salvato".
- **Inchiostro diluito** (`ink-soft`): filo del flusso a sinistra dei blocchi annidati, etichette dei rami Vero/Falso, hover del pulsante principale, barra di scorrimento del foglio.
- **Su inchiostro** (`on-ink`): testo e icone sopra l'inchiostro pieno (pulsante principale, stato premuto).

### Secondary
- **Ardesia** (`slate`): sfondo della console. Resta scura in entrambi i temi.
- **Gesso** (`chalk`): testo della console e dei pulsanti sulla lavagna.
- **Gesso sbiadito** (`chalk-muted`): testi secondari sulla lavagna (console vuota, "Esecuzione terminata.", intestazioni della tabella delle variabili, segnaposto del campo).
- **Riga d'ardesia** (`slate-line`): separatori sulla lavagna e bordo tra foglio e lavagna.
- **Campo d'ardesia** (`chalk-field`): fondo del campo di input in linea e hover dei pulsanti di gesso.

### Tertiary (segni di stato)
- **Penna rossa** (`pen`): solo errori. Cerchio attorno al blocco, onda sotto il punto esatto, messaggio sotto il blocco, riepilogo degli errori, stato "Terminato con un errore" e "Non eseguito", bordo inferiore dell'avviso d'errore, pallino rosso sulla scheda Console.
- **Velo di penna** (`pen-soft`): fondo dell'avviso d'errore.
- **Evidenziatore** (`highlighter`) con **testo sotto evidenziatore** (`on-highlighter`): solo il blocco in esecuzione sul foglio e il quadratino dello stato "In esecuzione".
- **Gesso giallo** (`chalk-yellow`): solo i valori digitati nella console (campo, testo digitato, cursore, sottolineatura del campo, parentesi del focus sulla lavagna).
- **Gesso rosso** (`chalk-pen`): la penna rossa sulla lavagna, per i messaggi d'errore della console.
- **Ocra d'avviso** (`warning`) e **velo d'avviso** (`warning-soft`): avviso di file aperto con avvisi (bordo e fondo).
- **Velo d'inchiostro** (`info-soft`): hover dei pulsanti e delle voci di menu, avviso informativo, selezione del testo, scheda premuta.

### Neutral
- **Carta** (`paper`): fondo del foglio, del menu, del campo del nome file e del piè di pagina.
- **Quadretto** (`paper-grid`): la griglia del foglio, tenue.
- **Margine** (`paper-margin`): la riga verticale del margine del quaderno.
- **Testo** (`text`) e **testo tenue** (`text-muted`): testo del contenuto; piè di pagina, intestazioni del menu, comandi disabilitati.
- **Cornice** (`chrome`) e **riga di cornice** (`chrome-line`): barra superiore, schede del telefono e i loro bordi; bordo del campo del nome file.
- **Riga** (`line`): separatori interni (menu, piè di pagina), bordo dei pulsanti disabilitati.

### Tema scuro
Segue il sistema (`prefers-color-scheme`, NFR-ACC-02) e ridefinisce gli stessi token in `css/tokens.css`; i segni conservano il loro significato. Il foglio diventa carta blu notte (`paper` #12161e, quadretti #1f2633, margine #6a2f35) con inchiostro chiaro (`ink` #a8bfff, `on-ink` #10131a); la cornice è #1a1f29; la penna rossa si schiarisce (#ff7b73) e l'evidenziatore resta giallo (#f5e15a). La lavagna diventa più scura del foglio (`slate` #172a24, `chalk-field` #213a33), separata da una riga (#335046). Il colore della barra del browser segue la cornice (`theme-color` #f4f5f7 / #1a1f29).

### Named Rules
**La regola del segno unico.** Ogni colore di stato ha un solo significato e non si presta ad altro: il rosso è solo errore, il giallo evidenziatore è solo il blocco in esecuzione, il giallo gesso è solo ciò che si è digitato. "Fermato" non è un errore e non usa la penna rossa (DEC-055).

**La regola della lavagna scura.** La console è ardesia scura in entrambi i temi; nel tema scuro è più scura del foglio, non più chiara.

## Typography

**Font dell'interfaccia:** `system-ui` (con -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, sans-serif)
**Font del codice:** `ui-monospace` (con SFMono-Regular, Cascadia Mono, DejaVu Sans Mono, Liberation Mono, Menlo, Consolas, monospace)

**Character:** solo font di sistema, per privacy e funzionamento offline; il monospazio distingue ciò che lo studente scrive (campi dei blocchi, nome del file, console) dalla lingua dell'interfaccia.

### Hierarchy
- **Title** (700, 1.25rem, 1.45): marchio "OnoFlow" (-0.01em; 1.125rem sotto i 56rem) e nome della funzione sopra il suo schema.
- **Content** (400, 1.125rem, 1.45; 1.25rem da 80rem in su): righe del diagramma; parole chiave dei blocchi in 600 e inchiostro. Si legge da fondo aula.
- **Content code** (monospazio, stessa misura di Content): console intera; nel diagramma i campi dei blocchi a 0.95em.
- **Body** (400, 1rem, 1.45): testo della cornice, voci di menu, avvisi, messaggi d'errore sotto il blocco (600, penna rossa), note della console in font dell'interfaccia. Righe lunghe limitate a 60ch (messaggi) e 75ch (piè di pagina).
- **Label** (600, 0.875rem): stato dell'esecuzione, "Non salvato", etichette Vero/Falso, intestazioni della tabella delle variabili, pulsanti piccoli. Le intestazioni del menu e il piè di pagina usano la stessa misura a 400, in testo tenue.

I campi di testo non scendono mai sotto 16px (`max(16px, 1em)`), perché Safari su iOS non ingrandisca la pagina. Numeri della tabella delle variabili in cifre tabulari.

### Named Rules
**La regola della distanza.** Diagramma e console usano `--text-content`, sempre più grande del corpo dell'interfaccia; sugli schermi grandi crescono insieme al quadretto. Un testo di contenuto non scende alla misura della cornice.

**La regola del monospazio.** Il monospazio è per ciò che lo studente scrive o legge come programma; frasi, messaggi e comandi restano nel font dell'interfaccia, anche sulla lavagna.

## Layout

L'applicazione occupa l'altezza visibile (`--viewport-height` da visualViewport, con ripiego su 100dvh) in una griglia a quattro righe: barra, avvisi, zona di lavoro, schede. La pagina non scorre: scorrono solo il foglio e la lavagna, con `overscroll-behavior: contain`.

- **Da 56rem in su (computer, tablet orizzontale):** foglio e lavagna affiancati, colonne 3fr e 2fr (la lavagna almeno 20rem), separati da una riga d'ardesia. La barra è su una riga: marchio, nome del file con "Non salvato" e stato, poi a destra Esegui, Pausa, Ferma e Menu.
- **Sotto i 56rem (telefono, tablet verticale):** una zona alla volta a tutto schermo, schede Diagramma e Console in basso; con la tastiera aperta le schede si nascondono. La barra va su due righe (marchio e comandi sopra; nome del file e stato sotto), il margine laterale scende a 0.75rem, il margine del foglio si stringe a un quadretto.
- **Sotto i 27.5rem:** Pausa e Ferma mostrano solo l'icona, con il nome per i lettori di schermo; Esegui conserva l'etichetta.
- **Da 80rem in su (proiettore):** `--text-content` passa a 1.25rem e il quadretto a 1.375rem.
- **Aree sicure:** barra, schede, avvisi e piè di pagina rispettano `env(safe-area-inset-*)`.

Il foglio ha un rientro sinistro pari al margine (due quadretti) più un quadretto; le righe dei blocchi sono alte almeno due quadretti e tra due funzioni c'è uno spazio di due quadretti. Fuori dal foglio la scala è `space-1`…`space-6` (4–24px). Ogni area da toccare misura almeno `--touch` (44px).

### Named Rules
**La regola del quadretto.** Sul foglio le distanze si contano in quadretti (`--square`): margine, rientri, altezza delle righe, spazio tra funzioni.

## Elevation & Depth

Il sistema è piatto: non ci sono ombre né rilievi. La profondità si esprime solo con il cambio di superficie (cornice grigia, carta bianca, ardesia scura) e con linee a un pixel. Il menu, l'unico elemento sovrapposto, si stacca con un bordo pieno del colore del testo, non con un'ombra.

I gradienti CSS compaiono solo come strumento di disegno, mai come sfumatura: la griglia e il margine del foglio sono `linear-gradient` a bordi netti, e la maschera delle parentesi del focus è un gradiente a gradini. L'unica `box-shadow` (inset, 2px di inchiostro ai due lati della voce di menu a fuoco) è un tratto, non un'ombra.

### Named Rules
**La regola del foglio piatto.** Nessuna superficie proietta ombre o ha sfumature; ciò che si sovrappone si separa con una linea.

## Shapes

Angoli appena smussati (4px) per pulsanti, campo del nome file e menu; il campo della console è squadrato, con la sola riga di gesso giallo sotto, come una riga di lavagna. La riga di un blocco ha un raggio ampio (1.25em) che resta invisibile a riposo e diventa il cerchio di penna rossa quando c'è un errore (bordo di 2px). I segni dello stato accanto al nome del file sono forme geometriche con un significato fisso: quadrato giallo (in esecuzione), quadrato vuoto a bordo doppio (in pausa), quadrato d'ardesia con base di gesso giallo (in attesa di un valore), cerchio rosso (errore o non eseguito), quadrato a bordo doppio (fermato), quadrato pieno d'inchiostro (terminato). I pallini (0.5rem) segnano "Non salvato" e le novità sulla scheda Console.

**Firma dei blocchi nello schema provvisorio.** Ogni tipo ha una piccola forma (28×18, tratto 1.5 non scalabile, inchiostro) dalle forme classiche dei diagrammi di flusso: terminale a pillola (Inizio, Fine), rettangolo con riga in alto (dichiarazione), rettangolo (assegnazione), parallelogramma (input e output), rombo (if), esagono (while, do, for), rettangolo con due righe verticali (chiamata), parentesi aperta (commento). Il do occupa due righe: `do` in alto e `while …` in fondo. I blocchi annidati pendono da un filo verticale a un pixel di inchiostro diluito.

Le icone dei comandi sono SVG in linea a 20px, tratto 1.75 arrotondato; quelle dei comandi pieni (Esegui, Ferma) sono riempite.

### Named Rules
**La regola delle parentesi.** Il focus da tastiera si traccia come due parentesi quadre (2px, inchiostro; gesso sulla lavagna, gesso giallo sul campo della console) attorno al comando o al campo, non come un alone.

**La regola del barrato.** Un comando non disponibile è barrato da una riga sottile, come un'indicazione che non vale; con la sola icona la riga diventa diagonale.

## Components

### Buttons
Comandi a contorno, in inchiostro, con il nome all'imperativo (Esegui, Pausa, Riprendi, Ferma; DEC-053).
- **Shape:** angoli smussati (4px), bordo di 1px, area minima 44×44px, etichetta 600.
- **Primario (Esegui):** inchiostro pieno con testo su inchiostro; hover in inchiostro diluito.
- **Normale (Pausa, Ferma):** contorno d'inchiostro su fondo trasparente; hover col velo d'inchiostro (solo con il mouse).
- **Premuto:** pieno d'inchiostro, con una leggera contrazione (scale 0.97, 100ms); Pausa resta piena mentre è attiva (`aria-pressed`).
- **Focus:** parentesi quadre attorno al pulsante.
- **Disabilitato:** testo tenue, bordo di riga, barrato.
- **Quieto (Menu):** senza bordo; sul telefono solo l'icona.
- **Gesso:** sulla lavagna (Continua, Ferma, Mostra nel diagramma), contorno di gesso sbiadito e testo di gesso; premuto pieno di gesso con testo d'ardesia.

### Inputs / Fields
- **Nome del file:** carta, bordo di riga di cornice, 4px, monospazio a 16px, altezza 44px; il testo lungo finisce con i puntini. Focus: bordo d'inchiostro e parentesi sul contenitore.
- **Input in linea della console:** sulla stessa riga dell'ultimo output, 14ch, fondo di campo d'ardesia, sottolineatura e testo in gesso giallo, nessun raggio. Focus: parentesi di gesso giallo. Un valore non valido produce una nota in gesso rosso sopra il campo, senza finestre modali.

### Navigation
- **Menu:** si apre sotto il pulsante Menu, allineato a destra, su carta con bordo pieno del colore del testo; sezioni File, Esempi, Modifica separate da una riga, con intestazioni tenui in piccolo. Voci alte 44px; hover e focus col velo d'inchiostro, il focus anche con due tratti d'inchiostro ai lati; premuta piena d'inchiostro; disabilitata barrata.
- **Schede (solo sotto i 56rem):** Diagramma e Console in basso, a metà larghezza ciascuna, icona più nome, alte 3.5rem. Attiva in inchiostro con una riga di 2px in alto; inattiva in testo tenue. Sulla scheda Console un pallino d'inchiostro segnala output nuovo, un pallino rosso un errore.

### Notices (avvisi in linea)
Barra non bloccante sotto la barra superiore, a tutta larghezza, con il pulsante Chiudi a destra. Informativo con il velo d'inchiostro; errore con il velo di penna, bordo inferiore rosso e prima frase in penna rossa 600; avviso con velo e bordo ocra. Gli elenchi di dettagli vanno a capo dentro la barra.

### Stato dell'esecuzione
Testo in Label accanto al nome del file, preceduto dal suo segno (vedi Shapes); per gli errori anche il testo è in penna rossa. Annunciato ai lettori di schermo (`role="status"`).

### Riga del blocco (signature)
La riga è larga quanto il suo testo: forma del tipo, poi il testo esattamente come è scritto, con parole chiave in inchiostro 600 e campi in monospazio. **In esecuzione:** fondo d'evidenziatore, testo e forma in testo sotto evidenziatore; la transizione del fondo dura 160ms. **Errore:** cerchio di penna rossa (2px) attorno alla riga, onda rossa (2px) sotto il punto esatto del campo, o un trattino rosso di 3px dove manca qualcosa; il messaggio in penna rossa 600 subito sotto, entro 60ch. Sopra lo schema, un riepilogo in penna rossa conta gli errori.

### Lavagna (console)
Testo in gesso, monospazio, alla misura del contenuto. Valori digitati in gesso giallo. Le note (fine, fermato, errore, domanda dopo 5 secondi) stanno nel flusso, in font dell'interfaccia: fine in gesso sbiadito, errori in gesso rosso con il blocco coinvolto in monospazio, il pulsante "Mostra nel diagramma" e la tabella delle variabili di quel momento (righe d'ardesia, intestazioni piccole e sbiadite, cifre tabulari). Se l'output supera circa 200.000 caratteri, una nota sbiadita in alto avvisa che le righe più vecchie sono state tolte.

### Movimento
Breve e funzionale: 100ms per il premuto (fondo, colore, contrazione), 160ms per il cambio di stato della riga del blocco, entrambi con `cubic-bezier(0.22, 1, 0.36, 1)`. Con `prefers-reduced-motion` le transizioni si annullano.

## Do's and Don'ts

### Do:
- **Do** usare l'evidenziatore (`highlighter`) solo per il blocco in esecuzione e il suo segno di stato.
- **Do** usare la penna rossa (`pen`, `chalk-pen` sulla lavagna) solo per gli errori, con il cerchio sul blocco e l'onda nel punto esatto.
- **Do** scrivere diagramma e console a `--text-content` e contare gli spazi del foglio in quadretti.
- **Do** garantire 44px (`--touch`) a ogni area da toccare e 16px minimi ai campi di testo.
- **Do** separare le superfici con linee a un pixel e il cambio di fondo.
- **Do** segnare il focus con le parentesi quadre, il premuto con il pieno, il disabilitato con il barrato.
- **Do** tenere gli hover dietro `(hover: hover) and (pointer: fine)`.

### Don't:
- **Don't** usare il rosso per "Fermato" o per qualsiasi cosa che non sia un errore.
- **Don't** usare il giallo sul foglio per altro che il blocco in esecuzione.
- **Don't** aggiungere ombre, rilievi o sfumature decorative; i gradienti servono solo a disegnare linee nette.
- **Don't** caricare font remoti o risorse esterne: solo font di sistema.
- **Don't** spingere la metafora fino al costume (texture di carta, scrittura a mano, aria da giocattolo).
- **Don't** usare finestre modali per input, domande o errori della console: stanno nel flusso.

## Decisioni aperte

- **Punto di inserimento:** non ancora disegnato. L'invito "Toccare la freccia per inserire il primo blocco" e la freccia attiva arrivano con l'editor (passo 9); il disegno del punto di inserimento a ogni livello di zoom resta da decidere con il renderer SVG (passo 7). Per ora il diagramma vuoto rimanda al menu.
- **Firma visiva dei blocchi nel diagramma vero:** lo schema provvisorio fissa già una forma per tipo (vedi Shapes), ma dimensioni, riempimenti, frecce e connettori del disegno SVG si decidono al passo 7.
- **Lavagna nel tema chiaro e foglio nel tema scuro:** il costruito ha scelto (lavagna verde scura anche nel tema chiaro; foglio blu notte con quadretti scuri nel tema scuro), ma la scelta non è ancora stata confermata dall'autore.
