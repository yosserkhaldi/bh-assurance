# Documentation complète du projet BH Assurance

**Projet :** plateforme de gestion du parc automobile assuré  
**État documenté :** 1er septembre 2026  
**Nature du document :** bilan fonctionnel et technique de ce qui a été réalisé

---

## 1. Résumé du projet

Le projet remplace la gestion historique par fichiers Excel par une application web centralisée. Il permet de gérer les établissements clients, leurs contrats, les véhicules assurés, les renouvellements, les avenants et les documents associés. Il ajoute également des fonctions de suivi, d'import/export, d'audit, de notifications et un assistant conversationnel destiné à l'administration des utilisateurs.

L'application est composée de quatre blocs :

1. un frontend Next.js destiné aux utilisateurs internes ;
2. une API NestJS qui porte les règles métier et la sécurité ;
3. une base PostgreSQL gérée avec Prisma ;
4. un service Agent distinct pour l'onboarding par IA et l'envoi d'e-mails.

```text
Utilisateur
    |
    v
Frontend Next.js :3000
    |
    v
API NestJS :3001 --------------------> PostgreSQL :5432
    |
    v
Agent IA / e-mail :3002 ------------> Gemini + Gmail
```

---

## 2. Objectifs atteints

- Centralisation des données d'assurance dans PostgreSQL.
- Remplacement des principales opérations réalisées dans Excel.
- Sécurisation des accès par authentification, sessions et permissions.
- Traçabilité des créations, modifications, suppressions, connexions et exports.
- Recherche, pagination et tri côté serveur.
- Import des données métier et génération des fichiers destinés au SI.
- Suivi visuel des indicateurs et des échéances contractuelles.
- Synchronisation des écrans entre employés grâce au temps réel.
- Gestion guidée des renouvellements, avenants et documents PDF.
- Administration conversationnelle des comptes employés.

---

## 3. Technologies utilisées

| Couche | Technologies |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS |
| Composants métier | TanStack Table, React Hook Form, Zod, Recharts |
| Communication HTTP | Axios |
| Backend | NestJS 11, TypeScript |
| Données | PostgreSQL 16, Prisma ORM 6 |
| Sécurité | JWT, Passport, bcrypt, Helmet, permissions RBAC |
| Validation API | class-validator, class-transformer |
| Fichiers | ExcelJS, PDFKit |
| Temps réel | Server-Sent Events (SSE), RxJS |
| Assistant IA | Google Gemini, parseur local d'intentions |
| E-mail | Nodemailer, IMAP, Mailparser |
| Tests | Jest, ts-jest |
| Documentation API | Swagger / OpenAPI |
| Exécution | Docker, Docker Compose, npm workspaces |

---

## 4. Architecture du dépôt

```text
bh-assurance/
├── frontend/                 Application Next.js
│   ├── app/                  Pages et routes
│   ├── components/           Composants partagés
│   ├── hooks/                Auth, permissions, pagination, SSE, voix
│   ├── lib/                  Client API et règles frontend
│   └── public/               Logos et illustrations
├── backend/                  API NestJS
│   ├── src/                  Modules fonctionnels
│   └── prisma/seed.ts        Données initiales
├── agent/                    Service IA et e-mail indépendant
├── prisma/
│   ├── schema.prisma         Modèle de données
│   └── migrations/           Historique SQL
├── docs/                     Documentation métier et technique
├── .github/                  Automatisation CI/CD
├── docker-compose.yml        Services principaux
└── docker-compose.dev.yml    Environnement de développement
```

Le monorepo utilise des workspaces npm pour le frontend et le backend. Le service Agent possède son propre package afin de rester isolé de l'API principale.

---

## 5. Fonctionnalités frontend réalisées

### 5.1 Authentification

- Page de connexion par e-mail et mot de passe.
- Affichage ou masquage du mot de passe.
- Conservation contrôlée de la session.
- Renouvellement automatique du jeton d'accès via le refresh token.
- Déconnexion et révocation de session.
- Écran obligatoire de changement du mot de passe initial.
- Redirection selon l'état d'authentification.

### 5.2 Structure générale de l'application

- Layout privé protégé.
- Barre latérale avec navigation adaptée au rôle.
- En-tête avec identité de la page et actions principales.
- Cloche de notifications avec compteur des messages non lus.
- Rechargement automatique des données après un événement métier SSE.
- Design responsive pour les écrans de bureau et les petits écrans.

### 5.3 Dashboard décisionnel

Le tableau de bord présente notamment :

- le nombre d'établissements ;
- les contrats actifs et les contrats proches de l'échéance ;
- le volume de véhicules ;
- la répartition des contrats par statut ;
- la répartition des contrats par type ;
- la répartition géographique par gouvernorat ;
- la répartition des véhicules par type ;
- l'activité récente issue du journal d'audit.

Les graphiques utilisent Recharts et des couleurs cohérentes avec les statuts métier.

### 5.4 Gestion des établissements

- Liste paginée et recherchable.
- Création, consultation, modification et suppression logique.
- Informations gérées : raison sociale, RNE, identifiant unique, matricule fiscal, adresse, gouvernorat, responsable, téléphone, mobile et e-mail.
- Sélection spéciale lors de la création d'un contrat.
- Indication des établissements possédant déjà un contrat actif.
- Désactivation des choix incompatibles avec la règle d'unicité du contrat actif.

### 5.5 Gestion des contrats

- Liste avec recherche, pagination et filtres.
- Création, consultation, modification et suppression logique.
- Types : flotte, individuel, temporaire et autre.
- Statuts : brouillon, actif, proche échéance, expiré, annulé et renouvelé.
- Association à un établissement.
- Gestion du lot, des dates de validité et de la référence du contrat précédent.
- Contrainte d'un seul contrat actif par établissement.
- Conservation de la chaîne d'historique lors du renouvellement.

### 5.6 Espace de renouvellement

- Page dédiée aux contrats à renouveler.
- Filtrage selon le nombre de jours avant échéance.
- Assistant de renouvellement avec reprise des informations de l'ancien contrat.
- Création du nouveau contrat et conservation du lien historique.
- Mise à jour de l'ancien contrat selon le workflow métier.

### 5.7 Gestion des véhicules

- CRUD complet avec suppression logique.
- Recherche et pagination.
- Association obligatoire à un contrat.
- Gestion de l'immatriculation, de la marque, du modèle, du millésime, du châssis et du type.
- Champs métier supplémentaires : usage, puissance, cylindrée, places, poids, date de mise en circulation, remorque, validité et code intermédiaire.
- Import et export Excel.

### 5.8 Imports et export SI

- Import des établissements depuis Excel.
- Import du fichier de tarification, avec une limite adaptée aux fichiers volumineux.
- Import de véhicules lié à un contrat.
- Contrôles de format et remontée des erreurs d'import.
- Export des véhicules vers Excel.
- Export au format d'injection SI.
- Filtres d'export par lot, contrat et statut.
- Export PDF du portefeuille des contrats.

### 5.9 Avenants

- Création d'un avenant rattaché à un contrat.
- Types pris en charge : ajout/retrait de véhicule, changement de date, changement de couverture et autre.
- Statuts : brouillon, actif et annulé.
- Date d'effet, description et sélection des véhicules concernés.
- Changement de statut et suppression logique.

### 5.10 Documents

- Page dédiée à la liste des documents générés.
- Génération de PDF associés à un contrat et éventuellement à un avenant.
- Types : attestation, carte verte, avenant et résumé de contrat.
- Téléchargement du fichier généré.
- Suppression du document et de son enregistrement.
- Endpoints spécialisés pour charger les contrats et véhicules disponibles dans les formulaires de documents.

### 5.11 Notifications et audit

- Menu de notifications fonctionnel dans l'en-tête.
- Compteur des notifications non lues.
- Marquage individuel comme lu.
- Génération de notifications liées aux contrats proches de l'échéance ou expirés.
- Journal d'audit paginé.
- Affichage du nom complet de l'auteur.
- Badges colorés selon l'action.
- Traçage des créations, modifications, suppressions, connexions, déconnexions, imports et exports.

### 5.12 Administration des utilisateurs

- Liste et recherche des comptes employés.
- Modification du prénom, du nom, du rôle et du statut.
- Désactivation logique d'un compte.
- Affichage conditionnel des actions selon les permissions.
- Création des employés principalement confiée à l'assistant conversationnel.

---

## 6. Assistant conversationnel BH

### 6.1 Objectif

L'assistant simplifie l'administration des comptes en permettant à un administrateur de formuler une demande en français. Il combine un parseur local, l'API Gemini lorsque nécessaire et des outils métier contrôlés côté serveur.

### 6.2 Actions prises en charge

- Créer un compte employé.
- Modifier un compte à partir de son e-mail.
- Désactiver un compte.
- Demander une confirmation humaine avant une suppression.
- Annuler une opération en cours.
- Lister et filtrer les utilisateurs.
- Rechercher des établissements.
- Rechercher des contrats.

L'assistant demande progressivement les informations manquantes : e-mail, prénom, nom et rôle. Les rôles créables par ce parcours sont `MANAGER` et `VIEWER`.

### 6.3 Sécurité de l'onboarding

Lors de la création d'un employé :

1. un mot de passe temporaire est produit ;
2. le compte reste inactif et exige un changement de mot de passe ;
3. un e-mail d'accueil sécurisé est envoyé ;
4. l'employé se connecte puis définit son mot de passe personnel ;
5. le compte devient utilisable conformément au workflow prévu ;
6. les administrateurs peuvent recevoir une notification du changement.

Un compte précédemment supprimé logiquement peut être restauré par le parcours d'onboarding au lieu de créer un doublon.

### 6.4 Interface du chatbot

- Espace plein écran intégré à la page Utilisateurs.
- Barre latérale des conversations.
- Nouvelle conversation, sélection et suppression d'une conversation.
- Historique isolé par utilisateur et persisté en base.
- Messages utilisateur/agent, horodatage, chargement et erreurs.
- Copie sécurisée du mot de passe temporaire.
- Actions rapides avec icônes et état sélectionné.
- Champ de saisie responsive avec états d'envoi.
- Mode vocal et lecture vocale lorsque le navigateur le permet.
- Enregistrement `push-to-talk` : maintien du bouton pour parler.
- Le message vocal transcrit n'est pas envoyé sans action explicite de l'utilisateur.

### 6.5 Outils de consultation

L'agent possède trois outils en lecture :

| Outil | Usage |
|---|---|
| `list_users` | Liste ou filtre les comptes utilisateurs |
| `search_establishments` | Recherche par nom, e-mail, téléphone ou matricule fiscal |
| `search_contracts` | Recherche par référence, véhicule, établissement ou statut |

Les requêtes Prisma sont exécutées côté backend. Le modèle IA ne reçoit que les résultats nécessaires à la réponse.

---

## 7. Backend et API REST

### 7.1 Modules NestJS

| Module | Responsabilité |
|---|---|
| `auth` | Connexion, refresh, déconnexion, changement de mot de passe |
| `users` | Gestion des comptes internes |
| `establishments` | Référentiel des clients |
| `contracts` | Contrats et renouvellements |
| `vehicles` | Parc automobile, imports et exports |
| `dashboard` | Statistiques et indicateurs |
| `advanced` | Recherche globale, notifications, audit et rapports |
| `imports` | Imports métier et export SI |
| `events` | Diffusion des événements SSE |
| `amendments` | Avenants contractuels |
| `documents` | Génération et stockage des documents PDF |
| `onboarding` | Création sécurisée d'un employé par l'agent |
| `agent-chat` | Dialogue, intentions, outils et historique de l'assistant |
| `prisma` | Accès partagé à PostgreSQL |

### 7.2 Principales routes

Toutes les routes applicatives sont préfixées par `/api`. Swagger est exposé sur `/api/docs`.

| Domaine | Routes principales |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `PATCH /auth/change-password` |
| Utilisateurs | `GET/POST /users`, `PATCH/DELETE /users/:id` |
| Établissements | `GET/POST /establishments`, `GET /establishments/for-contract`, `GET/PATCH/DELETE /establishments/:id` |
| Contrats | `GET/POST /contracts`, `GET /contracts/to-renew`, `POST /contracts/:id/renew`, `GET/PATCH/DELETE /contracts/:id` |
| Véhicules | `GET/POST /vehicles`, `POST /vehicles/import/:contractId`, `GET /vehicles/export/excel`, `GET/PATCH/DELETE /vehicles/:id` |
| Avenants | `GET/POST /amendments`, `PATCH /amendments/:id/status`, `DELETE /amendments/:id` |
| Documents | `GET /documents`, `POST /documents/generate`, `GET /documents/:id/download`, `DELETE /documents/:id` |
| Imports | `POST /imports/establishments`, `POST /imports/tarification`, `GET /imports/export-si` |
| Dashboard | `GET /dashboard/statistics` |
| Temps réel | `GET /events` (SSE) |
| Agent | `POST /agent/chat`, `GET /agent/chat/sessions`, `DELETE /agent/chat/sessions/:sessionId` |

### 7.3 Validation et gestion des erreurs

- DTO validés par `class-validator`.
- Transformation des paramètres avec `class-transformer`.
- Validation des UUID dans les contrôleurs.
- Filtre global pour normaliser les erreurs HTTP.
- Gestion explicite des conflits d'unicité et des contraintes métier.
- Limites de taille pour les fichiers importés.

---

## 8. Modèle de données

### 8.1 Entités principales

| Entité | Rôle |
|---|---|
| `User` | Employé, rôle, statut et obligation de changement de mot de passe |
| `AuthSession` | Refresh token haché, expiration et révocation |
| `Establishment` | Client assuré et coordonnées métier |
| `Contract` | Contrat, période, statut, établissement et renouvellement |
| `Vehicle` | Véhicule et caractéristiques techniques |
| `ContractAmendment` | Modification contractuelle historisée |
| `GeneratedDocument` | Métadonnées d'un PDF généré |
| `Notification` | Message utilisateur lu ou non lu |
| `AuditLog` | Trace d'une action métier ou de sécurité |
| `AgentChatSession` | Historique JSON d'une conversation de l'assistant |

### 8.2 Relations importantes

- Un établissement possède plusieurs contrats.
- Un contrat appartient à un établissement et possède plusieurs véhicules.
- Un contrat peut référencer un seul contrat précédent et avoir un seul successeur.
- Un contrat possède plusieurs avenants et documents.
- Un document peut être lié à un avenant.
- Un utilisateur possède plusieurs sessions, notifications, traces d'audit et conversations.

### 8.3 Intégrité et performance

- Identifiants UUID.
- Contraintes uniques sur l'e-mail, le RNE, le numéro de contrat, l'immatriculation et le châssis.
- Suppression logique avec `deletedAt` pour les entités métier.
- Index métier sur les noms, statuts, dates, gouvernorats et relations.
- Index PostgreSQL partiel garantissant un seul contrat actif par établissement.
- Migration de nettoyage des doublons antérieurs à cette contrainte.
- Extension et index `pg_trgm` pour améliorer la recherche tolérante.
- Montants et poids gérés avec le type décimal lorsque nécessaire.

---

## 9. Sécurité et permissions

### 9.1 Authentification

- Mots de passe hachés avec bcrypt.
- Access token JWT de courte durée.
- Refresh token de durée configurable.
- Refresh token haché et stocké dans `AuthSession`.
- Rotation des jetons et révocation lors de la déconnexion.
- Statuts `ACTIVE`, `INACTIVE` et `LOCKED`.
- Changement forcé du mot de passe pour les comptes nouvellement créés.
- Headers HTTP durcis avec Helmet.

### 9.2 Contrôle d'accès

Le contrôle est effectué des deux côtés : l'interface masque les actions interdites et l'API les refuse réellement grâce au garde global de permissions.

| Rôle | Accès |
|---|---|
| `ADMIN` | Toutes les permissions |
| `MANAGER` | Opérations métier, sauf gestion des utilisateurs, lecture d'audit et export des rapports administratifs |
| `VIEWER` | Consultation uniquement, notifications et documents en lecture |

Les permissions sont granulaires : lecture, création, modification, suppression, renouvellement, import, export, génération de documents et consultation de l'audit.

### 9.3 Mesures propres à l'agent

- Endpoint d'onboarding protégé par JWT, permission et clé d'API Agent.
- Confirmation humaine exigée avant la désactivation d'un employé.
- Échappement des informations sensibles dans les e-mails HTML.
- Historique de conversation séparé par utilisateur.
- Restriction des actions aux permissions de gestion des utilisateurs.

---

## 10. Temps réel

Le backend publie des événements métier via Server-Sent Events. Le frontend dispose d'un provider et de hooks qui écoutent ces événements et rechargent les listes concernées. Cela permet à plusieurs employés de voir les changements sans actualisation manuelle complète de la page.

Ce mécanisme est unidirectionnel, léger et adapté aux notifications de changement. Les opérations d'écriture continuent à passer par l'API REST.

---

## 11. Installation et exécution

### 11.1 Prérequis

- Node.js compatible avec Next.js 15 et NestJS 11.
- npm.
- PostgreSQL 16, ou Docker Desktop.
- Une clé Gemini pour les fonctions IA.
- Un compte Gmail avec mot de passe d'application pour les e-mails.

### 11.2 Configuration

Copier `.env.example` vers `.env`, puis définir au minimum :

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/bh_assurance?schema=public"
JWT_SECRET="secret-long-et-aleatoire"
JWT_REFRESH_SECRET="autre-secret-long-et-aleatoire"
FRONTEND_URL="http://localhost:3000"
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
GOOGLE_GEMINI_API_KEY="votre-cle"
GEMINI_MODEL="gemini-3.5-flash"
AGENT_API_KEY="cle-interne-agent"
GMAIL_USER="adresse@gmail.com"
GMAIL_APP_PASSWORD="mot-de-passe-application"
```

Ne jamais conserver les valeurs d'exemple en production.

### 11.3 Exécution locale

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Adresses locales :

- Frontend : `http://localhost:3000`
- API : `http://localhost:3001/api`
- Swagger : `http://localhost:3001/api/docs`
- Agent : `http://localhost:3002`

### 11.4 Exécution Docker en développement

```bash
npm run docker:dev
```

Cette commande construit et démarre PostgreSQL, l'API, le frontend et le service Agent. Les migrations Prisma et les données initiales sont appliquées par le point d'entrée de développement.

Arrêt :

```bash
npm run docker:dev:down
```

### 11.5 Compte de démonstration

```text
E-mail : admin@bh-assurance.tn
Mot de passe initial : Admin123!
```

Ce mot de passe doit impérativement être remplacé hors environnement de démonstration.

---

## 12. Vérification et qualité

### 12.1 Commandes disponibles

```bash
npm run build
npm run lint
npm run test -w backend
npm run prisma:generate
npm run prisma:deploy
```

### 12.2 Tests présents

- Tests Jest du service d'authentification.
- Tests Jest du service des contrats.
- Vérification des règles critiques au niveau des services.
- Pipeline CI/CD ajouté pour automatiser lint, tests et builds.

### 12.3 État constaté lors de la dernière modification UI

- Le fichier de la page Utilisateurs passe son contrôle ESLint ciblé.
- Le build de production Next.js aboutit.
- Un avertissement préexistant concerne un import `DataTable` inutilisé dans la page Documents.
- Le lint global signale également des types `any` préexistants dans le hook de reconnaissance vocale.

Ces avertissements n'empêchent pas le build, mais doivent être nettoyés pour obtenir une base sans dette de lint.

---

## 13. Historique synthétique des réalisations

### Juillet 2026 — socle initial

- Modèle de données, migrations et seed.
- API NestJS, authentification JWT et RBAC.
- CRUD établissements, contrats, véhicules et utilisateurs.
- Frontend Next.js, dashboard, tableaux et formulaires.
- Import/export, notifications, audit et Swagger.

### Août 2026 — consolidation métier

- Champs métier étendus et workflow d'import/export SI.
- Environnement Docker de développement.
- Un seul contrat actif par établissement.
- Temps réel SSE.
- Permissions granulaires, recherche `pg_trgm`, tests et CI/CD.
- Avenants et documents PDF.
- Dashboard BI enrichi.
- Notifications et audit améliorés.
- Espace dédié au renouvellement.

### Fin août et septembre 2026 — assistant et onboarding

- Service Agent basé sur Gemini et Gmail.
- Onboarding automatique et mot de passe temporaire.
- Changement obligatoire du mot de passe initial.
- Chatbot progressif pour créer, modifier et désactiver les comptes.
- Confirmation avant suppression.
- Historique persistant et isolé par utilisateur.
- Interface complète de conversations.
- Mode vocal `push-to-talk`.
- Outils de recherche sur utilisateurs, établissements et contrats.
- Amélioration responsive et visuelle du composeur de messages.

---

## 14. Limites et travaux restant à faire

Les éléments ci-dessous ne doivent pas être présentés comme déjà livrés :

- module complet de gestion des sinistres ;
- portail externe destiné aux clients ;
- tarification avancée avec calcul des primes, franchises et bonus/malus ;
- rapprochement bancaire et suivi des impayés ;
- API publique partenaires et webhooks ;
- télémétrie ou intégration GPS ;
- déploiement de production industrialisé et supervision complète ;
- couverture exhaustive de tests end-to-end ;
- stockage objet externe pour les documents générés.

Améliorations techniques prioritaires :

1. corriger les erreurs et avertissements ESLint restants ;
2. augmenter la couverture de tests des imports, permissions et workflows Agent ;
3. ajouter des tests end-to-end avec une base PostgreSQL isolée ;
4. renforcer la validation des fichiers importés et les rapports d'erreur ;
5. documenter la sauvegarde, la restauration et la rétention des documents ;
6. remplacer tous les secrets de démonstration avant déploiement ;
7. ajouter monitoring, logs centralisés et alertes de disponibilité ;
8. formaliser une stratégie de reprise après incident.

---

## 15. Conclusion

Le projet fournit aujourd'hui un socle fonctionnel complet pour la gestion interne d'un portefeuille automobile assuré. Il couvre le référentiel client, le cycle de vie des contrats, les véhicules, les imports et exports, les renouvellements, les avenants, les documents, la sécurité, l'audit et le suivi décisionnel.

La dernière évolution transforme aussi la gestion des utilisateurs en expérience assistée : création sécurisée, e-mail d'accueil, changement obligatoire du mot de passe, conversations persistantes, commandes vocales et outils de recherche. L'architecture reste modulaire et permet d'ajouter ultérieurement les sinistres, la tarification, le portail client et les intégrations partenaires sans remettre en cause le socle existant.

---

## 16. Documents complémentaires

- `README.md` : démarrage rapide.
- `docs/Cahier-des-charges.md` : exigences fonctionnelles et règles métier.
- `docs/DATABASE_DESIGN.md` : conception détaillée de la base.
- `docs/CHANGELOG.md` : historique de livraison initial.
- `docs/CURRENT_TASK.md` : suivi des étapes du projet.
- `/api/docs` : documentation Swagger lorsque le backend est démarré.

