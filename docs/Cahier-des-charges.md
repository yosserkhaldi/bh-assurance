# Cahier des charges - BH Assurance (Gestion du parc assuré)

> Document de spécifications fonctionnelles et techniques pour l'application de remplacement des fichiers Excel de gestion des établissements, contrats et véhicules assurés.

---

## 1. Présentation du projet

### 1.1 Contexte

BH Assurance gère aujourd'hui son parc automobile assuré via des fichiers Excel partagés entre plusieurs employés. Cette méthode engendre :
- des conflits d'édition et des pertes de données ;
- une absence de traçabilité des modifications ;
- des fichiers trop lourds (dizaines de milliers de lignes) ;
- une vérification manuelle avant envoi au service informatique ;
- un manque de visibilité sur l'avancement des lots de contrats.

### 1.2 Objectifs

Remplacer les fichiers Excel par une application web centralisée, sécurisée et traçable permettant de :
- gérer les établissements clients, les contrats et les véhicules assurés ;
- importer les données historiques depuis les fichiers Excel existants ;
- exporter automatiquement les fichiers attendus par le SI (Système d'Information) ;
- alerter avant les échéances de contrats ;
- tracer chaque action dans un journal d'audit.

### 1.3 Livrables attendus

- Application web complète (frontend + backend + base de données).
- Documentation technique (Swagger/OpenAPI, MCD/UML, README).
- Scripts de migration et de démonstration.
- Cahier des charges validé (ce document).

---

## 2. Acteurs et rôles

| Acteur | Rôle dans l'application | Droits |
|---|---|---|
| **ADMIN** | Administrateur technique et métier | Tous les droits : gestion des utilisateurs, accès aux logs d'audit, configuration. |
| **MANAGER** | Employé opérationnel (saisie et suivi) | Créer / modifier / supprimer les établissements, contrats, véhicules ; importer des fichiers ; consulter le dashboard. |
| **VIEWER** | Consultant / direction / contrôle | Lecture seule des établissements, contrats, véhicules, dashboard et notifications. |

> Règle métier : un `VIEWER` ne peut effectuer aucune mutation.

---

## 3. Périmètre fonctionnel

### 3.1 Fonctionnalités déjà livrées (socle)

1. **Authentification et sécurité**
   - Login avec email / mot de passe.
   - JWT avec rotation des refresh tokens.
   - Gestion des sessions côté serveur.
   - Rôles ADMIN / MANAGER / VIEWER.

2. **Gestion des utilisateurs**
   - CRUD des comptes employés (admin uniquement).
   - Statut ACTIVE / INACTIVE / LOCKED.

3. **Référentiel métier**
   - CRUD des établissements (clients).
   - CRUD des contrats liés à un établissement.
   - CRUD des véhicules liés à un contrat.
   - Renouvellement d'un contrat avec conservation de l'historique (`previousContractId`).
   - Suppression logique (`deletedAt`) pour toutes les entités métier.

4. **Import / Export**
   - Import Excel des véhicules.
   - Export Excel des véhicules.
   - Export PDF du portefeuille des contrats.

5. **Dashboard et alertes**
   - Indicateurs temps réel.
   - Alertes d'échéance à 30 jours.
   - Répartition par statut et gouvernorat.

6. **Traçabilité**
   - Notifications persistantes.
   - Journal d'audit (qui, quoi, quand, sur quelle entité).

### 3.2 Fonctionnalités avancées à planifier

Les modules suivants sont proposés pour transformer l'outil en plateforme d'assurance complète :

1. **Workflow de renouvellement automatisé** — tâches planifiées (60/30/15 jours avant échéance), propositions en brouillon, notifications.
2. **Gestion des sinistres (Claims)** — déclaration, statut, montant, pièces jointes, historique.
3. **Module tarification et devis** — calcul selon type de contrat, véhicule, franchise, bonus/malus ; génération de PDF.
4. **Portail client** — comptes externes limités à un établissement, consultation, déclaration de sinistre.
5. **Attestations et documents générés** — attestations d'assurance, cartes vertes, avenants avec watermark.
6. **Tableau de bord décisionnel** — KPI financiers, taux de renouvellement, sinistralité.
7. **Rapprochement bancaire** — import des paiements, détection des impayés, relances.
8. **Rôles et permissions granulaires** — permissions par action en plus des rôles globaux.
9. **API publique et webhooks** — endpoints sécurisés pour partenaires.
10. **Recherche full-text** — `pg_trgm` pour tolérer les fautes de frappe.

---

## 4. Modules fonctionnels détaillés

### 4.1 Authentification

| ID | Besoin | Critère d'acceptation |
|---|---|---|
| AUTH-01 | Se connecter | L'utilisateur saisit email/mot de passe valides et reçoit un access token + refresh token. |
| AUTH-02 | Rester connecté | Le refresh token permet d'obtenir un nouvel access token tant que la session n'est pas révoquée. |
| AUTH-03 | Se déconnecter | La session serveur est révoquée. |
| AUTH-04 | Sécurité | Mot de passe hashé (bcrypt), tokens signés, expiration configurable. |

### 4.2 Utilisateurs

| ID | Besoin | Critère d'acceptation |
|---|---|---|
| USR-01 | Lister les utilisateurs | Pagination, recherche par nom/email. |
| USR-02 | Créer un utilisateur | Admin uniquement ; email unique ; mot de passe conforme ; rôle valide. |
| USR-03 | Modifier un utilisateur | Changer nom, rôle, statut. |
| USR-04 | Désactiver un utilisateur | Suppression logique + statut INACTIVE. |

### 4.3 Établissements

| ID | Besoin | Critère d'acceptation |
|---|---|---|
| EST-01 | Créer un établissement | Raison sociale, RNE unique, adresse, gouvernorat, responsable, téléphone, email. |
| EST-02 | Modifier un établissement | Mise à jour traçée (updatedBy, updatedAt). |
| EST-03 | Supprimer un établissement | Suppression logique uniquement ; impossible si des contrats actifs sont rattachés. |
| EST-04 | Rechercher | Par raison sociale, responsable, gouvernorat. |

### 4.4 Contrats

| ID | Besoin | Critère d'acceptation |
|---|---|---|
| CTR-01 | Créer un contrat | Numéro unique, type, dates de validité, établissement. |
| CTR-02 | Modifier un contrat | Mise à jour des dates et statut. |
| CTR-03 | Renouveler un contrat | Création d'un nouveau contrat référençant l'ancien ; conservation de l'historique. |
| CTR-04 | Supprimer un contrat | Suppression logique ; impossible si des véhicules y sont rattachés. |
| CTR-05 | Alertes d'échéance | Détection automatique des contrats expirant dans moins de 30 jours. |

### 4.5 Véhicules

| ID | Besoin | Critère d'acceptation |
|---|---|---|
| VEH-01 | Créer un véhicule | Immatriculation unique, marque, modèle, année, numéro de chassis unique, type. |
| VEH-02 | Modifier un véhicule | Mise à jour traçée. |
| VEH-03 | Supprimer un véhicule | Suppression logique. |
| VEH-04 | Importer par Excel | Fichier conforme au template ; gestion des doublons ; rapport d'import. |
| VEH-05 | Exporter en Excel | Export filtré de la liste des véhicules. |

### 4.6 Dashboard

| ID | Besoin | Critère d'acceptation |
|---|---|---|
| DSH-01 | Indicateurs clés | Nombre d'établissements, contrats actifs, véhicules, contrats à échéance. |
| DSH-02 | Graphiques | Répartition par statut de contrat et par gouvernorat. |
| DSH-03 | Alertes | Liste des contrats expirant dans les 30 jours. |

### 4.7 Audit et notifications

| ID | Besoin | Critère d'acceptation |
|---|---|---|
| AUD-01 | Journal d'audit | Chaque création/modification/suppression/import/export est enregistré. |
| NOT-01 | Notifications | Alerte de contrat à échéance ; marquage comme lue. |

---

## 5. Règles métier et contraintes

1. `startDate` d'un contrat doit être strictement antérieure à `endDate`.
2. L'année d'un véhicule doit être comprise entre 1900 et l'année courante + 1.
3. Un contrat renouvelé concerne le même établissement que son prédécesseur.
4. Un contrat ne peut renouveler qu'un seul contrat précédent, et un contrat ne peut avoir qu'un seul successeur.
5. Les rôles autorisés sont `ADMIN`, `MANAGER` et `VIEWER`.
6. Un `VIEWER` ne peut effectuer aucune mutation.
7. Une session expirée ou révoquée ne peut pas émettre de nouveau JWT.
8. Un établissement ou contrat supprimé logiquement n'accepte plus de nouveaux rattachements.
9. Les identifiants uniques (RNE, numéro de contrat, immatriculation, chassis) sont normalisés (espaces retirés, casse uniforme, email en minuscules).
10. Les montants financiers utilisent le type `Decimal`, jamais `Float`.

---

## 6. Architecture technique

### 6.1 Stack

| Couche | Technologie |
|---|---|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, TanStack Table, React Hook Form, Zod, Axios, Recharts |
| Backend | NestJS, TypeScript, Prisma, PostgreSQL, JWT, Swagger |
| Import/Export | ExcelJS, PDFKit |
| Conteneurisation | Docker, Docker Compose |

### 6.2 Base de données

- PostgreSQL avec Prisma ORM.
- Tables principales : `users`, `auth_sessions`, `establishments`, `contracts`, `vehicles`, `notifications`, `audit_logs`.
- Clés primaires en UUID.
- Suppression logique via `deletedAt`.
- Contraintes SQL sur les dates et l'année des véhicules.

### 6.3 Sécurité

- Authentification JWT stateful (sessions stockées en base).
- RBAC côté backend (`RolesGuard`) et filtrage côté frontend.
- Variables d'environnement pour les secrets JWT, DB, etc.
- Helmet pour les headers HTTP.

### 6.4 Déploiement

- Docker Compose pour le développement (PostgreSQL + backend watch + frontend).
- Dockerfile multi-stage pour la production (à compléter).
- CI/CD recommandée : GitHub Actions (build, lint, tests, déploiement).

---

## 7. Interfaces et intégrations

### 7.1 Entrées

- Fichiers Excel fournis par l'encadrant :
  - `liste_des_etablissements.xlsx`
  - `tarification_template.xlsx` (~35 000 lignes de véhicules)
  - `template_injection_SI.xlsx` (format de sortie attendu)

### 7.2 Sorties

- Fichier final au format `template_injection_SI.xlsx` pour le SI.
- Export PDF du portefeuille de contrats.
- Export Excel des véhicules.

### 7.3 API

- API REST JSON documentée via Swagger à `/api/docs`.
- Authentification par Bearer token.

---

## 8. Planning et phases de livraison

### Phase 1 - Consolidation du socle (2-3 semaines)

- Tests unitaires et d'intégration.
- CI/CD (lint, build, tests).
- Permissions granulaires.
- Recherche full-text (`pg_trgm`).

### Phase 2 - Cœur contractuel avancé (3-4 semaines)

- Garanties, franchises, primes.
- Avenants.
- Documents générés (attestations, cartes vertes).
- Règles d'éligibilité.

### Phase 3 - Sinistres (2-3 semaines)

- Entité `Claim`.
- Workflow de déclaration à clôture.
- Pièces jointes et chronologie.

### Phase 4 - Portail client (2-3 semaines)

- Authentification externe.
- Consultation limitée à un établissement.
- Déclaration en ligne de sinistre.

### Phase 5 - BI et reporting (2-3 semaines)

- KPI avancés.
- Exports graphiques.
- Rapports réglementaires.

### Phase 6 - Intégrations (3-4 semaines)

- API publique et webhooks.
- Télémétrie / GPS (optionnel).
- Rapprochement bancaire.

---

## 9. Critères d'acceptation généraux

1. L'application remplace intégralement le fichier Excel pour les opérations courantes.
2. Les données historiques peuvent être importées sans perte.
3. Le fichier de sortie pour le SI est conforme au template fourni.
4. Les rôles et permissions sont respectés à chaque endpoint.
5. Chaque action sensible est tracée dans le journal d'audit.
6. Les alertes d'échéance sont fiables et visibles.
7. L'application est responsive et utilisable sur desktop.
8. Les builds backend et frontend passent sans erreur.
9. La documentation Swagger est à jour.
10. Les mots de passe et secrets ne sont jamais stockés en clair.

---

## 10. Glossaire

| Terme | Définition |
|---|---|
| **SI** | Système d'Information de BH Assurance. |
| **RNE** | Registre National des Entreprises (identifiant unique d'un établissement). |
| **Lot** | Groupement de contrats traités ensemble. |
| **Renouvellement** | Création d'un nouveau contrat successor à un contrat arrivant à échéance. |
| **Suppression logique** | Marquage d'une ligne comme supprimée (`deletedAt`) sans l'effacer physiquement. |
| **RBAC** | Role-Based Access Control (contrôle d'accès basé sur les rôles). |
| **JWT** | JSON Web Token, utilisé pour l'authentification. |
| **Refresh token** | Jeton longue durée permettant de renouveler l'access token. |

---

*Document généré le 19/08/2026 pour le projet BH Assurance.*
