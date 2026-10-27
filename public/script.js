// ===== COMPTEURS ANIMÉS =====
const compteurs = document.querySelectorAll('.compteur');

function animer(el) {
  const cible = Number(el.dataset.cible);
  const suffixe = el.dataset.suffixe || '';
  const duree = 1500; // 1,5 seconde
  const debut = performance.now();

  function etape(maintenant) {
    const progres = Math.min((maintenant - debut) / duree, 1);
    const valeur = Math.floor(cible * (1 - Math.pow(1 - progres, 3)));
    el.textContent = valeur + suffixe;
    if (progres < 1) requestAnimationFrame(etape);
  }
  requestAnimationFrame(etape);
}

// Démarre quand le compteur apparaît à l'écran (une seule fois)
const observateur = new IntersectionObserver((entrees) => {
  entrees.forEach((entree) => {
    if (entree.isIntersecting) {
      animer(entree.target);
      observateur.unobserve(entree.target);
    }
  });
}, { threshold: 0.5 });

compteurs.forEach((c) => observateur.observe(c));
// ===== BARRES DE COMPÉTENCES =====
const barres = document.querySelectorAll('.barre');

const observateurBarres = new IntersectionObserver((entrees) => {
  entrees.forEach((entree) => {
    if (entree.isIntersecting) {
      const niveau = entree.target.dataset.niveau;
      entree.target.querySelector('span').style.width = niveau + '%';
      observateurBarres.unobserve(entree.target);
    }
  });
}, { threshold: 0.5 });

barres.forEach((b) => observateurBarres.observe(b));
// ===== QR CODE (carte de visite) =====
const vcard = [
  'BEGIN:VCARD',
  'VERSION:3.0',
  'N:Randriamboavonjy;Kevin',
  'FN:Kevin Randriamboavonjy',
  'TITLE:Assistant virtuel senior',
  'Whatsapp:+261386726340',
  'EMAIL:randriamboavonjyanjatianakevin@gmail.com',
  'END:VCARD'
].join('\n');

new QRCode(document.getElementById('qr'), {
  text: vcard,
  width: 160,
  height: 160,
  colorDark: '#07070b',
  colorLight: '#ffffff'
});
// ===== ANNÉE AUTOMATIQUE (pied de page) =====
document.getElementById('annee').textContent = new Date().getFullYear();