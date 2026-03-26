# Inloggning – ProSC

## Utveckling / lokalt

Efter att du kört databas-seed (`npm run db:seed`) finns en standardanvändare.

| Fält    | Värde            |
|---------|------------------|
| **E-post** | `admin@prosc.com` |
| **Lösenord** | `password123`   |

## Så loggar du in

1. Starta appen: `npm run dev`
2. Öppna t.ex. http://localhost:5173 (eller den port som visas)
3. Gå till **Login** (eller `/login`)
4. Ange e-post och lösenord ovan

## Skapa fler användare

Just nu skapas bara admin-användaren via seed. För att lägga till fler användare behöver du antingen:

- Utöka `prisma/seed.ts` och köra `npm run db:seed` igen, eller  
- Bygga en registrerings-/användarhantering i appen (t.ex. under `/dashboard/settings` eller `/signup`).

## Roller

Användaren från seed har rollen **ADMIN**. Andra roller i systemet (enligt Prisma-schemat) är:

- `ADMIN`
- `MANAGER`
- `MEMBER`
