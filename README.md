# 🎓 Campus Community Help Platform
### Blood Donation + Lost & Found Module
**Course:** CSE421 — Software Engineering

A fully functional full-stack web application that helps university students and staff support each other through two connected modules: **Blood Donation** and **Lost & Found**.

---

## 🌐 Live Demo
- **Frontend:** https://campus-help.sh010.workers.dev/
---

## ✨ Features

### 🔐 Authentication
- Secure registration & login with JWT-based sessions
- Passwords hashed with bcrypt (never stored in plain text)

### 🩸 Blood Donation Module
- Register as a blood donor with location and availability
- Search donors by blood group and/or location
- Post blood requests with urgency levels (normal/urgent/critical)
- Respond to open blood requests as a donor

### 🎒 Lost & Found Module
- Post lost or found items with category, description, location, and date
- Browse and search items by type/keyword
- Submit claim requests with proof of ownership
- Approve/reject claims on items you posted

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MySQL |
| Authentication | JWT (jsonwebtoken), bcryptjs |
| Deployment | Render (backend), Netlify (frontend), Railway/Aiven (database) |

---

## 📂 Project Structure
```
project/
├── database/schema.sql       # Full DB schema with 7 tables + indexes
├── backend/                  # Express REST API
│   ├── config/db.js
│   ├── controllers/
│   ├── middleware/auth.js
│   ├── routes/
│   └── server.js
└── frontend/                 # Static HTML/CSS/JS client
    ├── *.html
    ├── css/style.css
    └── js/
```

## 🗄️ Database Design
7 tables: `users`, `donors`, `blood_requests`, `donation_responses`, `items`, `claim_requests`, `notifications`
— all connected via a shared `users` table, designed to be extendable with future modules.

---

## 🚀 Getting Started (Local Setup)
See [SETUP.md](./SETUP.md) for full step-by-step local setup instructions.

---

## 🔮 Future Scope
- Emergency/SOS Alert system
- Campus Marketplace (buy/sell)
- Event & Volunteer Management
- Community Feed/Forum
- Map integration for donor/item locations

---

## 👥 Team
- Md. Shakil Hossain — 315222031

## 📄 License
Academic project for CSE421 — Software Engineering course.
