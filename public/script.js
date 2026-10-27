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
// ===== LANGUE FR / EN =====
const drapeaux = {
  fr: `<svg viewBox="0 0 3 2"><rect width="1" height="2" fill="#0055a4"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ef4135"/></svg>`,
  en: `<svg viewBox="0 0 38 20"><rect width="38" height="20" fill="#fff"/><g fill="#b22234"><rect y="0" width="38" height="1.54"/><rect y="3.08" width="38" height="1.54"/><rect y="6.15" width="38" height="1.54"/><rect y="9.23" width="38" height="1.54"/><rect y="12.31" width="38" height="1.54"/><rect y="15.38" width="38" height="1.54"/><rect y="18.46" width="38" height="1.54"/></g><rect width="15.2" height="10.77" fill="#3c3b6e"/></svg>`,
};

const btnLangue = document.getElementById('btn-langue');
let langue = 'fr';
try { langue = localStorage.getItem('langue') || 'fr'; } catch (e) {}

function appliquerLangue(code) {
  // Change chaque texte qui a une étiquette data-i18n
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const texte = traductions[code][el.dataset.i18n];
    if (texte) el.innerHTML = texte;
  });
  document.documentElement.lang = code;

  // Le bouton montre l'AUTRE langue (celle qu'on peut choisir)
  const autre = code === 'fr' ? 'en' : 'fr';
  btnLangue.innerHTML = drapeaux[autre] + `<span>${autre.toUpperCase()}</span>`;

  langue = code;
  try { localStorage.setItem('langue', code); } catch (e) {}
}

btnLangue.addEventListener('click', () => {
  appliquerLangue(langue === 'fr' ? 'en' : 'fr');
});

appliquerLangue(langue);