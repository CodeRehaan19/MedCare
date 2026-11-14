# MedCare Pharmacy Manager

A responsive pharmacy inventory and billing application built with Node.js, Express and SQLite.

## Demo login
- Username: `admin`
- Password: `MedCare@123`

## Features
- Dashboard with medicine, low-stock, expiry and daily-sales totals
- Add, edit, search and delete medicines
- Batch number, supplier, price, quantity and expiry tracking
- Sales billing with automatic stock deduction
- Invoice receipt with browser print support
- Sales history and invoice reprint

## Run locally
1. Install Node.js 20 or later.
2. In this folder run `npm install`.
3. Run `npm start`.
4. Open `http://localhost:3000`.

## Deploy on Render
Create a Render Web Service from this repository:
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Region: Singapore
- Add environment variable `SESSION_SECRET` with a long random value.

**Important data note:** SQLite stores data in a local file. On Render, attach a persistent disk mounted at `/var/data` and set `DB_FILE=/var/data/medcare.db` before using this for real records. Without a persistent disk, records can be lost when the service is replaced. Do not store real patient or prescription data in this demo application.

This is a basic academic/demo project, not a validated pharmacy/POS or prescription-compliance system.