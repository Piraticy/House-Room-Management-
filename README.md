# Harbor Stay Control Center

A starter rent-management app for properties that include a full house, master bedrooms, and normal rooms.

## What it includes

- Admin dashboard for assigning tenants to a house or room
- Editable pricing for `House`, `Master Bedroom`, and `Normal Room` units
- Owner announcement and direct tenant messaging tools
- Tenant view with in-app alerts when rent is within 60 days of due date
- Seeded demo data for admin, owner, and tenant previews

## Stack

- Next.js 16
- TypeScript
- Tailwind CSS 4
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

## Demo workflow

- Switch between `Admin`, `Owner`, and `Tenant` from the top of the dashboard
- Use the Admin view to assign rooms, change stay length, and edit prices
- Use the Owner view to publish announcements and send direct messages
- Use the Tenant view to see current stay details and due-soon notifications

## Database commands

```bash
npm run db:generate
npm run db:push
npm run db:seed
```
