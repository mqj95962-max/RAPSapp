# RAPS Photography Club App

Web app for a school photography club: **equipment loaning & inventory** and **event coverage tracking**. Built with Next.js, Firebase (Auth + Firestore), and deployable on Vercel.

## Features

### Equipment
- Members browse borrowable gear (working / faulty only), add to cart, submit loan requests (no reservation until approved)
- Quartermasters approve/deny loans, confirm pickup (7-day countdown), extend returns, mark returned
- Manage equipment, categories, status colours, external loans, archives (loan history & past equipment)
- Search on every page (name / equipment ID)

### Events
- Members log events (date, time, description) and mark photos submitted
- Archivists confirm submissions; confirmed events count toward **My hours**
- Search on every page

### Auth & roles
- Google sign-in; first visit prompts for name (stored on user profile)
- All users default to `member` in Firestore
- Promote staff manually in Firebase Console → Firestore → `users/{uid}` → `roles` array: `["member", "admin"]`

### Time
- App syncs with internet time (WorldTimeAPI) for overdue calculation; refreshes every 5 minutes

## Setup

### 1. Firebase project
1. Create a project at [Firebase Console](https://console.firebase.google.com)
2. Enable **Authentication** → Google sign-in
3. Create **Firestore** database
4. Register a web app and copy config into `.env.local` (see `.env.example`)

### 2. Deploy Firestore rules & indexes
```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select existing project, use ./firebase
firebase deploy --only firestore:rules,firestore:indexes
```

Or paste `firebase/firestore.rules` into the Console rules editor.

### 3. Run locally
```bash
npm install
cp .env.example .env.local
# fill in Firebase keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. Promote admins
In Firestore, document `users/{uid}`:
```json
{
  "roles": ["member", "admin"]
}
```

**Important:** Clients cannot change `roles` (enforced in rules). Only edit roles in Console or Admin SDK.

### 5. GitHub & Vercel
```bash
git init
git add .
git commit -m "Initial RAPS club app"
git remote add origin https://github.com/YOUR_USER/raps-app.git
git push -u origin main
```

In Vercel: import repo, add the same `NEXT_PUBLIC_FIREBASE_*` env vars, deploy.

## Project structure

```
src/app/          # Next.js App Router pages
src/components/   # UI components
src/context/      # Auth, cart, server time
src/lib/          # Firebase, Firestore helpers, types
firebase/         # Security rules & indexes
```

## Loan lifecycle

1. Member submits request → `pending` (equipment **not** reserved)
2. Quartermaster approves with pickup date + note → `approved` (waiting pickup)
3. Quartermaster confirms pickup → `active`, 7-day return from pickup date
4. Overdue if past return date (server time)
5. Quartermaster marks returned → archived in loan history

External loans follow the same flow with `isExternal: true` and show **EXTERNAL LOAN** on badges.

## Notes

- No push notifications; all updates are manual in the app
- No QR scanning
- Equipment delete is soft-delete → **Past equipment** page
