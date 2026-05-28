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

### Email notifications (optional)
When configured, the app sends email via **Gmail SMTP**:
- **Members:** loan approved (awaiting collection), loan denied
- **Staff** (admin / quartermaster / archivist): new loan request, member marked photos submitted

See `.env.example` for `SMTP_USER`, `SMTP_PASS`, and Firebase Admin credentials.

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

In Vercel: import repo, add env vars from `.env.example` (Firebase client + Admin + Gmail SMTP if you want email), deploy.

### 6. Email notifications (Gmail SMTP)
Use a **club Gmail account** (can be the same Google account you use for Firebase, but sign-in and sending are separate).

1. Turn on **2-Step Verification** for that Google account: [Google Account → Security](https://myaccount.google.com/security).
2. Create an **App password**: Security → 2-Step Verification → App passwords → name it “RAPS app” → copy the 16-character password.
3. In Vercel, set:
   - `SMTP_USER` = full Gmail address (e.g. `raps.club@gmail.com`)
   - `SMTP_PASS` = the app password (not your normal Gmail password)
   - `EMAIL_FROM` = optional, e.g. `RAPS Photography Club <raps.club@gmail.com>`
4. Firebase Admin (for the notification API): Project settings → **Service accounts** → **Generate new private key** → add `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` to Vercel.
5. Set `NEXT_PUBLIC_APP_URL` to your live Vercel URL.
6. Staff must have a valid `email` on their Firestore `users/{uid}` document (filled on Google sign-in).

**Limits:** Free Gmail allows about 500 emails per day — enough for a school club. Google sign-in for members does not send email automatically; SMTP is only for these notification messages.

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

- Email notifications require Gmail SMTP + Firebase Admin env vars on Vercel; the app still works without them (no emails sent)
- No QR scanning
- Equipment delete is soft-delete → **Past equipment** page
