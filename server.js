require("dotenv").config();
const express = require("express");
const path = require("path");
const nodemailer = require("nodemailer");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const app = express();
const PORT = process.env.PORT || 3000;

// Render passe par un proxy : nécessaire pour que l'anti-spam voie la vraie adresse IP
app.set("trust proxy", 1);

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

// ===== BASE DE DONNÉES =====
// Sur Render : la base sera sur le disque permanent (DB_PATH). Sur ton PC : messages.db comme avant.
const db = new Database(
  process.env.DB_PATH || path.join(__dirname, "messages.db"),
);
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
  "INSERT INTO messages (nom, prenom, email, message) VALUES (?, ?, ?, ?)",
);

// ===== CONNEXION À GMAIL =====
const transporteur = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

function nettoyer(texte) {
  return String(texte || "").trim();
}
// ===== LIMITES ANTI-SPAM =====
const limiteContact = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 envois maximum
  handler: (req, res) => res.status(429).json({ ok: false, trop: true }),
});

const limiteAdmin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true, // ne compte que les mots de passe faux
  message: "Trop de tentatives. Réessayez dans 15 minutes.",
});

// ===== RÉCEPTION DU FORMULAIRE =====
app.post("/contact", limiteContact, async (req, res) => {
  const nom = nettoyer(req.body.nom);
  const prenom = nettoyer(req.body.prenom);
  const email = nettoyer(req.body.email);
  const message = nettoyer(req.body.message);
  const site = nettoyer(req.body.site);

  // Anti-spam : champ piège rempli OU envoi trop rapide (< 3 s) = robot
  const duree = Number(req.body.duree) || 0;
  if (site !== "" || duree < 3000) {
    return res.json({ ok: true }); // on fait semblant, mais on ne fait rien
  }

  // Validation
  const erreurs = [];
  if (nom.length < 2 || nom.length > 60) erreurs.push("nom");
  if (prenom.length < 2 || prenom.length > 60) erreurs.push("prenom");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120)
    erreurs.push("email");
  if (message.length < 10 || message.length > 2000) erreurs.push("message");

  if (erreurs.length > 0) {
    return res.status(400).json({ ok: false, erreurs });
  }

  // 1) Sauvegarde dans la base (en premier : le message n'est jamais perdu)
  try {
    insererMessage.run(nom, prenom, email, message);
    console.log("💾 Message enregistré dans la base");
  } catch (err) {
    console.error("❌ Erreur base de données :", err.message);
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
    console.log("✅ E-mail envoyé pour", prenom, nom);
  } catch (err) {
    // Le message est déjà sauvegardé : on le signale juste dans le terminal
    console.error(
      "⚠️ E-mail non envoyé (message gardé dans la base) :",
      err.message,
    );
  }

  res.json({ ok: true });
});
// ===== PROTECTION DE L'ADMIN =====
// Compare deux textes sans laisser d'indice sur le temps de comparaison
function egal(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function protegerAdmin(req, res, next) {
  const motDePasseAttendu = process.env.ADMIN_PASSWORD;
  const entete = req.headers.authorization || "";

  if (motDePasseAttendu && entete.startsWith("Basic ")) {
    const texte = Buffer.from(entete.slice(6), "base64").toString();
    const i = texte.indexOf(":");
    const utilisateur = texte.slice(0, i);
    const motDePasse = texte.slice(i + 1);
    if (utilisateur === "admin" && egal(motDePasse, motDePasseAttendu)) {
      return next(); // accès autorisé
    }
  }
  res.set("WWW-Authenticate", 'Basic realm="Admin"');
  res.status(401).send("Accès refusé");
}

// ===== ROUTES ADMIN =====
app.get("/admin", limiteAdmin, protegerAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "admin.html"));
});

app.get("/api/messages", limiteAdmin, protegerAdmin, (req, res) => {
  const messages = db.prepare("SELECT * FROM messages ORDER BY id DESC").all();
  res.json(messages);
});

app.delete("/api/messages/:id", limiteAdmin, protegerAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({ ok: false });
  }
  const resultat = db.prepare("DELETE FROM messages WHERE id = ?").run(id);
  res.json({ ok: resultat.changes === 1 });
});

app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
