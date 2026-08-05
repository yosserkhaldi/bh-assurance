const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'docs', 'BH-Assurance-Evolution-et-Valorisation.pdf');

const doc = new PDFDocument({ size: 'A4', margin: 40 });
doc.pipe(fs.createWriteStream(outputPath));

// Register Unicode-aware fonts for proper French accents
doc.registerFont('Arial', 'C:/Windows/Fonts/arial.ttf');
doc.registerFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf');

const colors = {
  primary: '#1e40af',      // blue-800
  secondary: '#0f766e',      // teal-700
  accent: '#b45309',         // amber-700
  dark: '#1f2937',           // gray-800
  light: '#f8fafc',          // slate-50
  border: '#cbd5e1',         // slate-300
  text: '#334155',           // slate-700
  muted: '#64748b',          // slate-500
  green: '#15803d',          // green-700
  purple: '#7e22ce',         // purple-700
  red: '#be123c',            // rose-700
};

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function setFill(hex) {
  doc.fillColor(hex);
}

function setStroke(hex) {
  doc.strokeColor(hex);
}

function divider(y) {
  doc.moveTo(40, y).lineTo(555, y).lineWidth(0.5).strokeColor(colors.border).stroke();
}

function sectionTitle(text, y) {
  doc.fontSize(16).fillColor(colors.primary).font('Arial-Bold').text(text, 40, y);
  return y + 22;
}

function bodyText(text, y, options = {}) {
  const opts = { width: 515, align: 'left', lineGap: 3, ...options };
  doc.fontSize(10).fillColor(colors.text).font('Arial').text(text, 40, y, opts);
  return doc.y + 6;
}

function boldText(text, y) {
  doc.fontSize(10).fillColor(colors.dark).font('Arial-Bold').text(text, 40, y, { width: 515, lineGap: 2 });
  return doc.y + 4;
}

function bullet(text, y) {
  doc.fontSize(10).fillColor(colors.text).font('Arial').text(`• ${text}`, 55, y, { width: 500, lineGap: 2 });
  return doc.y + 2;
}

function subBullet(text, y) {
  doc.fontSize(9).fillColor(colors.muted).font('Arial').text(`  ◦ ${text}`, 70, y, { width: 485, lineGap: 1 });
  return doc.y + 1;
}

function box(x, y, w, h, title, lines, color) {
  setStroke(color);
  setFill(colors.light);
  doc.lineWidth(1.2);
  doc.roundedRect(x, y, w, h, 4).fillAndStroke();
  setFill(color);
  doc.fontSize(9).font('Arial-Bold').text(title, x + 6, y + 6, { width: w - 12 });
  doc.fontSize(8).fillColor(colors.text).font('Arial');
  let cy = y + 20;
  lines.forEach((line) => {
    doc.text(line, x + 8, cy, { width: w - 16, lineGap: 1 });
    cy += 10;
  });
}

function arrow(x1, y1, x2, y2, label) {
  doc.moveTo(x1, y1).lineTo(x2, y2).lineWidth(1).strokeColor(colors.muted).stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headSize = 5;
  doc.moveTo(x2, y2)
    .lineTo(x2 - headSize * Math.cos(angle - Math.PI / 6), y2 - headSize * Math.sin(angle - Math.PI / 6))
    .lineTo(x2 - headSize * Math.cos(angle + Math.PI / 6), y2 - headSize * Math.sin(angle + Math.PI / 6))
    .lineTo(x2, y2)
    .fillColor(colors.muted).fill();
  if (label) {
    doc.fontSize(7).fillColor(colors.muted).font('Arial').text(label, (x1 + x2) / 2 - 15, (y1 + y2) / 2 - 8, { width: 30, align: 'center' });
  }
}

// ============================
// PAGE 1 - Titre + architecture
// ============================
doc.fillColor(colors.primary).fontSize(24).font('Arial-Bold').text('BH Assurance', 40, 50);
doc.fillColor(colors.dark).fontSize(15).font('Arial-Bold').text('Plan d\'évolution et valorisation fonctionnelle', 40, 82);
doc.fillColor(colors.muted).fontSize(10).font('Arial').text('Application interne de gestion du parc assuré (établissements, contrats, véhicules)', 40, 105);
doc.fillColor(colors.muted).fontSize(9).text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, 40, 120);

let y = 145;
divider(y);
y += 16;

y = sectionTitle('1. Architecture technique actuelle', y);

// Draw architecture diagram
const diagramY = y;
const boxW = 170;
const boxH = 110;
const leftX = 40;
const midX = 225;
const rightX = 410;

// Frontend box
box(leftX, diagramY, boxW, boxH, 'Frontend (Next.js 15)', [
  '• App Router (login / privé)',
  '• TanStack Table, React Hook Form',
  '• Tailwind CSS, Recharts',
  '• Zod, Axios, hooks métier',
], colors.secondary);

// Backend box
box(midX, diagramY, boxW, boxH, 'Backend API (NestJS)', [
  '• Auth (JWT + refresh tokens)',
  '• Users, Establishments',
  '• Contracts, Vehicles',
  '• Dashboard, Advanced, Audit',
], colors.primary);

// Database box
box(rightX, diagramY, boxW, boxH, 'Base de données (PostgreSQL)', [
  '• users / auth_sessions',
  '• establishments',
  '• contracts + renewals',
  '• vehicles, notifications, audit_logs',
], colors.accent);

// Arrows
arrow(leftX + boxW, diagramY + 40, midX, diagramY + 40, 'HTTPS / JSON');
arrow(midX + boxW, diagramY + 40, rightX, diagramY + 40, 'Prisma');

// Legend
let ly = diagramY + boxH + 14;
doc.fontSize(8).fillColor(colors.muted).font('Arial').text('Schéma : architecture 3 tiers. Les flèches indiquent le flux de données entre le client Next.js, l\'API NestJS et PostgreSQL.', 40, ly, { width: 515, align: 'center' });

y = diagramY + boxH + 34;
y = sectionTitle('2. Modules métiers existants', y);

const modules = [
  ['Authentification', 'JWT, rotation refresh token, rôles ADMIN / MANAGER / VIEWER, sessions stockées en base.'],
  ['Établissements', 'CRUD, RNE unique, gouvernorat, suppression logique en cascade sur contrats et véhicules.'],
  ['Contrats', 'CRUD, statuts (DRAFT, ACTIVE, EXPIRING_SOON...), renouvellement avec historique (previousContractId).'],
  ['Véhicules', 'CRUD, immatriculation et numéro de chassis uniques, import/export Excel.'],
  ['Dashboard', 'Indicateurs temps réel, alertes d\'échéance à 30 jours, répartition par statut et gouvernorat.'],
  ['Advanced', 'Recherche globale, notifications, journal d\'audit, export PDF du portefeuille.'],
];

modules.forEach(([title, desc]) => {
  y = boldText(`${title} :`, y);
  y = bodyText(desc, y);
});

// ============================
// PAGE 2 - Fonctionnalités avancées
// ============================
doc.addPage();
y = 40;
y = sectionTitle('3. Fonctionnalités avancées à ajouter', y);

const features = [
  {
    title: 'Workflow de renouvellement automatisé',
    desc: 'Tâches planifiées (cron) qui génèrent des alertes 60/30/15 jours avant échéance, créent des propositions de renouvellement en brouillon et envoient des notifications aux managers.',
    value: 'Réduit les oublis de renouvellement et améliore le taux de rétention.',
  },
  {
    title: 'Gestion des sinistres et dossiers de réclamation',
    desc: 'Nouvelle entité Claim liée à un contrat/véhicule : date, type, montant, statut (déclaré, expertisé, en règlement, clôturé), pièces jointes et historique.',
    value: 'Transforme l\'outil en CRM assurance complet.',
  },
  {
    title: 'Module tarification et devis',
    desc: 'Moteur de calcul basé sur type de contrat, catégorie de véhicule, ancienneté, bonus/malus, franchise. Génération de devis exportables en PDF.',
    value: 'Valorise le travail par un module métier financier.',
  },
  {
    title: 'Portail assureur / établissement en lecture',
    desc: 'Comptes externes limités à un établissement : consultation des contrats, téléchargement d\'attestations, déclaration en ligne de sinistres.',
    value: 'Sécurise la relation client et réduit les appels.',
  },
  {
    title: 'Attestations et documents générés',
    desc: 'Génération d\'attestations d\'assurance, cartes vertes et avenants à partir des contrats, avec numérotation et watermark.',
    value: 'Automatise la production documentaire.',
  },
  {
    title: 'Tableau de bord avancé et BI embarquée',
    desc: 'Graphiques dynamiques (chiffre d\'affaires, taux de renouvellement, sinistralité), filtres par période, export des graphiques.',
    value: 'Donne une vision décisionnelle au management.',
  },
  {
    title: 'Import et rapprochement bancaire',
    desc: 'Import de fichiers bancaires / paiements pour marquer les contrats payés, détecter les impayés et générer des relances.',
    value: 'Lie l\'assurance à la comptabilité.',
  },
  {
    title: 'Rôles et permissions granulaires',
    desc: 'Permissions au niveau des actions (créer établissement, renouveler, supprimer, exporter) en plus des rôles globaux.',
    value: 'Renforce la sécurité et la conformité.',
  },
  {
    title: 'API publique et webhooks',
    desc: 'Endpoints sécurisés pour les partenaires (courtiers, comparateurs) et webhooks sur les événements clés (renouvellement, sinistre).',
    value: 'Ouvre l\'application à un écosystème.',
  },
  {
    title: 'Recherche full-text et fuzzy',
    desc: 'Indexation PostgreSQL (pg_trgm) pour tolérer les fautes de frappe sur raison sociale, immatriculation, numéro de contrat.',
    value: 'Améliore l\'expérience utilisateur sur les gros volumes.',
  },
];

features.forEach((f, i) => {
  if (y > 720) { doc.addPage(); y = 40; }
  doc.fontSize(11).fillColor(colors.primary).font('Arial-Bold').text(`${i + 1}. ${f.title}`, 40, y, { width: 515 });
  y = doc.y + 4;
  y = bodyText(f.desc, y);
  y = subBullet(`💡 Valeur ajoutée : ${f.value}`, y);
  y += 8;
});

// ============================
// PAGE 3 - Métiers valorisants + structure attendue
// ============================
doc.addPage();
y = 40;
y = sectionTitle('4. Métiers avancés à intégrer pour valoriser le travail', y);

const businesses = [
  {
    title: 'Gestion de la relation assureur (CRM assurance)',
    items: [
      'Historique complet des contacts et échanges par établissement.',
      'Tâches et relances automatiques (TO-DO métier).',
      'Scoring et segmentation des clients (VIP, à risque, dormant).',
    ],
  },
  {
    title: 'Gestion actuarielle et risque',
    items: [
      'Calcul des primes et provisionnement.',
      'Suivi du ratio sinistralité par portefeuille.',
      'Alertes sur sur-couverture ou sous-couverture.',
    ],
  },
  {
    title: 'Conformité et reporting réglementaire',
    items: [
      'Export réglementaire pour l\'autorité de contrôle (format standardisé).',
      'Conservation légale des documents et traçabilité des suppressions.',
      'Journal d\'audit immuable et signatures horodatées.',
    ],
  },
  {
    title: 'Multi-branches et produits d\'assurance',
    items: [
      'Gestion de plusieurs types de produits (auto, flotte, RC, transport, marchandises).',
      'Clauses et garanties associées à chaque contrat.',
      'Calculs de primes différenciés par produit.',
    ],
  },
  {
    title: 'Gestion des commissions et intermédiaires',
    items: [
      'Courtiers, apporteurs et taux de commission.',
      'Calcul automatique des commissions sur les primes.',
      'Rapprochement et paiement des intermédiaires.',
    ],
  },
  {
    title: 'Télémétrie et géolocalisation des véhicules',
    items: [
      'Intégration de boîtiers GPS pour le suivi des flottes.',
      'Alertes géofencing, kilométrage, conduite.',
      'Impact sur la tarification (UBI - Usage-Based Insurance).',
    ],
  },
];

businesses.forEach((b, i) => {
  if (y > 720) { doc.addPage(); y = 40; }
  doc.fontSize(11).fillColor(colors.secondary).font('Arial-Bold').text(`${i + 1}. ${b.title}`, 40, y, { width: 515 });
  y = doc.y + 5;
  b.items.forEach((item) => { y = bullet(item, y); });
  y += 8;
});

y = sectionTitle('5. Ce que l\'application doit impérativement contenir', y + 12);

const mustHave = [
  'Modèle de données cohérent avec suppression logique et traçabilité des modifications.',
  'Authentification sécurisée, gestion des sessions et rôles.',
  'CRUD complet des établissements, contrats et véhicules avec contraintes métier.',
  'Moteur de recherche, pagination et tri côté serveur.',
  'Dashboard opérationnel avec alertes d\'échéance et indicateurs clés.',
  'Import / export de données (Excel, PDF).',
  'Journal d\'audit et notifications.',
  'Documentation API (Swagger/OpenAPI) et tests automatisés.',
  'Déploiement conteneurisé (Docker) et variables d\'environnement sécurisées.',
];

mustHave.forEach((item) => { y = bullet(item, y); });

y += 12;
divider(y);
y += 12;

bodyText(
  'Conclusion : le projet actuel dispose déjà d\'une base solide (authentification, CRUD, audit, dashboard). Pour le valoriser, il faut maintenant ajouter des modules métiers comme la sinistralité, la tarification, le portail client et la BI. Ces fonctionnalités montrent une compréhension approfondie du métier assurance et transforment l\'outil en plateforme professionnelle complète.',
  y,
  { fontSize: 10, fillColor: colors.dark }
);

// ============================
// PAGE 4 - Roadmap suggérée (tableau)
// ============================
doc.addPage();
y = 40;
y = sectionTitle('6. Roadmap d\'évolution suggérée', y);

const roadmap = [
  ['Phase 1 - Consolidation', 'Tests unitaires/e2e, CI/CD, rôles granulaires, recherche full-text', '2-3 sem'],
  ['Phase 2 - Sinistres', 'Module Claims, pièces jointes, workflow de réclamation', '2-3 sem'],
  ['Phase 3 - Tarification', 'Moteur de primes, devis, attestations générées', '3-4 sem'],
  ['Phase 4 - Portail client', 'Authentification externe, consultation limitée, déclaration sinistre', '2-3 sem'],
  ['Phase 5 - BI & reporting', 'KPI avancés, exports graphiques, rapports réglementaires', '2-3 sem'],
  ['Phase 6 - Intégrations', 'API publique, webhooks, télémétrie véhicules', '3-4 sem'],
];

// Table header
const tableTop = y;
const col1 = 170;
const col2 = 265;
const col3 = 80;

setFill(colors.primary);
doc.rect(40, tableTop, col1, 22).fill();
doc.rect(40 + col1, tableTop, col2, 22).fill();
doc.rect(40 + col1 + col2, tableTop, col3, 22).fill();

setFill('#ffffff');
doc.fontSize(9).font('Arial-Bold').text('Phase', 46, tableTop + 7, { width: col1 - 12 });
doc.text('Focus', 46 + col1, tableTop + 7, { width: col2 - 12 });
doc.text('Durée', 46 + col1 + col2, tableTop + 7, { width: col3 - 12 });

let rowY = tableTop + 22;
roadmap.forEach((row, idx) => {
  const bg = idx % 2 === 0 ? '#ffffff' : colors.light;
  setFill(bg);
  doc.rect(40, rowY, col1, 28).fill();
  doc.rect(40 + col1, rowY, col2, 28).fill();
  doc.rect(40 + col1 + col2, rowY, col3, 28).fill();

  setStroke(colors.border);
  doc.lineWidth(0.5);
  doc.rect(40, rowY, col1, 28).stroke();
  doc.rect(40 + col1, rowY, col2, 28).stroke();
  doc.rect(40 + col1 + col2, rowY, col3, 28).stroke();

  setFill(colors.dark);
  doc.fontSize(9).font('Arial-Bold').text(row[0], 46, rowY + 6, { width: col1 - 12 });
  doc.fontSize(9).font('Arial').text(row[1], 46 + col1, rowY + 4, { width: col2 - 12, lineGap: 1 });
  doc.text(row[2], 46 + col1 + col2, rowY + 6, { width: col3 - 12 });

  rowY += 28;
});

y = rowY + 20;

y = sectionTitle('7. Technologies recommandées pour l\'évolution', y);

const techs = [
  'BullMQ / NestJS cron : tâches planifiées (renouvellements, rappels).',
  'MinIO ou S3 : stockage des pièces jointes et attestations.',
  'pg_trgm + GIN : recherche full-text et tolérante aux fautes.',
  'React-PDF / PDFKit : génération de documents métier complexes.',
  'Recharts + Tremor : dashboards et visualisations avancées.',
  'Keycloak ou Auth0 : SSO et authentification externe des clients.',
  'Jest + Playwright : tests unitaires et end-to-end.',
  'GitHub Actions : CI/CD avec build, tests, lint et déploiement.',
];

techs.forEach((t) => { y = bullet(t, y); });

doc.end();

console.log(`PDF generated: ${outputPath}`);
