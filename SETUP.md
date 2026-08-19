# Campus Community Help Platform
### Blood Donation + Lost & Found Module — CSE421 Software Engineering Project

A fully functional web application with:
- **Frontend:** HTML, CSS, JavaScript (no build tools needed)
- **Backend:** Node.js + Express (REST API)
- **Database:** MySQL

---

## 📁 Folder Structure

```
project/
├── database/
│   └── schema.sql          <- run this in MySQL first
├── backend/
│   ├── config/db.js
│   ├── middleware/auth.js
│   ├── controllers/
│   ├── routes/
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── index.html
    ├── register.html
    ├── login.html
    ├── dashboard.html
    ├── blood.html
    ├── lostfound.html
    ├── css/style.css
    └── js/
```

---

## STEP-BY-STEP SETUP GUIDE

### Step 1 — Install required software (one-time)
1. Install **Node.js** (v18 or higher): https://nodejs.org
2. Install **MySQL** (or MySQL Workbench / XAMPP which includes MySQL): https://dev.mysql.com/downloads
3. Install a code editor like **VS Code**: https://code.visualstudio.com

Check installation by running in terminal:
```
node -v
npm -v
mysql --version
```

---

### Step 2 — Set up the Database
1. Open MySQL (via terminal, MySQL Workbench, or phpMyAdmin if using XAMPP)
2. Run the file `database/schema.sql`. This will:
   - Create the database `campus_help_platform`
   - Create all 7 tables (users, donors, blood_requests, donation_responses, items, claim_requests, notifications)
   - Add performance indexes

Terminal method (if MySQL is in your PATH):
```
mysql -u root -p < database/schema.sql
```
Or just open the `schema.sql` file in MySQL Workbench and click "Execute".

---

### Step 3 — Set up the Backend
```
cd backend
npm install
```
This installs: express, mysql2, bcryptjs, jsonwebtoken, cors, dotenv

Now create your `.env` file:
```
cp .env.example .env
```
Open `.env` and fill in your actual MySQL password:
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=campus_help_platform
JWT_SECRET=any_random_secret_text_here
PORT=5000
```

Start the backend server:
```
npm start
```
You should see: `Server running on http://localhost:5000`

Test it works by opening in browser: http://localhost:5000
You should see: "Campus Help Platform API is running!"

---

### Step 4 — Run the Frontend
No installation needed! Just open `frontend/index.html` directly in your browser.

**Recommended (avoids some browser issues):** Use VS Code's "Live Server" extension:
1. Install "Live Server" extension in VS Code
2. Right-click `frontend/index.html` → "Open with Live Server"

Or simply double-click `index.html` to open it in your browser.

**Important:** Keep the backend server (`npm start`) running in a terminal at all times while using the frontend.

---

### Step 5 — Test the Full System
1. Go to **Register** page → create an account
2. **Login** with that account
3. From Dashboard, go to **Blood Donation**:
   - Register as a donor
   - Post a blood request
   - Search donors
4. Go to **Lost & Found**:
   - Post a lost/found item
   - Browse and claim an item
   - Check "Claims on My Items" to approve/reject

If everything works without errors — congratulations, your project is fully functional! ✅

---

## 🔧 Common Issues

| Problem | Solution |
|---|---|
| "Cannot connect to database" | Check `.env` password is correct, MySQL service is running |
| "CORS error" in browser console | Make sure backend is running on port 5000 |
| "No token provided" error | You need to login again — token may have expired or not saved |
| Port 5000 already in use | Change `PORT` in `.env` to e.g. 5001, and update `API_BASE` in `frontend/js/api.js` |

---

## 🚀 Future Modules (mention in your report/presentation)
- Emergency/SOS Alerts
- Campus Marketplace (buy/sell)
- Event & Volunteer Management
- Community Feed/Forum
- Map Integration

The `notifications` table and modular route/controller structure are already designed to support these future additions easily.
