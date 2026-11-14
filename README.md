# MedCare — Medical Store Management System

A responsive academic project using HTML, CSS, JavaScript, PHP and MySQL.

## Features
- Password-protected administrator login and logout
- Dashboard with medicine count, total units, low-stock count and today's sales
- Add and delete medicines
- Search inventory by medicine, category or batch
- Record sales and automatically reduce stock
- Recent sales list
- Responsive layout for mobile and desktop

## Admin login configuration
Set these environment variables on your hosting provider:
- `ADMIN_USERNAME` — administrator username (for example, `admin`)
- `ADMIN_PASSWORD` — a strong private password. Do not commit it to GitHub.

The login is disabled unless `ADMIN_PASSWORD` is configured, so set it before making the site public.

## Database configuration
The app reads Railway MySQL variables automatically: `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, and `MYSQLDATABASE`.
For local XAMPP, defaults are `localhost`, `root`, blank password, and database `medical_store`.

## Run locally (XAMPP)
1. Start Apache and MySQL in XAMPP.
2. Copy this folder into `C:\xampp\htdocs\MedCare`.
3. Import `database.sql` using phpMyAdmin.
4. Set `ADMIN_USERNAME=admin` and `ADMIN_PASSWORD` in your PHP server environment (or configure them in your local Apache/PHP environment).
5. Open `http://localhost/MedCare/login.php`.

## Deploy on Railway
1. Create a Railway project and add a MySQL database service.
2. Deploy this GitHub repository as a service; Railway will detect the Dockerfile.
3. Add `ADMIN_USERNAME` and a strong `ADMIN_PASSWORD` as service variables.
4. Connect the app service to the MySQL service so the Railway MySQL variables are available.
5. Import `database.sql` into the provisioned MySQL database (the SQL file contains `CREATE DATABASE` / `USE`; if your Railway database user cannot create databases, remove those two lines before importing).
6. Generate a public domain for the app service and verify `/login.php`.

## Important
This is an academic/demo project, not a production pharmacy system. Before real use, add CSRF protection, role permissions, audit logs, backups, stronger operational monitoring, and secure handling of customer/prescription data. Do not use it to dispense prescription medicines without required professional and legal checks.
