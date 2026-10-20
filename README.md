# 💚 Il planner di Martina

Planner personale per studiare meglio: to‑do list, materie con progressi di studio e sessioni programmate, sezione tesi, voti ed esami (con medie e stima del voto di laurea), calendario. All'apertura c'è una schermata di benvenuto con una frase motivazionale.

- **Frontend**: sito statico (HTML/CSS/JS, nessuna installazione) → si pubblica gratis su **GitHub Pages**
- **Dati**: un **Foglio Google** collegato tramite Google Apps Script → i dati sono sempre consultabili e modificabili anche a mano
- Funziona anche **offline** e si può **installare sul telefono** come un'app

Tempo necessario: circa 15 minuti, tutto gratuito.

---

## 1. Crea il Foglio Google e il collegamento (Apps Script)

1. Vai su [sheets.google.com](https://sheets.google.com) e crea un **foglio vuoto** (chiamalo ad es. *Planner Martina*). Meglio farlo con l'account Google di Martina, così i dati sono suoi.
2. Menu **Estensioni → Apps Script**.
3. Cancella il codice di esempio e incolla **tutto** il contenuto del file [`apps-script/Code.gs`](apps-script/Code.gs).
4. In alto, nella riga `const TOKEN = 'CAMBIA-QUESTA-PASSWORD';` scrivi una **password a tua scelta** (lunga, senza spazi, ad es. `martina-Studio-2026-xk39`). Serve a impedire che altri scrivano nel foglio.
5. Clicca **Salva** (💾), poi dal menu delle funzioni scegli `setup` e premi **▶ Esegui**. Google chiede le autorizzazioni:
   *Rivedi autorizzazioni → scegli l'account → Avanzate → "Vai a … (non sicuro)" → Consenti*.
   (È normale: lo script è tuo e non è stato "verificato" da Google.) Nel foglio compariranno le schede.
6. **Distribuisci → Nuova distribuzione** → ingranaggio ⚙ **Tipo: App web**
   - Esegui come: **Me**
   - Chi ha accesso: **Chiunque**
   → **Distribuisci** → copia l'**URL dell'app web** (finisce con `/exec`). https://script.google.com/macros/s/AKfycbwkmK2PFmtCiDTdCJXXvEuAbqR78EHiC0RIL81Fp63ddpMVEiX1Fc6xttEvTRLBvwqTjw/exec

> ⚠️ Se in futuro modifichi `Code.gs`, devi fare **Distribuisci → Gestisci distribuzioni → ✏️ → Versione: Nuova versione → Distribuisci**, altrimenti le modifiche non hanno effetto. L'URL resta lo stesso.

## 2. Pubblica il sito su GitHub Pages

1. Crea un account su [github.com](https://github.com) (se non c'è) e un **nuovo repository** (es. `planner`). Può essere pubblico.
2. Carica **tutti i file di questa cartella** nel repository (da web: *Add file → Upload files*, trascinando il contenuto della cartella, **inclusa la cartella `.nojekyll`** se riesci; non è indispensabile).
   Da terminale:
   ```bash
   cd martina-planner
   git init && git add . && git commit -m "Planner di Martina"
   git branch -M main
   git remote add origin https://github.com/TUO-UTENTE/planner.git
   git push -u origin main
   ```
3. Nel repository: **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main` / `/ (root)` → Save**.
4. Dopo 1–2 minuti il sito è online su `https://TUO-UTENTE.github.io/planner/`.

## 3. Collega il sito al foglio

Apri il sito → icona **⚙ Impostazioni** (in alto a destra) → incolla **URL dello script** e **Password** → **Prova connessione** → **Salva**.

Per fare in fretta anche sul telefono di Martina: nelle Impostazioni premi **"Copia link di configurazione"** e mandaglielo in privato: aprendolo, il collegamento si configura da solo.

> 🔒 **Non scrivere URL e password dentro `js/config.js`** se il repository è pubblico: chiunque potrebbe leggerli e scrivere nel foglio. Inseriscili solo dalle Impostazioni (restano salvati nel browser di chi usa il sito).

Da quel momento: ogni modifica viene salvata subito sul dispositivo e inviata al foglio; il sito ricontrolla il foglio ogni minuto e quando si riapre la scheda, così telefono e computer restano allineati. In alto compare lo stato (*Sincronizzato*, *Offline*, …).

## 4. Installarlo sul telefono (facoltativo)

- **iPhone (Safari)**: Condividi → *Aggiungi a Home*
- **Android (Chrome)**: menu ⋮ → *Installa app* / *Aggiungi a schermata Home*

---

## Come si usa

| Sezione | Cosa fa |
|---|---|
| **Da fare** | To‑do con scadenze, priorità e categorie; vista Oggi / Settimana; frase del giorno; prossimo esame e impegni di oggi |
| **Materie** | Materie con colore e CFU; per ognuna gli **argomenti** con stato (*Da studiare → In studio → Studiato → Ripassato*) e percentuale di avanzamento. Scheda **Sessioni di studio**: programma giorno, orario, obiettivo e argomenti; spuntandola puoi segnare studiati gli argomenti |
| **Tesi** | Titolo, relatore, data di discussione con conto alla rovescia, pagine scritte/da scrivere (anche ritmo settimanale consigliato), **tappe** e **diario dei progressi** |
| **Voti** | Esami da sostenere e superati, media aritmetica e ponderata, base di laurea in 110esimi, CFU raggiunti, grafico dei voti, stima del voto di laurea con punti extra |
| **Calendario** | Vista mensile con **tutto insieme**: eventi liberi (con note), esami, sessioni di studio, scadenze, tappe della tesi |

Nelle **Impostazioni** si cambiano nome, CFU totali (180 per la triennale), tema chiaro/scuro e si scarica/ripristina un **backup**.

## Personalizzare

- **Frasi motivazionali**: `js/quotes.js` (una per riga, puoi aggiungerne quante vuoi)
- **Nome e corso** mostrati nell'intro: `js/config.js` (`userName`, `course`) oppure Impostazioni
- **Colori e font**: variabili all'inizio di `css/style.css`

## Struttura

```
index.html            pagina unica
css/style.css         stile
js/config.js          nome, corso, CFU
js/quotes.js          frasi motivazionali
js/store.js           dati locali + sincronizzazione con il foglio
js/app.js             intro, router, form, impostazioni
js/views-*.js         le cinque sezioni
apps-script/Code.gs   codice da incollare in Apps Script (NON serve su GitHub, ma è comodo tenerlo)
manifest.json, sw.js  installazione come app e uso offline
```

## Problemi frequenti

- **"Risposta non valida dallo script"** → la distribuzione non è su *Chiunque*, oppure l'URL non finisce con `/exec`.
- **"Password non valida"** → la password nelle Impostazioni deve essere identica a quella in `Code.gs` (dopo averla cambiata, ridistribuisci una *nuova versione*).
- **"Prima di usare il foglio devi cambiare la password…"** → non hai ancora sostituito `CAMBIA-QUESTA-PASSWORD`.
- **Le modifiche al sito non si vedono** → ricarica la pagina forzando (Ctrl/Cmd + Maiusc + R); su telefono chiudi e riapri l'app.
- **Ho modificato il foglio a mano** → non toccare la riga delle intestazioni né la colonna `id`; il sito rilegge i dati entro un minuto (o premi sulla pillola di stato in alto).
- **Privacy**: chi ha l'URL *e* la password può leggere e scrivere i dati. Non pubblicarli. Il foglio resta privato (solo dell'account che lo possiede).
