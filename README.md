# BH Assurance - Gestion du parc assure

Application interne remplacant les fichiers Excel utilises pour gerer les
etablissements, contrats et vehicules assures.

## Stack

- Frontend : Next.js 15, TypeScript, Tailwind CSS, TanStack Table, React Hook
  Form, Zod, Axios et Recharts.
- Backend : NestJS, TypeScript, Prisma, PostgreSQL, JWT et Swagger.
- Import/export : ExcelJS et PDFKit.

## Demarrage

1. Copier `.env.example` vers `.env`.
2. Demarrer PostgreSQL :

```bash
docker compose up -d postgres
```

3. Appliquer la migration et creer l'administrateur :

```bash
npm run prisma:generate -w backend
npm run prisma:migrate -w backend
npm run prisma:seed -w backend
```

4. Demarrer les deux applications :

```bash
npm run dev
```

- Frontend : http://localhost:3000
- API : http://localhost:3001/api
- Swagger : http://localhost:3001/api/docs

Compte initial :

- Email : `admin@bh-assurance.tn`
- Mot de passe : `Admin123!`

Le mot de passe et les secrets JWT doivent etre remplaces avant tout deploiement.

## Fonctionnalites

- Authentification JWT, rotation du refresh token et roles.
- CRUD des etablissements, contrats, vehicules et utilisateurs.
- Renouvellement d'un contrat avec conservation de l'historique.
- Recherche, pagination et tri cote serveur.
- Dashboard et alertes d'echeance a 30 jours.
- Import et export Excel des vehicules.
- Export PDF du portefeuille des contrats.
- Notifications persistantes et journal d'audit.
- Documentation OpenAPI/Swagger.

## Architecture

```text
backend/src/
  auth/ users/ establishments/ contracts/ vehicles/
  dashboard/ advanced/ common/ prisma/

frontend/
  app/ components/ hooks/ lib/ types/

prisma/
  schema.prisma
  migrations/
```

La conception detaillee est disponible dans `docs/DATABASE_DESIGN.md`.

## Verification

```bash
npm run build -w backend
npm run build -w frontend
DATABASE_URL="postgresql://..." npx prisma validate --schema prisma/schema.prisma
```

