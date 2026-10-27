const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10kb' })); // lit les données envoyées (max 10 Ko)
app.use(express.static(path.join(__dirname, 'public')));

// Enlève les espaces au début et à la fin
function nettoyer(texte) {
  return String(texte || '').trim();
}

// ===== RÉCEPTION DU FORMULAIRE =====
app.post('/contact', (req, res) => {
  const nom = nettoyer(req.body.nom);
  const prenom = nettoyer(req.body.prenom);
  const email = nettoyer(req.body.email);
  const message = nettoyer(req.body.message);
  const site = nettoyer(req.body.site);

  // Anti-spam : si le champ piège est rempli, c'est un robot.
  // On fait semblant que tout va bien, mais on ne fait rien.
  if (site !== '') {
    return res.json({ ok: true });
  }

  // Validation
  const erreurs = [];
  if (nom.length < 2 || nom.length > 60) erreurs.push('nom');
  if (prenom.length < 2 || prenom.length > 60) erreurs.push('prenom');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) erreurs.push('email');
  if (message.length < 10 || message.length > 2000) erreurs.push('message');

  if (erreurs.length > 0) {
    return res.status(400).json({ ok: false, erreurs });
  }

  console.log('📩 Nouveau message :', { nom, prenom, email, message });
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});