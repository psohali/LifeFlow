# LifeFlow – Blood Bank Management System (India)

LifeFlow is a beginner-friendly, full-stack Blood Bank Management System built specifically for India using **HTML, CSS, JavaScript, Node.js, Express.js, and MySQL**.

---

## Features

- **Indian Context Throughout**:
  - `+91` 10-digit Indian mobile number validation (`6`, `7`, `8`, or `9` prefix).
  - 6-digit Indian postal PIN code validation.
  - Complete dropdown of all **28 Indian States and 8 Union Territories**.
  - `DD-MM-YYYY` date formatting in **Indian Standard Time (IST / Asia/Kolkata)**.
  - Indian hospitals and city examples (e.g., AIIMS New Delhi, Apollo Hospital Chennai, KEM Hospital Mumbai).
- **Role-Based Login & Dashboards (`login.html`)**:
  - **Donor (`donor-login.html` → `donor-dashboard.html`)**: Register with full Indian donor details, sign in with email or `+91` mobile number, view and update permitted profile information, and check matching hospital blood needs.
  - **Patient / Blood Requester (`patient-login.html` → `patient-dashboard.html`)**: Register and sign in with email or `+91` mobile number, submit blood requests, and privately track status updates (`Pending`, `Approved`, `Rejected`, `Fulfilled`).
  - **Administrator (`admin-login.html` → `admin-dashboard.html`)**: Manage donor and patient accounts, view all blood requests, update request statuses, and manage blood inventory.
- **Blood Availability Page (`availability.html`)**:
  - Dynamically fetches all 8 blood groups (`A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`) from MySQL.
  - Displays the required notice: **"Sample Demonstration Inventory – Not Live Hospital Stock."**

---

## Project Structure

```text
LifeFlow/
├── public/
│   ├── index.html
│   ├── about.html
│   ├── availability.html
│   ├── donate.html
│   ├── request.html
│   ├── login.html
│   ├── donor-login.html
│   ├── donor-dashboard.html
│   ├── patient-login.html
│   ├── patient-dashboard.html
│   ├── admin-login.html
│   ├── admin-dashboard.html
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── script.js
│   └── images/
├── routes/
│   ├── authRoutes.js
│   ├── donorRoutes.js
│   ├── patientRoutes.js
│   ├── requestRoutes.js
│   ├── inventoryRoutes.js
│   └── adminRoutes.js
├── controllers/
│   ├── authController.js
│   ├── donorController.js
│   ├── patientController.js
│   ├── requestController.js
│   ├── inventoryController.js
│   └── adminController.js
├── middleware/
│   └── authMiddleware.js
├── utils/
│   └── validators.js
├── config/
│   └── db.js
├── database/
│   └── database.sql
├── .env.example
├── .gitignore
├── package.json
├── server.js
├── create-admin.js
└── README.md
```

---

## Step-by-Step Setup Guide (Beginner-Friendly)

### 1. Install Node.js
1. Visit [https://nodejs.org/](https://nodejs.org/) and download the **LTS (Long Term Support)** version.
2. Run the installer with default options.
3. Verify installation in Command Prompt or Terminal:
   ```bash
   node -v
   npm -v
   ```

### 2. Install and Configure MySQL
1. Download **MySQL Community Server** and **MySQL Workbench** from [https://dev.mysql.com/downloads/](https://dev.mysql.com/downloads/).
2. Set a `root` password during installation and ensure the MySQL service runs on port `3306`.

### 3. Open the Project in VS Code
1. Open **Visual Studio Code**.
2. Click **File → Open Folder...** and select the `LifeFlow` project folder.
3. Open the integrated terminal using **Terminal → New Terminal**.

### 4. Create the Database Using MySQL Workbench
1. Open **MySQL Workbench** and connect to your local MySQL instance (`127.0.0.1:3306`, user `root`).
2. You can create the schema directly using `database/database.sql` in the next step.

### 5. Import and Execute `database.sql`
1. In MySQL Workbench, click **File → Open SQL Script...** and select `database/database.sql`.
2. Click the **Execute (Lightning Bolt)** button to create the `lifeflow` database and all five tables:
   - `users` (supports `donor`, `patient`, `admin` roles and `account_status`)
   - `donors` (linked to `users.user_id`)
   - `blood_requests` (linked to `patient_user_id`)
   - `blood_inventory` (pre-loaded with the 8 sample demonstration stock rows totalling 123 units)
   - `request_history`

### 6. Configure the `.env` File
1. Copy `.env.example` and rename the copy to `.env`.
2. Fill in your local MySQL password:
   ```env
   PORT=3000
   NODE_ENV=development

   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_root_password
   DB_NAME=lifeflow
   ```

### 7. Install Dependencies
Run:
```bash
npm install
```

### 8. Configure or Create Administrator Credentials (Username & Password Only)
LifeFlow has **no** hardcoded administrator credentials. You can configure admin credentials using **only a username and password** in any of three ways:
1. **First-Time Web Setup**: Open `http://localhost:3000/admin-login.html` when no admin exists and enter your desired username and password (minimum 8 characters).
2. **Environment Variables (`.env`)**: Set `LIFEFLOW_ADMIN_USERNAME` and `LIFEFLOW_ADMIN_PASSWORD` in `.env` (or Settings → Secrets).
3. **Terminal Script**: Run:
```bash
node create-admin.js
```
Follow the prompts to enter a username and password (minimum 8 characters). Passwords are hashed using `bcrypt` before saving to MySQL.

### 9. Start the Server
Run:
```bash
npm start
```
Expected console output:
```text
[DB] Connected to MySQL database "lifeflow" at 127.0.0.1:3306
LifeFlow server running at http://localhost:3000
```

### 10. Open the Website in Your Browser
Visit `http://localhost:3000` in your browser:
- Use **Login** in the navigation bar (`http://localhost:3000/login.html`) to access **Donor Login**, **Patient Login**, or **Admin Login**.
