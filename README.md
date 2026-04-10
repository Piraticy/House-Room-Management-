# Harbor Stay Control Center

A role-based rental management starter for properties that include a full house, master bedrooms, and normal rooms.

## What it includes

- Real credentials login for `Admin`, `Owner`, and `Tenant`
- Separate role dashboards instead of one crowded page
- Admin pricing and lease assignment controls
- Owner announcements and direct tenant messaging
- Tenant stay details, inbox, and due-soon rent alerts
- Seeded demo accounts for local testing

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS 4
- Auth.js / NextAuth credentials auth
- Prisma
- SQLite

## Run locally

```bash
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Demo accounts

- Admin: `admin@harborstay.app` / `Admin@123`
- Owner: `owner@harborstay.app` / `Owner@123`
- Tenant: `mina@harborstay.app` / `Tenant@123`

## App structure

- `/` landing page
- `/login` credentials sign-in
- `/admin` admin-only pricing and assignment workspace
- `/owner` owner-only communication workspace
- `/tenant` tenant-only stay and alert workspace

## Database commands

```bash
npm run db:generate
npm run db:push
npm run db:seed
```
