# Kick & Crease — Live Scoring & Turf Discovery

Full-stack real-time match scoring and turf booking platform for Cricket and Football.

## Project Architecture

- **`frontend/`**: React 19 + TypeScript + Vite + Socket.io-client. Responsive scoreboard, live moment animations, QR scanner/viewer, and turf booking modal.
- **`backend/`**: Node.js + Express + TypeScript + Prisma ORM (MySQL) + Socket.io + QRCode generation. Owns all match room phase transitions, atomic claim locks, coin toss resolution, and score calculations.

---

## Prerequisites

1. **Node.js** (v18+) & **npm** (v9+)
2. **MySQL Server** (v8.0+ running on port `3306`)

---

## Local Setup & Quick Start

### 1. Database Creation
In your MySQL terminal, MySQL Workbench, or CLI, create the database:

```sql
CREATE DATABASE IF NOT EXISTS kick_and_crease CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Environment Configuration
Navigate to `backend/` and copy the example environment file:

```bash
# Windows PowerShell
Copy-Item backend/.env.example backend/.env

# macOS / Linux
cp backend/.env.example backend/.env
```

Open `backend/.env` and update your MySQL username and password:
```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/kick_and_crease"
PORT=4000
FRONTEND_URL="http://localhost:5173"
```

### 3. Run Prisma Migrations & Seed Data
Generate Prisma client, push migrations to your local MySQL database, and seed Coimbatore/Chennai/Bengaluru turfs and time slots:

```bash
# Run migration
npm run prisma:migrate

# Seed turfs and slots
npm run prisma:seed
```

*(Alternatively, run directly inside `backend/` via `npx prisma migrate dev` and `npx prisma db seed`)*

### 4. Running the Development Servers

You can start both frontend and backend concurrently with a single command from the project root:

```bash
npm run dev
```

Or run them individually in two separate terminals:

**Terminal 1 (Backend):**
```bash
npm run dev:backend
# Server runs on http://localhost:4000 (WebSocket on ws://localhost:4000)
```

**Terminal 2 (Frontend):**
```bash
npm run dev:frontend
# Client runs on http://localhost:5173
```

---

## Backend API Specification

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/rooms` | Creates a new match room (`waiting_for_opponent`), returns `{ code, qrImageBase64, room }` |
| `GET` | `/rooms/:code` | Fetches current room state |
| `POST` | `/rooms/:code/claim` | Atomic claim for Team A or Team B (`deviceId`). Advances to `toss_pending` when both claimed |
| `POST` | `/rooms/:code/toss` | Server flips coin (50/50), stores winner, auto-advances from `toss_result` to `choice_pending` |
| `POST` | `/rooms/:code/toss-choice` | Toss winner chooses Bat/Bowl or Kickoff/Side. Advances to `in_progress` |
| `POST` | `/rooms/:code/score` | Records score/wicket/goal/cards. Validates `deviceId` claim and cricket batting innings rule |
| `POST` | `/rooms/:code/switch-innings` | Flips active batting team for cricket |
| `GET` | `/turfs?city=&sport=` | Queries turfs with city, sport, and text filters |
| `GET` | `/turfs/:id/slots` | Queries available and booked slots for a turf |
| `POST` | `/bookings` | Atomic transaction slot booking avoiding double-booking |

---

## Real-time Socket.IO Events

Client connects to room channel `room:{code}`:
- `join`: Sent by client with `{ code, deviceId }`
- `phase_changed`: Emitted to all clients on room phase transition (`waiting_for_opponent` → `toss_pending` → `toss_result` → `choice_pending` → `in_progress`)
- `score_updated`: Emitted whenever score or innings changes
- `claim_updated`: Emitted when an opponent joins/claims their team
