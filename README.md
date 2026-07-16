# LifeFlow - Modern Hospital Management System (HMS)

LifeFlow is a production-quality, responsive, and secure Hospital Management System (HMS) built with a React-Node-MySQL stack. The system supports full Role-Based Access Control (RBAC) across 8 distinct user roles.

## Monorepo Architecture

* **/backend**: Node.js, Express.js, TypeScript, Sequelize ORM (configured for MySQL, fallback to SQLite).
* **/frontend**: React.js, Vite, TypeScript, Tailwind CSS, Recharts.

---

## Seeded User Logins for Testing

The system automatically seeds initial database records on first startup (if empty).
* **Master Password**: `Password123` (applies to all mock accounts below)

| Role | Username (Email) | Default Context |
| :--- | :--- | :--- |
| **System Admin** | `admin@lifeflow.com` | Complete system configuration, staff management, audit logs |
| **Doctor** | `doctor@lifeflow.com` | Patient consultation, prescribing pad, lab orders, admit patient |
| **Nurse** | `nurse@lifeflow.com` | Vital records, bed monitoring, care log checks |
| **Receptionist** | `receptionist@lifeflow.com` | Walk-in patient registration, doctor schedules, token queuing |
| **Lab Technician** | `lab@lifeflow.com` | Lab request samples, test processing, diagnostic uploads |
| **Pharmacist** | `pharmacist@lifeflow.com` | Drug stock inventory levels, quick POS cart invoice generation |
| **Accountant** | `accountant@lifeflow.com` | Billing, custom invoices, transaction payment recording |
| **Patient** | `patient@lifeflow.com` | Portal booking, medical history, Rx viewer, online payment |

---

## Local Setup Instructions

### 1. Backend Service
1. Navigate to backend: `cd backend`
2. Install dependencies: `npm install`
3. Edit `.env` file if connecting to MySQL (defaults to local zero-setup SQLite fallback).
4. Run dev server: `npm run dev` (starts on `http://localhost:5000`)

### 2. Frontend Client
1. Navigate to frontend: `cd frontend`
2. Install dependencies: `npm install`
3. Run dev client: `npm run dev` (starts on `http://localhost:5173`)
4. Open your browser to `http://localhost:5173`.

---

## Production Deployment (Docker + Nginx)

Compile and build all containers with one command:
```bash
docker-compose up --build
```

Nginx routes public port 80:
* `/api/*` requests forward to Node server (Port 5000)
* Root `/` serves static React assets
