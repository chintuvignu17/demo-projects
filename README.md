# RupeeFlow — Smart Expense Tracker 💸

A polished, modern personal finance dashboard crafted specifically for Indian Rupee (**₹ / INR**) budgeting, expense tracking, and category analytics. Built with pure **HTML5, CSS3, and Vanilla JavaScript** — no backend, no React, no database server, no login, and no paid APIs required.

---

## ✨ Features

- **Strict Indian Rupee (₹) & Date Formatting**:
  - All amounts displayed using `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
  - Indian digit grouping (e.g. ₹1,500.00, ₹25,000.00, ₹1,00,000.00).
  - Indian date formatting (`DD MMM YYYY`).
  - Realistic Indian expense categories and demo items (Swiggy, Blinkit, D-Mart, Petrol, Jio 5G, Flat Rent, BESCOM electricity, College fees).

- **Fintech Dashboard**:
  - Dark Navy Fintech aesthetic with neon emerald accents.
  - Light Slate mode toggle.
  - KPI stat cards: Total Spent, Monthly Budget, Remaining Budget, Transaction Count, Daily Average, and Month-over-Month comparison.
  - Interactive **Chart.js** Category Doughnut and Daily Spending Trend bar charts with INR tooltips.

- **Expense Management**:
  - Modal form to Add / Edit expenses with Title, Amount (₹), Category, Date, Payment Method (UPI, Cash, Debit Card, Credit Card, Net Banking, Other), and Notes.
  - Validation to prevent zero/negative or empty entries.
  - Delete with safety confirmation modal.

- **Monthly Budget Planner**:
  - Set and adjust monthly limits in INR per month.
  - Dynamic progress meter that turns **Amber at 80% usage** and **Rose/Red at 100% usage (exceeded)**.
  - Daily Safe-to-Spend allowance for remaining days in the month.
  - Category-level breakdown vs budget.
  - Multi-month historical comparison table.

- **Category Management**:
  - Default categories: Food & Dining, Groceries, Transport & Fuel, Education, Shopping, Bills & Utilities, Health & Medical, Entertainment, Rent & Housing, Subscriptions, Other.
  - Add custom categories with customizable color swatches and Lucide icons.
  - Safe deletion safeguard with automatic reassignment of existing transactions.

- **Analytics & Reports**:
  - Detailed charts: Daily spending distribution, category breakdown doughnut, payment method breakdown, and multi-month trend.
  - Filter by month or view All-Time analytics.

- **CSV Export & Local Data Privacy**:
  - Export transactions to CSV formatted with `INR` currency codes and escaped fields.
  - 100% private in browser via `LocalStorage`.
  - JSON Backup Export & JSON Restore features.
  - Reset Demo Indian Data and Erase All Data controls.

---

## 🚀 How to Run Locally

You can run RupeeFlow in any of the following ways:

### Method 1: Direct Browser Opening (Zero Setup)
1. Navigate to the project folder:
   `c:\Users\palav\OneDrive\Desktop\my projects`
2. Simply double-click **`index.html`** to open it directly in Chrome, Edge, Brave, or Firefox.

### Method 2: Local Web Server (Recommended)
You can start a local development server using Python:

```bash
# Open PowerShell or Command Prompt in the project folder
python -m http.server 3000
```
Then open your browser and visit:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 📁 Project Structure

```
my projects/
├── index.html        # Semantic HTML5 layout, views, modals, and templates
├── style.css         # Fintech Dark/Light styling, animations, and responsive layout
├── script.js         # Vanilla JavaScript engine, INR formatting, LocalStorage, Chart.js
└── README.md         # Documentation & guide
```

---

## 🔒 Privacy & Offline Use
- All transactions, budgets, and settings are saved securely in your browser's **LocalStorage**.
- No account, login, or cloud connection required.
- Everything works offline.
