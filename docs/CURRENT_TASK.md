# Tache courante

## Livraison complete

- [x] Etape 1 - Base de donnees, MCD, UML et Prisma
- [x] Etape 2 - Backend NestJS, DTO, services, controllers et Swagger
- [x] Etape 3 - Frontend Next.js, layout, sidebar, navbar et pages
- [x] Etape 4 - CRUD et controles d acces
- [x] Etape 5 - Dashboard, statistiques et graphiques
- [x] Etape 6 - Notifications, PDF, Excel, import, recherche et logs

## Fonctionnalites metier avancees implementees

- [x] Contrainte un seul contrat actif par etablissement (index partiel PostgreSQL + verification applicative)
- [x] Renouvellement de contrat avec soft-delete de l ancien et conservation de l historique
- [x] Endpoint /establishments/for-contract avec flag `hasActiveContract`
- [x] Formulaire de creation de contrat : etablissements deja contractes grises/desactives
- [x] Temps reel entre employes via Server-Sent Events (SSE)
- [x] Hook et provider frontend pour recharger automatiquement les listes

## Cahier des charges

- [x] Rédaction du cahier des charges complet (`docs/Cahier-des-charges.md`)
- [x] Validation des acteurs, modules fonctionnels, règles métier et planning

## Prochaines étapes proposées (phases du CDC)

- [ ] Phase 1 - Consolidation du socle (tests, CI/CD, permissions granulaires, recherche full-text)
- [ ] Phase 2 - Cœur contractuel avancé (garanties, primes, avenants, attestations)
- [ ] Phase 3 - Module Sinistres (Claims)
- [ ] Phase 4 - Portail client
- [ ] Phase 5 - BI et reporting avancé
- [ ] Phase 6 - Intégrations (API publique, webhooks, télémétrie)

## Verification

- [x] Schema Prisma valide
- [x] Migration SQL initiale generee
- [x] Build backend reussi
- [x] Build frontend reussi
- [ ] Test integration PostgreSQL (moteur Docker non accessible dans la session)
