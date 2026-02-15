# Luxe Look Parlor Dashboard Management System (LLDMS)

Internal administrative system for a beauty parlour: appointments, billing, inventory, staff, payroll, and reports. No customer-facing portal; all bookings are entered by staff.

## Tech Stack

- **Frontend:** Vite, React 18, React Bootstrap, Recharts, React Router, Axios
- **Backend:** Node.js, Express
- **Database:** MySQL

## Setup

### 1. Database

Create MySQL database and run the schema:

```bash
mysql -u root -p < database/database.sql
```

Or in MySQL client:

```sql
source database/database.sql
```

### 2. Environment (Server)

In `server/` create a `.env` file (or set env vars):

```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=luxe_look_dms
JWT_SECRET=your_secret_key
```

### 3. Install dependencies

From project root:

```bash
npm run install:all
```

### 4. Run

**Development (client + server):**

```bash
npm run dev
```

- Frontend: http://localhost:5173  
- API: http://localhost:5000  

**Or run separately:**

```bash
# Terminal 1 – backend
cd server && npm run dev

# Terminal 2 – frontend
cd client && npm run dev
```

### 5. cPanel / Remote MySQL

When connecting to a cPanel database from your local machine:

- **DB_HOST:** Use your hosting provider's MySQL hostname (e.g. `server123.yourhost.com`), not your domain. Find it in cPanel → phpMyAdmin → Variables, or ask your host.
- **DB_NAME:** `cpaneluser_databasename` (e.g. `webypixels_luxe_look`)
- **DB_USER:** MySQL username from cPanel → MySQL Databases → MySQL Users (e.g. `webypixels_luxelook`)
- **Remote MySQL:** In cPanel → Remote MySQL, add your IP address to allow connections.
- **If app runs ON the cPanel server:** Use `DB_HOST=localhost` (not the domain).

### 6. Default login

After the first API start, a default admin is created (if the DB is empty):

- **Email:** admin@luxelook.com  
- **Password:** admin123  

## User Roles

| Role         | Permissions |
|-------------|-------------|
| **Admin**   | Full access: staff, services, inventory, payroll, reports, settings |
| **Receptionist** | Customers, appointments, invoices, daily reports |
| **Staff**   | View own appointments, mark complete, view commission summary |

## Features

- **Dashboard:** Today’s appointments, revenue, low stock, weekly revenue chart, service trend, top staff
- **Customers:** Add/edit, search, visit history
- **Appointments:** Create, assign staff, reschedule, complete/cancel
- **Services:** Categories, pricing, duration, commission
- **Invoices:** Create from services, payment method, link to appointment
- **Inventory:** Products, stock, reorder alerts, purchase/usage
- **Staff & Payroll:** Add staff (admin), salary & commission, calculate payroll, mark paid
- **Reports:** Daily, weekly, monthly, staff performance

## Mobile

The UI is responsive and works on mobile; the main menu is available via the hamburger icon.

## Build for production

```bash
npm run build
```

Serves the built files from `client/dist`. Point your web server at the API for `/api` and at the static build for the rest.
