/**
 * Impostazioni di base del planner.
 *
 * Il modo più sicuro per collegare il Foglio Google è NON scrivere qui URL e password
 * (il repository GitHub è pubblico!) ma inserirli dal sito: ingranaggio ⚙ → Impostazioni,
 * oppure con il "link di configurazione" che il sito genera per te.
 */
window.PLANNER_CONFIG = {
  userName: 'Martina',                 // Nome mostrato nel benvenuto
  course: 'Assistenza sanitaria',      // Corso di studi (compare nell'intro)
  totalCfu: 180,                       // CFU totali per la laurea (triennale = 180)
  apiUrl: '',                          // URL "/exec" di Apps Script (meglio lasciare vuoto, vedi sopra)
  token: '',                           // Password dello script (meglio lasciare vuoto)
  pollSeconds: 60                      // Ogni quanti secondi controlla se il foglio è cambiato
};
