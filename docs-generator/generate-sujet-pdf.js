const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'docs', 'Comprendre-le-sujet-BH-Assurance.pdf');

const doc = new PDFDocument({ size: 'A4', margin: 40 });
doc.pipe(fs.createWriteStream(outputPath));

doc.registerFont('Arial', 'C:/Windows/Fonts/arial.ttf');
doc.registerFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf');

const colors = {
  primary: '#1e40af',
  secondary: '#0f766e',
  accent: '#b45309',
  dark: '#1f2937',
  light: '#f8fafc',
  border: '#cbd5e1',
  text: '#334155',
  muted: '#64748b',
  green: '#15803d',
  red: '#be123c',
};

function sectionTitle(text, y) {
  doc.fontSize(16).fillColor(colors.primary).font('Arial-Bold').text(text, 40, y);
  return y + 26;
}

function subTitle(text, y) {
  doc.fontSize(12).fillColor(colors.secondary).font('Arial-Bold').text(text, 40, y);
  return y + 20;
}

function body(text, y, options = {}) {
  const opts = { width: 515, align: 'left', lineGap: 4, ...options };
  doc.fontSize(10).fillColor(colors.text).font('Arial').text(text, 40, y, opts);
  return doc.y + 8;
}

function bullet(text, y) {
  doc.fontSize(10).fillColor(colors.text).font('Arial').text(`• ${text}`, 55, y, { width: 500, lineGap: 3 });
  return doc.y + 4;
}

function box(x, y, w, h, title, lines, color) {
  doc.lineWidth(1);
  doc.roundedRect(x, y, w, h, 6).fillColor(colors.light).strokeColor(color).fillAndStroke();
  doc.fillColor(color).font('Arial-Bold').fontSize(10).text(title, x + 10, y + 10, { width: w - 20 });
  doc.fillColor(colors.text).font('Arial').fontSize(9);
  let cy = y + 26;
  lines.forEach((line) => {
    doc.text(line, x + 12, cy, { width: w - 24, lineGap: 1 });
    cy += 12;
  });
}

function divider(y) {
  doc.moveTo(40, y).lineTo(555, y).lineWidth(0.5).strokeColor(colors.border).stroke();
}

// ================= PAGE 1 : TITRE ET PROBLEME =================
doc.fillColor(colors.primary).fontSize(26).font('Arial-Bold').text('BH Assurance', 40, 55);
doc.fillColor(colors.dark).fontSize(15).font('Arial-Bold').text('Comprendre le sujet du projet de gestion de flotte', 40, 92);
doc.fillColor(colors.muted).fontSize(10).font('Arial').text('Application web pour remplacer les fichiers Excel partagés', 40, 115);
doc.fillColor(colors.muted).fontSize(9).text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 40, 130);

let y = 150;
divider(y);
y += 20;

y = sectionTitle('1. Le problème aujourd\'hui', y);

y = body(
  'Dans l\'entreprise BH Assurance, plusieurs employés partagent un seul fichier Excel pour gérer les assurances des flottes automobiles. Ce fichier contient les clients, les contrats et les véhicules assurés.',
  y
);

y = subTitle('Pourquoi c\'est difficile ?', y);

const problemes = [
  'Tout le monde modifie le même fichier : conflits, erreurs et pertes de données.',
  'On ne sait pas qui a fait quelle modification et quand.',
  'Le fichier devient très lourd (des dizaines de milliers de lignes).',
  'Il faut tout vérifier à la main avant d\'envoyer les informations aux informaticiens.',
  'Les contrats sont envoyés par lots, mais on ne sait pas toujours où chaque lot en est.',
];
problemes.forEach((p) => { y = bullet(p, y); });

y += 8;
y = body('Le projet vise à remplacer ce fichier Excel par une application web propre, où chaque employé travaille dans son espace, avec un historique et des exports automatiques.', y);

// ================= PAGE 2 : LES 3 FICHIERS =================
doc.addPage();
y = 40;

y = sectionTitle('2. Les 3 fichiers envoyés par l\'encadrant', y);
y = body('Votre encadrant vous a envoyé 3 fichiers Excel. Voici ce qu\'ils représentent, avec des exemples simples.', y);

// Fichier 1
box(40, y, 515, 90, 'Fichier 1 : liste des etablissements.xlsx', [
  'C\'est le carnet d\'adresses des clients.',
  'Exemple : Ministère de l\'Éducation, Tunis, 71 568 768, responsable Amor.',
  'Il contient aussi les statuts : email envoyé, injection en test, en attente...',
], colors.primary);
y += 105;

// Fichier 2
box(40, y, 515, 90, 'Fichier 2 : tarification_template.xlsx', [
  'C\'est le grand registre des véhicules assurés (environ 35 000 lignes).',
  'Exemple : contrat 2026301002966, une Peugeot 107, immatriculation 123 TN 4567.',
  'L\'application doit pouvoir importer ces données automatiquement.',
], colors.secondary);
y += 105;

// Fichier 3
box(40, y, 515, 100, 'Fichier 3 : template_injection_SI.xlsx', [
  'C\'est le fichier final que l\'on donne aux informaticiens.',
  'SI signifie Système d\'Information : les gros ordinateurs de BH Assurance.',
  'Exemple de ligne : contrat, client, marque, immatriculation, dates de validité.',
  'L\'application doit générer ce fichier automatiquement au bon format.',
], colors.accent);

// ================= PAGE 3 : ARCHITECTURE SIMPLE =================
doc.addPage();
y = 40;

y = sectionTitle('3. L\'application, vue simplement', y);
y = body('L\'application est comme un grand classeur numérique avec 3 grands tiroirs :', y);

const tiroirsY = y;
const boxW = 155;
const boxH = 95;

box(40, tiroirsY, boxW, boxH, 'Tiroir 1', [
  'Établissements',
  'Les clients :',
  'entreprises, ministères, banques...',
], colors.primary);

box(210, tiroirsY, boxW, boxH, 'Tiroir 2', [
  'Contrats',
  'Les numéros de police',
  'et leurs dates',
], colors.secondary);

box(380, tiroirsY, boxW, boxH, 'Tiroir 3', [
  'Véhicules',
  'Les voitures, motos,',
  'camions assurés',
], colors.accent);

y = tiroirsY + boxH + 20;

y = sectionTitle('4. Architecture technique du projet', y);

y = body('L\'application est composée de 3 parties qui communiquent entre elles :', y);

const archY = y;
const bigBoxW = 160;
const bigBoxH = 110;

box(40, archY, bigBoxW, bigBoxH, 'Partie 1 : Frontend', [
  'Ce que l\'employé voit',
  'sur son écran.',
  'Technologie : Next.js',
  '(pages, formulaires,',
  'tableaux, graphiques).',
], colors.secondary);

box(215, archY, bigBoxW, bigBoxH, 'Partie 2 : Backend', [
  'Le cerveau de',
  'l\'application.',
  'Technologie : NestJS',
  '(authentification,',
  'CRUD, exports PDF/',
  'Excel, audit).',
], colors.primary);

box(390, archY, bigBoxW, bigBoxH, 'Partie 3 : Base de données', [
  'L\'endroit où tout est',
  'stocké.',
  'Technologie : PostgreSQL',
  '(tables : users,',
  'establishments,',
  'contracts, vehicles).',
], colors.accent);

// Flèches
const arrowY = archY + 45;
doc.moveTo(200, arrowY).lineTo(215, arrowY).lineWidth(1).strokeColor(colors.muted).stroke();
doc.moveTo(375, arrowY).lineTo(390, arrowY).lineWidth(1).strokeColor(colors.muted).stroke();

doc.fontSize(8).fillColor(colors.muted).font('Arial').text('requêtes HTTPS', 185, arrowY - 12, { width: 50, align: 'center' });
doc.fontSize(8).fillColor(colors.muted).font('Arial').text('Prisma', 365, arrowY - 12, { width: 40, align: 'center' });

y = archY + bigBoxH + 25;

y = body('L\'employé utilise le frontend. Le frontend demande au backend de faire les actions. Le backend lit et écrit dans la base de données.', y);

// ================= PAGE 4 : EXEMPLE CONCRET =================
doc.addPage();
y = 40;

y = sectionTitle('5. Exemple concret : une journée avec l\'application', y);

y = body('Imaginons Fatma, employée chez BH Assurance. Elle reçoit un nouvel accord avec le Ministère de la Santé.', y);

const etapes = [
  ['Étape 1 : Connexion', 'Fatma ouvre le site web et se connecte avec son compte.'],
  ['Étape 2 : Ajouter le client', 'Elle clique sur « Ajouter un établissement » et entre le nom, l\'adresse, le téléphone et le responsable.'],
  ['Étape 3 : Créer le contrat', 'Elle crée un contrat lié à ce client, avec un numéro de police et les dates de validité.'],
  ['Étape 4 : Importer les véhicules', 'Elle importe un fichier Excel contenant les 50 véhicules assurés.'],
  ['Étape 5 : Envoyer un lot', 'Elle clique sur « Envoyer au lot 7 ». Le système enregistre cette action.'],
  ['Étape 6 : Exporter pour le SI', 'Le responsable exporte le fichier final au format demandé par les informaticiens.'],
];

etapes.forEach(([titre, desc], i) => {
  y = subTitle(`${i + 1}. ${titre.replace('Étape ', '')}`, y);
  y = body(desc, y);
});

y = sectionTitle('6. Les avantages pour BH Assurance', y + 10);

const avantages = [
  'Travail en même temps par plusieurs employés, sans conflit.',
  'Historique complet : qui a fait quoi, quand.',
  'Export automatique vers le SI, au bon format.',
  'Alertes avant l\'expiration des contrats.',
  'Tableau de bord avec des statistiques claires.',
  'Moins d\'erreurs et moins de temps perdu à vérifier les fichiers.',
];
avantages.forEach((a) => { y = bullet(a, y); });

// Footer sur chaque page
const totalPages = 4;
for (let i = 0; i < totalPages; i++) {
  // PDFKit footer handled per page if needed; here we add a simple ending note
}

doc.end();
console.log(`PDF généré : ${outputPath}`);
