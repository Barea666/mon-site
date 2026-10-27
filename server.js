require('dotenv').config(); // lit le fichier .env
const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, 'public')));

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

  // Envoi de l'e-mail
  try {
    await transporteur.sendMail({
      from: `"Site portfolio" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      replyTo: email, // "Répondre" dans Gmail écrit directement au visiteur
      subject: `📩 Nouveau message de ${prenom} ${nom}`,
      text: `Nom : ${nom}\nPrénom : ${prenom}\nE-mail : ${email}\n\nMessage :\n${message}`,
    });
    console.log('✅ E-mail envoyé pour', prenom, nom);
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Erreur envoi e-mail :', err.message);
    res.status(500).json({ ok: false });
  }
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});