require('dotenv').config();
const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ===== BASE DE DONNÉES =====
const db = new Database(path.join(__dirname, 'messages.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    prenom TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    date TEXT DEFAULT (datetime('now', 'localtime'))
  )
`);
const insererMessage = db.prepare(
  'INSERT INTO messages (nom, prenom, email, message) VALUES (?, ?, ?, ?)'
);

// ===== CONNEXION À GMAIL =====
const transporteur = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

function nettoyer(texte) {
  return String(texte || '').trim();
}

// ===== RÉCEPTION DU FORMULAIRE =====
app.post('/contact', async (req, res) => {
  const nom = nettoyer(req.body.nom);
  const prenom = nettoyer(req.body.prenom);
  const email = nettoyer(req.body.email);
  const message = nettoyer(req.body.message);
  const site = nettoyer(req.body.site);

  // Anti-spam : champ piège rempli = robot
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

  // 1) Sauvegarde dans la base (en premier : le message n'est jamais perdu)
  try {
    insererMessage.run(nom, prenom, email, message);
    console.log('💾 Message enregistré dans la base');
  } catch (err) {
    console.error('❌ Erreur base de données :', err.message);
    return res.status(500).json({ ok: false });
  }

  // 2) Envoi de l'e-mail
  try {
    await transporteur.sendMail({
      from: `"Site portfolio" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      replyTo: email,
      subject: `📩 Nouveau message de ${prenom} ${nom}`,
      text: `Nom : ${nom}\nPrénom : ${prenom}\nE-mail : ${email}\n\nMessage :\n${message}`,
    });
    console.log('✅ E-mail envoyé pour', prenom, nom);
  } catch (err) {
    // Le message est déjà sauvegardé : on le signale juste dans le terminal
    console.error('⚠️ E-mail non envoyé (message gardé dans la base) :', err.message);
  }

  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});