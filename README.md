# 🌊 Wisdom Wave

<p align="center">
  <img src="https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black&style=for-the-badge" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white&style=for-the-badge" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite&logoColor=white&style=for-the-badge" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?logo=tailwind-css&logoColor=white&style=for-the-badge" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white&style=for-the-badge" alt="Node.js" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white&style=for-the-badge" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Socket.io-4.8-010101?logo=socket.io&logoColor=white&style=for-the-badge" alt="Socket.io" />
</p>

---

**Wisdom Wave** is a gamified multiplayer coding arena and learn-to-code platform. Experience coding through immersive single-player challenge pathways, algorithmic puzzles, and real-time PvP coding battles with users around the world. Designed with a sleek, futuristic dark-mode aesthetic featuring glowing ambient orbs and smooth custom micro-interactions.

🚀 **Live App**: [wisdom-wave1.vercel.app](wisdom-wave1.vercel.app)

---

## ✨ Key Features

### 🕹️ Arcade Mode
Level up and sharpen your technical skills across 11 popular programming languages and core web technologies:
* **Languages & Runtimes**: Python, JavaScript, TypeScript, Java, C, C++
* **Databases & Querying**: SQL, MongoDB
* **Frontend & Styling**: React, HTML & CSS

### ⚔️ Battle Mode (PvP)
* **Real-time Coding Arenas**: Create or join custom rooms powered by **Socket.io**.
* **Competitor Live tracking**: Battle head-to-head with friends to solve challenges. Score updates are synced instantly across clients.
* **Winner Resolution**: Match evaluation and immediate leaderboard point distribution upon battle completion.

### 🧩 Puzzle Mode
* Algorithmic and logic puzzles designed to improve problem-solving efficiency and prepare you for technical interviews.

### 📊 Personal Dashboard
* **Dynamic Progress Analytics**: View your overall stats, solved count, experience (XP) levels, and detailed breakdowns of your performance per language.
* **Recent Activity Feed**: Track your history of battles, puzzles completed, and achievements earned.

### 🏆 Interactive Leaderboard
* Real-time global ranking showcase displaying XP, level, and solved challenges of top coders globally.

---

## 🛠️ Tech Stack

* **Frontend**: React 19 (Hooks, Context, Custom cursors), TypeScript, Tailwind CSS, Vite.
* **Backend**: Node.js, Express, Socket.io (WebSocket connection handling).
* **Database**: MongoDB & Mongoose ODM.
* **Authentication**: State-protected Client-side Routing, JSON Web Tokens (JWT) & bcrypt passwords.

---

## 📂 Project Structure

```bash
wisdom-wave/
├── server/                     # Express & Socket.io Backend
│   ├── index.js                # App Entry & Socket Event Handlers
│   ├── routes/                 # Express API Routes (Auth, User Actions)
│   ├── models/                 # Mongoose Database Schemas
│   └── middleware/             # Route Protection & JWT Validation
├── src/                        # React & Tailwind Frontend
│   ├── assets/                 # SVGs, custom videos, fonts
│   ├── components/             # Reusable UI Components
│   ├── data/                   # Game Data (Questions, Puzzles, Extra Modes)
│   ├── pages/                  # Main Views (Dashboard, Arcade, Battle, Puzzle, etc.)
│   ├── routes/                 # React Router Config
│   └── services/               # REST API & Socket Client Service Hooks
├── vercel.json                 # Rewrite directives for SPA deployment
└── package.json                # Root Dependencies & Build Commands
```

---

## ⚙️ Local Development Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (v20 or higher recommended)
* [MongoDB](https://www.mongodb.com/try/download/community) installed locally or a free [MongoDB Atlas Cloud Cluster](https://www.mongodb.com/cloud/atlas)

### 1. Clone & Install Dependencies

Clone this repository:
```bash
git clone https://github.com/Mr-Rohit2006/Wisdom-wave1.git
cd wisdom-wave
```

Install frontend packages:
```bash
npm install
```

Install backend packages:
```bash
cd server
npm install
cd ..
```

### 2. Configure Environment Variables

Create a `.env` file in the **root directory**:
```env
VITE_API_URL=http://localhost:5009/api
```

Create a `.env` file in the **`server` directory**:
```env
PORT=5009
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/wisdom-wave
JWT_SECRET=your_super_secret_jwt_key
```

### 3. Run the Project

#### Run Backend Server
From the root directory:
```bash
npm run start
```
*Or navigate to `server` and run `node index.js`.*

#### Run Frontend Client
Open a new terminal tab at the root directory:
```bash
npm run dev
```
Open **http://localhost:5173** to view the application in the browser!

---

## 🚀 Deployment

### Backend (Render / Heroku)
The backend is set up to automatically serve the static build files from the React client when deployed in a single monorepo format:
1. Compile the React build inside the root directory: `npm run build`
2. Push your code. The entry point is `server/index.js` which automatically hosts files from the `dist/` directory via `express.static`.

### Frontend SPA rewrites (Vercel)
If you deploy the client on Vercel separately, a `vercel.json` file is configured with rewrites to handle SPA routing seamlessly:
```json
{
  "rewrites": [
    {
      "source": "/((?!api/.*).*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 🔒 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
