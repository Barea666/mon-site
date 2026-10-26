const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Rend accessibles les fichiers du dossier "public" (HTML, CSS, images...)
app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Serveur lancé : http://localhost:${PORT}`);
});