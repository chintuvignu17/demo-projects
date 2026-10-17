/**
 * ============================================================================
 * RUPEEFLOW — SMART EXPENSE TRACKER
 * Complete Application Logic (Vanilla JavaScript)
 * Consistent Indian Rupee (INR) Formatting, LocalStorage & Chart.js Integration
 * ============================================================================
 */

'use strict';

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================

const STORAGE_KEYS = {
  TRANSACTIONS: 'rupeeflow_transactions_v1',
  CATEGORIES: 'rupeeflow_categories_v1',
  BUDGETS: 'rupeeflow_budgets_v1',
  SETTINGS: 'rupeeflow_settings_v1'
};

const DEFAULT_CATEGORIES = [
  { id: 'cat-food', name: 'Food & Dining', icon: 'utensils', color: '#f97316' },
  { id: 'cat-groceries', name: 'Groceries', icon: 'shopping-cart', color: '#10b981' },
  { id: 'cat-transport', name: 'Transport & Fuel', icon: 'car', color: '#3b82f6' },
  { id: 'cat-education', name: 'Education', icon: 'graduation-cap', color: '#8b5cf6' },
  { id: 'cat-shopping', name: 'Shopping', icon: 'shopping-bag', color: '#ec4899' },
  { id: 'cat-bills', name: 'Bills & Utilities', icon: 'zap', color: '#eab308' },
  { id: 'cat-health', name: 'Health & Medical', icon: 'heart-pulse', color: '#ef4444' },
  { id: 'cat-entertainment', name: 'Entertainment', icon: 'film', color: '#a855f7' },
  { id: 'cat-rent', name: 'Rent & Housing', icon: 'home', color: '#6366f1' },
  { id: 'cat-subscriptions', name: 'Subscriptions', icon: 'tv', color: '#06b6d4' },
  { id: 'cat-other', name: 'Other', icon: 'more-horizontal', color: '#64748b' }
];

const PRESET_COLORS = [
  '#10b981', '#06b6d4', '#3b82f6', '#6366f1',
  '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#84cc16', '#14b8a6', '#64748b'
];

const PRESET_ICONS = [
  'shopping-cart', 'utensils', 'car', 'home',
  'zap', 'graduation-cap', 'heart-pulse', 'film',
  'tv', 'shopping-bag', 'smartphone', 'coffee',
  'gift', 'briefcase', 'plane', 'more-horizontal'
];

const DEFAULT_SETTINGS = {
  userName: 'Rahul Sharma',
  defaultBudget: 35000,
  showDecimals: true,
  theme: 'dark'
};

// ============================================================================
// 2. APPLICATION STATE
// ============================================================================

const state = {
  transactions: [],
  categories: [],
  budgets: {},
  settings: { ...DEFAULT_SETTINGS },
  
  // UI & View State
  activeView: 'dashboard',
  currentMonth: getCurrentYearMonth(), // 'YYYY-MM'
  
  // Transactions Filter & Pagination State
  txFilter: {
    search: '',
    month: 'ALL',
    category: 'ALL',
    payment: 'ALL',
    sort: 'date-desc',
    page: 1,
    perPage: 10
  },

  // Reports View State
  reports: {
    month: getCurrentYearMonth(),
    scope: 'month' // 'month' | 'all'
  },

  // Modals & Temp Edit State
  editingTransactionId: null,
  editingCategoryId: null,
  pendingDeleteCategoryId: null
};

// Global Chart Instances tracker to prevent canvas duplicates
const chartInstances = {
  dashboardCategory: null,
  dashboardTrend: null,
  reportDaily: null,
  reportCategory: null,
  reportPayment: null,
  reportHistorical: null
};

// ============================================================================
// 3. UTILITY FUNCTIONS (INDIAN FORMATTING & DATES)
// ============================================================================

/**
 * Format any numeric amount strictly into Indian Rupees (INR)
 * Supports Indian digit grouping (e.g. ₹1,50,000.00)
 */
function formatINR(amount, customDecimals = null) {
  const numeric = Number(amount) || 0;
  const decimals = customDecimals !== null 
    ? customDecimals 
    : (state.settings.showDecimals ? 2 : 0);

  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numeric);
}

/**
 * Format standard Date strings (YYYY-MM-DD) into Indian readable format:
 * e.g. "15 Oct 2026"
 */
function formatDateIN(dateStr) {
  if (!dateStr) return 'N/A';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  
  const d = new Date(year, month, day);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * Get current year-month string: 'YYYY-MM'
 */
function getCurrentYearMonth() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Get human-readable month & year name: 'October 2026'
 */
function getMonthName(yearMonthStr) {
  if (!yearMonthStr || yearMonthStr === 'ALL') return 'All Time';
  const [y, m] = yearMonthStr.split('-');
  const date = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
}

/**
 * Safe HTML escape to prevent XSS
 */
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Helper to safely refresh Lucide Icons across dynamic DOM
 */
function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

/**
 * Toast Notification System
 */
function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconName = type === 'success' ? 'check-circle' : (type === 'warning' ? 'alert-triangle' : 'alert-circle');
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="toast-icon"></i>
    <span>${escapeHTML(message)}</span>
  `;

  container.appendChild(toast);
  refreshIcons();

  setTimeout(() => {
    toast.classList.add('toast-exit');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  }, duration);
}

// ============================================================================
// 4. LOCALSTORAGE MANAGEMENT & SAMPLE DATA
// ============================================================================

/**
 * Generate realistic Indian Demo Transactions
 * Based on the current date so data is always fresh & active
 */
function generateDemoData() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  // Helper to format date offset
  const createDate = (daysAgo, targetMonth = m) => {
    const d = new Date(y, targetMonth, now.getDate() - daysAgo);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  const currentYearMonth = `${y}-${String(m + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(y, m - 1, 1);
  const prevYearMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const sampleTransactions = [
    // Current Month Realistic Expenses
    {
      id: 'tx-demo-1',
      title: 'Flat Rent & Society Maintenance',
      amount: 18500.00,
      category: 'Rent & Housing',
      date: createDate(1),
      paymentMethod: 'Net Banking',
      notes: 'Paid via HDFC Net Banking to landlord',
      createdAt: Date.now() - 86400000
    },
    {
      id: 'tx-demo-2',
      title: 'D-Mart Monthly Grocery Run',
      amount: 3840.50,
      category: 'Groceries',
      date: createDate(2),
      paymentMethod: 'Debit Card',
      notes: 'Atta, rice, oil, pulses, and kitchen supplies',
      createdAt: Date.now() - 172800000
    },
    {
      id: 'tx-demo-3',
      title: 'BESCOM Electricity Bill',
      amount: 2150.00,
      category: 'Bills & Utilities',
      date: createDate(3),
      paymentMethod: 'UPI',
      notes: 'Paid on PhonePe',
      createdAt: Date.now() - 259200000
    },
    {
      id: 'tx-demo-4',
      title: 'IndianOil Petrol Full Tank',
      amount: 1850.00,
      category: 'Transport & Fuel',
      date: createDate(4),
      paymentMethod: 'Credit Card',
      notes: 'Fuel for car',
      createdAt: Date.now() - 345600000
    },
    {
      id: 'tx-demo-5',
      title: 'Swiggy Biryani & Starters',
      amount: 680.00,
      category: 'Food & Dining',
      date: createDate(5),
      paymentMethod: 'UPI',
      notes: 'Weekend dinner with roommates',
      createdAt: Date.now() - 432000000
    },
    {
      id: 'tx-demo-6',
      title: 'Jio 5G 3-Month Plan',
      amount: 719.00,
      category: 'Bills & Utilities',
      date: createDate(6),
      paymentMethod: 'UPI',
      notes: 'Mobile recharge via Google Pay',
      createdAt: Date.now() - 518400000
    },
    {
      id: 'tx-demo-7',
      title: 'Blinkit Instant Groceries',
      amount: 420.00,
      category: 'Groceries',
      date: createDate(7),
      paymentMethod: 'UPI',
      notes: 'Milk, bread, bananas & chips',
      createdAt: Date.now() - 604800000
    },
    {
      id: 'tx-demo-8',
      title: 'Myntra Festive Sale Shirt',
      amount: 1499.00,
      category: 'Shopping',
      date: createDate(8),
      paymentMethod: 'Credit Card',
      notes: 'Casual cotton shirt',
      createdAt: Date.now() - 691200000
    },
    {
      id: 'tx-demo-9',
      title: 'Apollo Pharmacy Medicines',
      amount: 580.00,
      category: 'Health & Medical',
      date: createDate(10),
      paymentMethod: 'UPI',
      notes: 'Vitamins & cold relief tablets',
      createdAt: Date.now() - 864000000
    },
    {
      id: 'tx-demo-10',
      title: 'Netflix & Spotify Subscriptions',
      amount: 798.00,
      category: 'Subscriptions',
      date: createDate(11),
      paymentMethod: 'Credit Card',
      notes: 'Auto-debit recurring',
      createdAt: Date.now() - 950400000
    },
    {
      id: 'tx-demo-11',
      title: 'PVR Inox Movie Tickets & Popcorn',
      amount: 850.00,
      category: 'Entertainment',
      date: createDate(12),
      paymentMethod: 'UPI',
      notes: 'BookMyShow booking',
      createdAt: Date.now() - 1036800000
    },
    {
      id: 'tx-demo-12',
      title: 'Chai & Snacks at Office Cafe',
      amount: 140.00,
      category: 'Food & Dining',
      date: createDate(13),
      paymentMethod: 'Cash',
      notes: 'Evening tea & samosa',
      createdAt: Date.now() - 1123200000
    },

    // Previous Month Demo Entries (For MoM Comparisons & History)
    {
      id: 'tx-demo-prev-1',
      title: 'Previous Month Rent',
      amount: 18500.00,
      category: 'Rent & Housing',
      date: `${prevYearMonth}-01`,
      paymentMethod: 'Net Banking',
      notes: 'Regular rent transfer',
      createdAt: Date.now() - 3000000000
    },
    {
      id: 'tx-demo-prev-2',
      title: 'College Course Exam Fees',
      amount: 6500.00,
      category: 'Education',
      date: `${prevYearMonth}-10`,
      paymentMethod: 'Net Banking',
      notes: 'Semester certification exam fee',
      createdAt: Date.now() - 2800000000
    },
    {
      id: 'tx-demo-prev-3',
      title: 'D-Mart Supermarket & Provisions',
      amount: 4650.00,
      category: 'Groceries',
      date: `${prevYearMonth}-14`,
      paymentMethod: 'Debit Card',
      notes: 'Monthly staples',
      createdAt: Date.now() - 2500000000
    },
    {
      id: 'tx-demo-prev-4',
      title: 'Petrol & Vehicle Servicing',
      amount: 3200.00,
      category: 'Transport & Fuel',
      date: `${prevYearMonth}-20`,
      paymentMethod: 'Credit Card',
      notes: 'Oil change and fuel',
      createdAt: Date.now() - 2100000000
    }
  ];

  const sampleBudgets = {
    [currentYearMonth]: 40000,
    [prevYearMonth]: 40000
  };

  return { sampleTransactions, sampleBudgets };
}

/**
 * Load all application data from browser LocalStorage
 */
function loadState() {
  try {
    // 1. Settings
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
      state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
    }

    // 2. Categories
    const savedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (savedCategories) {
      state.categories = JSON.parse(savedCategories);
    } else {
      state.categories = [...DEFAULT_CATEGORIES];
      saveCategories();
    }

    // 3. Transactions & Budgets
    const savedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    const savedBudgets = localStorage.getItem(STORAGE_KEYS.BUDGETS);

    if (savedTransactions) {
      state.transactions = JSON.parse(savedTransactions);
    }
    if (savedBudgets) {
      state.budgets = JSON.parse(savedBudgets);
    }

    // If first-time launch and no transactions exist, seed realistic Indian demo data
    if (!savedTransactions) {
      const { sampleTransactions, sampleBudgets } = generateDemoData();
      state.transactions = sampleTransactions;
      state.budgets = sampleBudgets;
      saveTransactions();
      saveBudgets();
    }

  } catch (err) {
    console.error('Error loading data from LocalStorage:', err);
    state.categories = [...DEFAULT_CATEGORIES];
    state.transactions = [];
    state.budgets = {};
  }

  // Ensure current month budget is set
  const curYm = getCurrentYearMonth();
  if (!state.budgets[curYm]) {
    state.budgets[curYm] = state.settings.defaultBudget;
    saveBudgets();
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(state.transactions));
  } catch (e) {
    console.error('Failed to save transactions to LocalStorage', e);
  }
}

function saveCategories() {
  try {
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(state.categories));
  } catch (e) {
    console.error('Failed to save categories to LocalStorage', e);
  }
}

function saveBudgets() {
  try {
    localStorage.setItem(STORAGE_KEYS.BUDGETS, JSON.stringify(state.budgets));
  } catch (e) {
    console.error('Failed to save budgets to LocalStorage', e);
  }
}

function saveSettings() {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
  } catch (e) {
    console.error('Failed to save settings to LocalStorage', e);
  }
}

// ============================================================================
// 5. CALCULATIONS & STATS ENGINE
// ============================================================================

/**
 * Calculate comprehensive statistics for a given month ('YYYY-MM')
 */
function getMonthStats(yearMonth) {
  const ym = yearMonth || state.currentMonth;
  const monthTx = state.transactions.filter(tx => tx.date.startsWith(ym));
  
  const totalSpent = monthTx.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const budget = state.budgets[ym] !== undefined ? Number(state.budgets[ym]) : Number(state.settings.defaultBudget);
  const remaining = budget - totalSpent;
  const pctUsed = budget > 0 ? (totalSpent / budget) * 100 : 0;
  
  // Calculate day-level metrics
  const now = new Date();
  const [targetYear, targetMonth] = ym.split('-').map(Number);
  const isCurrentMonth = (now.getFullYear() === targetYear && (now.getMonth() + 1) === targetMonth);
  
  const totalDaysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const daysPassed = isCurrentMonth ? Math.max(1, now.getDate()) : totalDaysInMonth;
  const daysRemaining = isCurrentMonth ? Math.max(1, totalDaysInMonth - now.getDate()) : 0;
  
  const dailyAverage = totalSpent / daysPassed;
  const dailyAllowance = (remaining > 0 && daysRemaining > 0) ? (remaining / daysRemaining) : 0;

  return {
    yearMonth: ym,
    monthName: getMonthName(ym),
    totalSpent,
    budget,
    remaining,
    pctUsed,
    txCount: monthTx.length,
    dailyAverage,
    dailyAllowance,
    daysRemaining,
    transactions: monthTx
  };
}

/**
 * Calculate Month-over-Month (MoM) spending comparison
 */
function getMoMComparison(currentYm) {
  const [y, m] = currentYm.split('-').map(Number);
  const prevDate = new Date(y, m - 2, 1);
  const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const currentSpent = state.transactions
    .filter(tx => tx.date.startsWith(currentYm))
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const prevSpent = state.transactions
    .filter(tx => tx.date.startsWith(prevYm))
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  if (prevSpent === 0) {
    return { hasData: false, text: 'First tracked month' };
  }

  const diff = currentSpent - prevSpent;
  const pctChange = ((diff / prevSpent) * 100);
  const isHigher = diff > 0;

  return {
    hasData: true,
    isHigher,
    diffAmount: Math.abs(diff),
    pctChange: Math.abs(pctChange).toFixed(1),
    text: `${isHigher ? '▲' : '▼'} ${Math.abs(pctChange).toFixed(1)}% vs last month`
  };
}

/**
 * Find category object by name or ID
 */
function getCategoryInfo(catNameOrId) {
  const found = state.categories.find(c => c.name === catNameOrId || c.id === catNameOrId);
  if (found) return found;
  return {
    id: 'cat-other',
    name: catNameOrId || 'Other',
    icon: 'tag',
    color: '#64748b'
  };
}

// ============================================================================
// 6. UI RENDERING ENGINES
// ============================================================================

/**
 * Update the Topbar Month Dropdown options based on all active transaction dates
 */
function populateMonthSelectors() {
  const allMonthsSet = new Set();
  allMonthsSet.add(state.currentMonth);
  allMonthsSet.add(getCurrentYearMonth());

  state.transactions.forEach(tx => {
    if (tx.date && tx.date.length >= 7) {
      allMonthsSet.add(tx.date.substring(0, 7));
    }
  });

  // Sort descending (latest months first)
  const sortedMonths = Array.from(allMonthsSet).sort().reverse();

  // 1. Global topbar month selector
  const globalSelector = document.getElementById('globalMonthSelector');
  if (globalSelector) {
    const curVal = globalSelector.value || state.currentMonth;
    globalSelector.innerHTML = sortedMonths.map(ym => `
      <option value="${ym}" ${ym === curVal ? 'selected' : ''}>${getMonthName(ym)}</option>
    `).join('');
  }

  // 2. Transactions view filter month selector
  const txMonthFilter = document.getElementById('txFilterMonth');
  if (txMonthFilter) {
    const curVal = txMonthFilter.value || 'ALL';
    let opts = '<option value="ALL">All Months</option>';
    opts += sortedMonths.map(ym => `
      <option value="${ym}" ${ym === curVal ? 'selected' : ''}>${getMonthName(ym)}</option>
    `).join('');
    txMonthFilter.innerHTML = opts;
  }

  // 3. Budgets view month selector
  const budgetMonthPicker = document.getElementById('budgetMonthPicker');
  if (budgetMonthPicker) {
    const curVal = budgetMonthPicker.value || state.currentMonth;
    budgetMonthPicker.innerHTML = sortedMonths.map(ym => `
      <option value="${ym}" ${ym === curVal ? 'selected' : ''}>${getMonthName(ym)}</option>
    `).join('');
  }

  // 4. Reports view month selector
  const reportsMonthSelect = document.getElementById('reportsMonthSelect');
  if (reportsMonthSelect) {
    const curVal = reportsMonthSelect.value || state.reports.month;
    reportsMonthSelect.innerHTML = sortedMonths.map(ym => `
      <option value="${ym}" ${ym === curVal ? 'selected' : ''}>${getMonthName(ym)}</option>
    `).join('');
  }
}

/**
 * Populate Category Dropdowns across forms & filters
 */
function populateCategorySelectors() {
  // 1. Expense modal select
  const expenseCatSelect = document.getElementById('expenseCategory');
  if (expenseCatSelect) {
    expenseCatSelect.innerHTML = state.categories.map(cat => `
      <option value="${escapeHTML(cat.name)}">${escapeHTML(cat.name)}</option>
    `).join('');
  }

  // 2. Transactions Filter category select
  const txCatFilter = document.getElementById('txFilterCategory');
  if (txCatFilter) {
    const cur = txCatFilter.value || 'ALL';
    let html = '<option value="ALL">All Categories</option>';
    html += state.categories.map(cat => `
      <option value="${escapeHTML(cat.name)}" ${cat.name === cur ? 'selected' : ''}>${escapeHTML(cat.name)}</option>
    `).join('');
    txCatFilter.innerHTML = html;
  }

  // 3. Reassign modal select
  const reassignSelect = document.getElementById('reassignTargetCategory');
  if (reassignSelect) {
    reassignSelect.innerHTML = state.categories.map(cat => `
      <option value="${escapeHTML(cat.name)}">${escapeHTML(cat.name)}</option>
    `).join('');
  }
}

/**
 * Check and render budget threshold warning & danger alerts (80% and 100%)
 */
function renderBudgetAlerts() {
  const stats = getMonthStats(state.currentMonth);
  const container = document.getElementById('budgetAlertContainer');
  const viewAlert = document.getElementById('budgetThresholdAlert');
  if (!container) return;

  container.innerHTML = '';
  if (viewAlert) viewAlert.innerHTML = '';

  // Only trigger if budget is defined and positive
  if (stats.budget <= 0) return;

  let alertHTML = '';

  if (stats.pctUsed >= 100) {
    // 100%+ Critical Alert
    const overspent = Math.abs(stats.remaining);
    alertHTML = `
      <div class="alert-banner alert-banner-danger">
        <div class="alert-banner-content">
          <div class="alert-banner-icon"><i data-lucide="alert-octagon"></i></div>
          <div>
            <div class="alert-banner-title">Monthly Budget Exceeded!</div>
            <div class="alert-banner-desc">
              You have spent <strong>${formatINR(stats.totalSpent)}</strong>, which exceeds your monthly limit of 
              <strong>${formatINR(stats.budget)}</strong> by <span style="font-weight:700">${formatINR(overspent)}</span>.
            </div>
          </div>
        </div>
        <div class="alert-banner-action">
          <button class="btn btn-danger btn-sm" onclick="navigateTo('budgets')">
            Manage Budget
          </button>
        </div>
      </div>
    `;
  } else if (stats.pctUsed >= 80) {
    // 80% to 99% Warning Alert
    alertHTML = `
      <div class="alert-banner alert-banner-warning">
        <div class="alert-banner-content">
          <div class="alert-banner-icon"><i data-lucide="alert-triangle"></i></div>
          <div>
            <div class="alert-banner-title">Budget Warning: ${stats.pctUsed.toFixed(0)}% Used</div>
            <div class="alert-banner-desc">
              You have spent <strong>${formatINR(stats.totalSpent)}</strong> of your <strong>${formatINR(stats.budget)}</strong> budget. 
              Only <strong>${formatINR(stats.remaining)}</strong> remaining for the rest of ${stats.monthName}.
            </div>
          </div>
        </div>
        <div class="alert-banner-action">
          <button class="btn btn-secondary btn-sm" onclick="navigateTo('budgets')">
            View Breakdown
          </button>
        </div>
      </div>
    `;
  }

  if (alertHTML) {
    container.innerHTML = alertHTML;
    if (viewAlert) viewAlert.innerHTML = alertHTML;
    refreshIcons();
  }
}

/**
 * Render Sidebar Mini Budget Progress
 */
function renderSidebarBudget() {
  const stats = getMonthStats(state.currentMonth);
  const fill = document.getElementById('sidebarBudgetFill');
  const pctEl = document.getElementById('sidebarBudgetPct');
  const spentEl = document.getElementById('sidebarBudgetSpent');
  const totalEl = document.getElementById('sidebarBudgetTotal');
  const txBadge = document.getElementById('sidebarTxCount');

  if (fill && pctEl && spentEl && totalEl) {
    const clampedPct = Math.min(100, Math.max(0, stats.pctUsed));
    fill.style.width = `${clampedPct}%`;
    pctEl.textContent = `${stats.pctUsed.toFixed(0)}%`;
    spentEl.textContent = formatINR(stats.totalSpent);
    totalEl.textContent = `/ ${formatINR(stats.budget)}`;

    // Color shift on sidebar widget
    if (stats.pctUsed >= 100) {
      fill.style.background = 'linear-gradient(90deg, #f43f5e 0%, #fda4af 100%)';
      pctEl.style.color = 'var(--accent-rose)';
    } else if (stats.pctUsed >= 80) {
      fill.style.background = 'linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)';
      pctEl.style.color = 'var(--accent-amber)';
    } else {
      fill.style.background = 'linear-gradient(90deg, #10b981 0%, #00f090 100%)';
      pctEl.style.color = 'var(--accent-emerald)';
    }
  }

  if (txBadge) {
    txBadge.textContent = state.transactions.length;
  }

  const avatar = document.getElementById('sidebarAvatar');
  const nameEl = document.getElementById('sidebarUserName');
  if (nameEl) nameEl.textContent = state.settings.userName;
  if (avatar) {
    const initials = state.settings.userName
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'RF';
    avatar.textContent = initials;
  }
}

// ============================================================================
// 7. VIEW 1: DASHBOARD OVERVIEW
// ============================================================================

function renderDashboard() {
  const stats = getMonthStats(state.currentMonth);

  // 1. Welcome Card
  const welcomeMonth = document.getElementById('welcomeCurrentMonth');
  const welcomeUser = document.getElementById('welcomeUserName');
  if (welcomeMonth) welcomeMonth.textContent = stats.monthName;
  if (welcomeUser) welcomeUser.textContent = state.settings.userName.split(' ')[0] || 'Friend';

  // 2. Summary KPI Cards
  const kpiSpent = document.getElementById('kpiTotalSpent');
  const kpiBudget = document.getElementById('kpiMonthlyBudget');
  const kpiRemaining = document.getElementById('kpiRemainingBudget');
  const kpiTxCount = document.getElementById('kpiTxCount');
  const kpiBudgetPill = document.getElementById('kpiBudgetUsagePill');
  const kpiRemainingStatus = document.getElementById('kpiRemainingStatus');
  const kpiDailyAvg = document.getElementById('kpiDailyAvg');
  const kpiMoM = document.getElementById('kpiMoMComparison');

  if (kpiSpent) kpiSpent.textContent = formatINR(stats.totalSpent);
  if (kpiBudget) kpiBudget.textContent = formatINR(stats.budget);
  if (kpiRemaining) {
    kpiRemaining.textContent = formatINR(stats.remaining);
    kpiRemaining.style.color = stats.remaining < 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)';
  }
  if (kpiTxCount) kpiTxCount.textContent = stats.txCount;

  if (kpiBudgetPill) {
    kpiBudgetPill.textContent = `${stats.pctUsed.toFixed(0)}% utilized`;
    kpiBudgetPill.style.color = stats.pctUsed >= 100 ? 'var(--accent-rose)' : (stats.pctUsed >= 80 ? 'var(--accent-amber)' : 'var(--accent-emerald)');
  }

  if (kpiRemainingStatus) {
    if (stats.remaining < 0) {
      kpiRemainingStatus.innerHTML = `<span class="badge badge-danger">Over by ${formatINR(Math.abs(stats.remaining))}</span>`;
    } else if (stats.pctUsed >= 80) {
      kpiRemainingStatus.innerHTML = `<span class="badge badge-warning">High Spending</span>`;
    } else {
      kpiRemainingStatus.innerHTML = `<span class="badge badge-success">On Track</span>`;
    }
  }

  if (kpiDailyAvg) {
    kpiDailyAvg.textContent = `${formatINR(stats.dailyAverage)} / day avg`;
  }

  if (kpiMoM) {
    const mom = getMoMComparison(state.currentMonth);
    if (mom.hasData) {
      const badgeClass = mom.isHigher ? 'badge-danger' : 'badge-success';
      kpiMoM.innerHTML = `<span class="badge ${badgeClass}">${mom.text}</span>`;
    } else {
      kpiMoM.innerHTML = `<span class="badge badge-neutral">${mom.text}</span>`;
    }
  }

  // 3. Recent Transactions Table (Top 5 entries)
  renderDashboardRecentTransactions(stats.transactions);

  // 4. Render Dashboard Charts
  renderDashboardCharts(stats);

  // 5. Update Alerts & Sidebar
  renderBudgetAlerts();
  renderSidebarBudget();
}

/**
 * Render Recent Transactions list on the Dashboard
 */
function renderDashboardRecentTransactions(monthTransactions) {
  const table = document.getElementById('dashboardRecentTable');
  const tbody = document.getElementById('dashboardRecentList');
  const emptyState = document.getElementById('dashboardRecentEmpty');

  if (!tbody || !emptyState) return;

  const sorted = [...monthTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent = sorted.slice(0, 5);

  if (recent.length === 0) {
    if (table) table.style.display = 'none';
    emptyState.classList.add('visible');
    tbody.innerHTML = '';
  } else {
    if (table) table.style.display = 'table';
    emptyState.classList.remove('visible');

    tbody.innerHTML = recent.map(tx => {
      const cat = getCategoryInfo(tx.category);
      return `
        <tr>
          <td>
            <div class="tx-title-cell">
              <div class="tx-cat-icon" style="background-color: ${cat.color}20; color: ${cat.color}">
                <i data-lucide="${cat.icon}"></i>
              </div>
              <div>
                <div class="tx-title-main">${escapeHTML(tx.title)}</div>
                ${tx.notes ? `<div class="tx-notes">${escapeHTML(tx.notes)}</div>` : ''}
              </div>
            </div>
          </td>
          <td>
            <span class="badge" style="background-color: ${cat.color}15; color: ${cat.color}">
              ${escapeHTML(cat.name)}
            </span>
          </td>
          <td>${formatDateIN(tx.date)}</td>
          <td><span class="payment-tag">${escapeHTML(tx.paymentMethod || 'UPI')}</span></td>
          <td class="text-right">
            <span class="tx-amount">${formatINR(tx.amount)}</span>
          </td>
          <td class="text-center">
            <div class="tx-actions">
              <button class="icon-btn" onclick="openExpenseModal('${tx.id}')" title="Edit">
                <i data-lucide="edit-2"></i>
              </button>
              <button class="icon-btn text-danger" onclick="promptDeleteTransaction('${tx.id}')" title="Delete">
                <i data-lucide="trash-2"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  refreshIcons();
}

/**
 * Render Charts on Dashboard (Category Doughnut & Spending Trend)
 */
function renderDashboardCharts(stats) {
  // 1. Category Doughnut Chart
  const doughnutCanvas = document.getElementById('dashboardCategoryChart');
  const doughnutEmpty = document.getElementById('dashboardCategoryEmpty');

  if (doughnutCanvas) {
    if (chartInstances.dashboardCategory) {
      chartInstances.dashboardCategory.destroy();
      chartInstances.dashboardCategory = null;
    }

    // Group expenses by category
    const categoryTotals = {};
    stats.transactions.forEach(tx => {
      const cat = tx.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(tx.amount);
    });

    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);

    if (labels.length === 0) {
      doughnutCanvas.style.display = 'none';
      if (doughnutEmpty) doughnutEmpty.style.display = 'flex';
    } else {
      doughnutCanvas.style.display = 'block';
      if (doughnutEmpty) doughnutEmpty.style.display = 'none';

      const colors = labels.map(label => getCategoryInfo(label).color);

      chartInstances.dashboardCategory = new Chart(doughnutCanvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: state.settings.theme === 'dark' ? '#121a2e' : '#ffffff',
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: state.settings.theme === 'dark' ? '#94a3b8' : '#475569',
                boxWidth: 12,
                font: { family: 'Inter', size: 11 },
                padding: 12
              }
            },
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  const val = ctx.parsed || 0;
                  const total = data.reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                  return ` ${ctx.label}: ${formatINR(val)} (${pct}%)`;
                }
              }
            }
          },
          cutout: '68%'
        }
      });
    }
  }

  // 2. Spending Trend Chart (Daily across the month)
  const trendCanvas = document.getElementById('dashboardTrendChart');
  const trendEmpty = document.getElementById('dashboardTrendEmpty');

  if (trendCanvas) {
    if (chartInstances.dashboardTrend) {
      chartInstances.dashboardTrend.destroy();
      chartInstances.dashboardTrend = null;
    }

    const [year, month] = stats.yearMonth.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    const dailyTotals = new Array(totalDays).fill(0);

    stats.transactions.forEach(tx => {
      const day = parseInt(tx.date.split('-')[2], 10);
      if (day >= 1 && day <= totalDays) {
        dailyTotals[day - 1] += Number(tx.amount);
      }
    });

    const hasData = dailyTotals.some(v => v > 0);

    if (!hasData) {
      trendCanvas.style.display = 'none';
      if (trendEmpty) trendEmpty.style.display = 'flex';
    } else {
      trendCanvas.style.display = 'block';
      if (trendEmpty) trendEmpty.style.display = 'none';

      const labels = Array.from({ length: totalDays }, (_, i) => `${i + 1} ${getMonthName(stats.yearMonth).split(' ')[0].substring(0, 3)}`);

      chartInstances.dashboardTrend = new Chart(trendCanvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Daily Spent',
            data: dailyTotals,
            backgroundColor: 'rgba(16, 185, 129, 0.65)',
            hoverBackgroundColor: '#10b981',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: state.settings.theme === 'dark' ? '#64748b' : '#94a3b8',
                maxTicksLimit: 10,
                font: { size: 10 }
              }
            },
            y: {
              grid: {
                color: state.settings.theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0'
              },
              ticks: {
                color: state.settings.theme === 'dark' ? '#64748b' : '#94a3b8',
                callback: value => formatINR(value, 0),
                font: { size: 10 }
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` Spent: ${formatINR(ctx.parsed.y)}`
              }
            }
          }
        }
      });
    }
  }
}

// ============================================================================
// 8. VIEW 2: TRANSACTION MANAGEMENT (SEARCH, FILTER, SORT, PAGINATE)
// ============================================================================

function renderTransactionsView() {
  const { search, month, category, payment, sort, page, perPage } = state.txFilter;

  // 1. Filter Transactions
  let filtered = state.transactions.filter(tx => {
    // Search match
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchTitle = (tx.title || '').toLowerCase().includes(q);
      const matchNotes = (tx.notes || '').toLowerCase().includes(q);
      const matchCat = (tx.category || '').toLowerCase().includes(q);
      if (!matchTitle && !matchNotes && !matchCat) return false;
    }

    // Month filter
    if (month !== 'ALL' && !tx.date.startsWith(month)) {
      return false;
    }

    // Category filter
    if (category !== 'ALL' && tx.category !== category) {
      return false;
    }

    // Payment method filter
    if (payment !== 'ALL' && tx.paymentMethod !== payment) {
      return false;
    }

    return true;
  });

  // 2. Sort Transactions
  filtered.sort((a, b) => {
    switch (sort) {
      case 'date-asc':
        return new Date(a.date) - new Date(b.date);
      case 'amount-desc':
        return Number(b.amount) - Number(a.amount);
      case 'amount-asc':
        return Number(a.amount) - Number(b.amount);
      case 'title-asc':
        return (a.title || '').localeCompare(b.title || '');
      case 'date-desc':
      default:
        return new Date(b.date) - new Date(a.date);
    }
  });

  // 3. Calculate Filtered Totals
  const totalAmount = filtered.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const totalCount = filtered.length;

  const countEl = document.getElementById('txFilteredCount');
  const totalEl = document.getElementById('txFilteredTotal');
  if (countEl) countEl.textContent = totalCount;
  if (totalEl) totalEl.textContent = formatINR(totalAmount);

  // 4. Pagination slicing
  const totalPages = Math.max(1, Math.ceil(totalCount / perPage));
  const currentPage = Math.min(page, totalPages);
  state.txFilter.page = currentPage;

  const startIndex = (currentPage - 1) * perPage;
  const paginatedList = filtered.slice(startIndex, startIndex + perPage);

  // 5. Render Desktop Table & Mobile Cards
  const table = document.getElementById('txFullTable');
  const tbody = document.getElementById('txFullTableBody');
  const mobileContainer = document.getElementById('txMobileCardsContainer');
  const emptyState = document.getElementById('txEmptyState');
  const paginationFooter = document.getElementById('txPagination');

  if (totalCount === 0) {
    if (table) table.style.display = 'none';
    if (mobileContainer) mobileContainer.style.display = 'none';
    if (emptyState) emptyState.classList.add('visible');
    if (paginationFooter) paginationFooter.style.display = 'none';
    if (tbody) tbody.innerHTML = '';
  } else {
    if (table) table.style.display = window.innerWidth > 768 ? 'table' : 'none';
    if (mobileContainer) mobileContainer.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    if (emptyState) emptyState.classList.remove('visible');
    if (paginationFooter) paginationFooter.style.display = 'flex';

    // Desktop Table Rows
    if (tbody) {
      tbody.innerHTML = paginatedList.map(tx => {
        const cat = getCategoryInfo(tx.category);
        return `
          <tr>
            <td>
              <div class="tx-title-cell">
                <div class="tx-cat-icon" style="background-color: ${cat.color}20; color: ${cat.color}">
                  <i data-lucide="${cat.icon}"></i>
                </div>
                <div>
                  <div class="tx-title-main">${escapeHTML(tx.title)}</div>
                  ${tx.notes ? `<div class="tx-notes">${escapeHTML(tx.notes)}</div>` : ''}
                </div>
              </div>
            </td>
            <td>
              <span class="badge" style="background-color: ${cat.color}15; color: ${cat.color}">
                ${escapeHTML(cat.name)}
              </span>
            </td>
            <td>${formatDateIN(tx.date)}</td>
            <td><span class="payment-tag">${escapeHTML(tx.paymentMethod || 'UPI')}</span></td>
            <td class="text-right">
              <span class="tx-amount">${formatINR(tx.amount)}</span>
            </td>
            <td class="text-center">
              <div class="tx-actions">
                <button class="icon-btn" onclick="openExpenseModal('${tx.id}')" title="Edit">
                  <i data-lucide="edit-2"></i>
                </button>
                <button class="icon-btn text-danger" onclick="promptDeleteTransaction('${tx.id}')" title="Delete">
                  <i data-lucide="trash-2"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Mobile Cards Rendering
    if (mobileContainer) {
      mobileContainer.innerHTML = paginatedList.map(tx => {
        const cat = getCategoryInfo(tx.category);
        return `
          <div class="mobile-tx-card">
            <div class="mobile-tx-header">
              <div class="tx-title-cell">
                <div class="tx-cat-icon" style="background-color: ${cat.color}20; color: ${cat.color}">
                  <i data-lucide="${cat.icon}"></i>
                </div>
                <div>
                  <div class="tx-title-main">${escapeHTML(tx.title)}</div>
                  <span class="badge" style="background-color: ${cat.color}15; color: ${cat.color}; font-size:10px;">
                    ${escapeHTML(cat.name)}
                  </span>
                </div>
              </div>
              <div class="mobile-tx-amount">${formatINR(tx.amount)}</div>
            </div>
            ${tx.notes ? `<div class="tx-notes">${escapeHTML(tx.notes)}</div>` : ''}
            <div class="mobile-tx-meta">
              <span><i data-lucide="calendar" style="width:12px; height:12px; vertical-align:middle;"></i> ${formatDateIN(tx.date)}</span>
              <span class="payment-tag">${escapeHTML(tx.paymentMethod || 'UPI')}</span>
            </div>
            <div class="mobile-tx-footer">
              <span style="font-size: 11px; color: var(--text-dim);">ID: ${tx.id.substring(0, 8)}</span>
              <div class="tx-actions">
                <button class="btn btn-secondary btn-sm" onclick="openExpenseModal('${tx.id}')">
                  <i data-lucide="edit-2"></i>
                  <span>Edit</span>
                </button>
                <button class="btn btn-danger btn-sm" onclick="promptDeleteTransaction('${tx.id}')">
                  <i data-lucide="trash-2"></i>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Pagination Controls Update
    const curPageEl = document.getElementById('txCurrentPage');
    const totalPagesEl = document.getElementById('txTotalPages');
    const prevBtn = document.getElementById('txPrevPageBtn');
    const nextBtn = document.getElementById('txNextPageBtn');

    if (curPageEl) curPageEl.textContent = currentPage;
    if (totalPagesEl) totalPagesEl.textContent = totalPages;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  }

  refreshIcons();
}

// ============================================================================
// 9. VIEW 3: MONTHLY BUDGETS
// ============================================================================

function renderBudgetsView() {
  const selectedMonth = document.getElementById('budgetMonthPicker')?.value || state.currentMonth;
  const stats = getMonthStats(selectedMonth);

  // 1. Budget Amount Input Value
  const inputAmount = document.getElementById('budgetInputAmount');
  if (inputAmount) {
    inputAmount.value = stats.budget;
  }

  // 2. Budget Visual Meter Card
  const meterMonth = document.getElementById('budgetMeterMonth');
  const meterPct = document.getElementById('budgetMeterPct');
  const meterBar = document.getElementById('budgetProgressBar');
  const statusBadge = document.getElementById('budgetStatusBadge');

  if (meterMonth) meterMonth.textContent = stats.monthName;
  if (meterPct) meterPct.textContent = `${stats.pctUsed.toFixed(0)}%`;

  if (meterBar) {
    const clampedPct = Math.min(100, Math.max(0, stats.pctUsed));
    meterBar.style.width = `${clampedPct}%`;

    meterBar.classList.remove('warning', 'danger');
    if (stats.pctUsed >= 100) {
      meterBar.classList.add('danger');
      if (meterPct) meterPct.style.color = 'var(--accent-rose)';
      if (statusBadge) {
        statusBadge.textContent = 'Budget Exceeded';
        statusBadge.style.color = 'var(--accent-rose)';
      }
    } else if (stats.pctUsed >= 80) {
      meterBar.classList.add('warning');
      if (meterPct) meterPct.style.color = 'var(--accent-amber)';
      if (statusBadge) {
        statusBadge.textContent = 'High Usage (Warning)';
        statusBadge.style.color = 'var(--accent-amber)';
      }
    } else {
      if (meterPct) meterPct.style.color = 'var(--accent-emerald)';
      if (statusBadge) {
        statusBadge.textContent = 'Budget Healthy';
        statusBadge.style.color = 'var(--accent-emerald)';
      }
    }
  }

  // 3. Budget Metrics 4-Box Grid
  const metricLimit = document.getElementById('budgetMetricLimit');
  const metricSpent = document.getElementById('budgetMetricSpent');
  const metricRemaining = document.getElementById('budgetMetricRemaining');
  const metricDailyAllowance = document.getElementById('budgetMetricDailyAllowance');
  const daysRemainingText = document.getElementById('budgetDaysRemainingText');

  if (metricLimit) metricLimit.textContent = formatINR(stats.budget);
  if (metricSpent) metricSpent.textContent = formatINR(stats.totalSpent);
  if (metricRemaining) {
    metricRemaining.textContent = formatINR(stats.remaining);
    metricRemaining.style.color = stats.remaining < 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)';
  }
  if (metricDailyAllowance) {
    metricDailyAllowance.textContent = formatINR(stats.dailyAllowance);
  }
  if (daysRemainingText) {
    daysRemainingText.textContent = stats.daysRemaining > 0 
      ? `for remaining ${stats.daysRemaining} days` 
      : 'month ended';
  }

  // 4. Category-wise Spending Breakdown vs Budget Table
  renderBudgetCategoryBreakdown(stats);

  // 5. Historical Months Summary Table
  renderBudgetHistoryTable();

  // 6. Threshold Alert in Budgets view
  renderBudgetAlerts();
}

/**
 * Category-wise Spending Breakdown Table in Budgets View
 */
function renderBudgetCategoryBreakdown(stats) {
  const tbody = document.getElementById('budgetCategoryBreakdownList');
  if (!tbody) return;

  const categoryTotals = {};
  const categoryCounts = {};

  stats.transactions.forEach(tx => {
    const c = tx.category || 'Other';
    categoryTotals[c] = (categoryTotals[c] || 0) + Number(tx.amount);
    categoryCounts[c] = (categoryCounts[c] || 0) + 1;
  });

  const sortedCats = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a]);

  if (sortedCats.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center" style="padding: 28px; color: var(--text-dim);">
          No expenses recorded for ${stats.monthName}.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = sortedCats.map(catName => {
    const cat = getCategoryInfo(catName);
    const spent = categoryTotals[catName];
    const count = categoryCounts[catName];
    const shareOfBudget = stats.budget > 0 ? ((spent / stats.budget) * 100).toFixed(1) : '0';
    const visualWidth = Math.min(100, (spent / (stats.totalSpent || 1)) * 100).toFixed(1);

    return `
      <tr>
        <td>
          <div class="tx-title-cell">
            <div class="tx-cat-icon" style="background-color: ${cat.color}20; color: ${cat.color}">
              <i data-lucide="${cat.icon}"></i>
            </div>
            <span class="tx-title-main">${escapeHTML(cat.name)}</span>
          </div>
        </td>
        <td>${count} tx</td>
        <td><strong>${formatINR(spent)}</strong></td>
        <td>${shareOfBudget}% of limit</td>
        <td style="min-width: 140px;">
          <div class="sbc-bar-bg" style="margin: 0;">
            <div class="sbc-bar-fill" style="width: ${visualWidth}%; background-color: ${cat.color}"></div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  refreshIcons();
}

/**
 * Historical Months Summary Table in Budgets View
 */
function renderBudgetHistoryTable() {
  const tbody = document.getElementById('budgetHistoryTableBody');
  if (!tbody) return;

  // Gather unique months from transactions and budgets
  const monthsSet = new Set(Object.keys(state.budgets));
  state.transactions.forEach(tx => {
    if (tx.date && tx.date.length >= 7) {
      monthsSet.add(tx.date.substring(0, 7));
    }
  });

  const sortedMonths = Array.from(monthsSet).sort().reverse();

  tbody.innerHTML = sortedMonths.map(ym => {
    const stats = getMonthStats(ym);
    let statusBadge = '<span class="badge badge-success">Under Budget</span>';
    if (stats.pctUsed >= 100) {
      statusBadge = '<span class="badge badge-danger">Exceeded</span>';
    } else if (stats.pctUsed >= 80) {
      statusBadge = '<span class="badge badge-warning">Near Limit</span>';
    }

    return `
      <tr>
        <td><strong>${getMonthName(ym)}</strong></td>
        <td>${formatINR(stats.budget)}</td>
        <td><strong class="text-spent">${formatINR(stats.totalSpent)}</strong></td>
        <td style="color: ${stats.remaining < 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'}">
          ${formatINR(stats.remaining)}
        </td>
        <td><strong>${stats.pctUsed.toFixed(0)}%</strong></td>
        <td>${statusBadge}</td>
      </tr>
    `;
  }).join('');
}

// ============================================================================
// 10. VIEW 4: CATEGORY MANAGEMENT
// ============================================================================

function renderCategoriesView() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;

  // Calculate stats per category across all transactions
  const catStats = {};
  state.categories.forEach(c => {
    catStats[c.name] = { total: 0, count: 0 };
  });

  state.transactions.forEach(tx => {
    const name = tx.category || 'Other';
    if (!catStats[name]) {
      catStats[name] = { total: 0, count: 0 };
    }
    catStats[name].total += Number(tx.amount) || 0;
    catStats[name].count += 1;
  });

  grid.innerHTML = state.categories.map(cat => {
    const s = catStats[cat.name] || { total: 0, count: 0 };
    const isDefault = DEFAULT_CATEGORIES.some(dc => dc.id === cat.id);

    return `
      <div class="category-card">
        <div class="category-card-top">
          <div class="category-badge-group">
            <div class="cat-icon-avatar" style="background-color: ${cat.color};">
              <i data-lucide="${cat.icon || 'tag'}"></i>
            </div>
            <div>
              <div class="category-name">${escapeHTML(cat.name)}</div>
              <div class="category-count">${s.count} transactions</div>
            </div>
          </div>
          <div class="cat-card-actions">
            <button class="icon-btn" onclick="openCategoryModal('${cat.id}')" title="Edit Category">
              <i data-lucide="edit-2"></i>
            </button>
            <button class="icon-btn text-danger" onclick="promptDeleteCategory('${cat.id}')" title="Delete Category">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </div>

        <div class="category-card-bottom">
          <div>
            <span class="cat-total-label">Total Spent</span>
            <span class="cat-total-spent">${formatINR(s.total)}</span>
          </div>
          <span class="badge ${s.count > 0 ? 'badge-neutral' : ''}">
            ${isDefault ? 'Default' : 'Custom'}
          </span>
        </div>
      </div>
    `;
  }).join('');

  refreshIcons();
}

/**
 * Initialize Color Swatches & Icon Choices for Category Modal
 */
function initCategoryModalPickers() {
  const colorContainer = document.getElementById('categoryColorPalette');
  const iconContainer = document.getElementById('categoryIconPalette');

  if (colorContainer) {
    colorContainer.innerHTML = PRESET_COLORS.map((color, idx) => `
      <div class="color-swatch ${idx === 0 ? 'active' : ''}" 
           style="background-color: ${color};" 
           data-color="${color}"></div>
    `).join('');

    colorContainer.addEventListener('click', e => {
      const swatch = e.target.closest('.color-swatch');
      if (!swatch) return;
      colorContainer.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      document.getElementById('categorySelectedColor').value = swatch.dataset.color;
    });
  }

  if (iconContainer) {
    iconContainer.innerHTML = PRESET_ICONS.map((icon, idx) => `
      <button type="button" class="icon-choice-btn ${idx === 0 ? 'active' : ''}" data-icon="${icon}">
        <i data-lucide="${icon}"></i>
      </button>
    `).join('');

    iconContainer.addEventListener('click', e => {
      const btn = e.target.closest('.icon-choice-btn');
      if (!btn) return;
      iconContainer.querySelectorAll('.icon-choice-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('categorySelectedIcon').value = btn.dataset.icon;
    });
  }
}

// ============================================================================
// 11. VIEW 5: REPORTS & ANALYTICS
// ============================================================================

function renderReportsView() {
  const { month, scope } = state.reports;
  
  // Filter dataset based on scope
  const dataset = (scope === 'all')
    ? state.transactions
    : state.transactions.filter(tx => tx.date.startsWith(month));

  const totalSpent = dataset.reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);
  const txCount = dataset.length;

  // 1. KPI Top Metrics
  const metricTotal = document.getElementById('reportMetricTotal');
  const metricDailyAvg = document.getElementById('reportMetricDailyAvg');
  const metricTopCat = document.getElementById('reportMetricTopCat');
  const metricTopPayment = document.getElementById('reportMetricTopPayment');

  if (metricTotal) metricTotal.textContent = formatINR(totalSpent);

  // Group by category & payment method
  const catTotals = {};
  const paymentTotals = {};

  dataset.forEach(tx => {
    const c = tx.category || 'Other';
    const p = tx.paymentMethod || 'UPI';
    catTotals[c] = (catTotals[c] || 0) + Number(tx.amount);
    paymentTotals[p] = (paymentTotals[p] || 0) + Number(tx.amount);
  });

  // Top Category
  const topCatEntry = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  if (metricTopCat) {
    metricTopCat.textContent = topCatEntry ? `${topCatEntry[0]} (${formatINR(topCatEntry[1])})` : 'None';
  }

  // Top Payment Method
  const topPaymentEntry = Object.entries(paymentTotals).sort((a, b) => b[1] - a[1])[0];
  if (metricTopPayment) {
    metricTopPayment.textContent = topPaymentEntry ? `${topPaymentEntry[0]}` : 'None';
  }

  // Daily Average
  if (metricDailyAvg) {
    if (scope === 'all') {
      const daysSpan = Math.max(1, (new Date() - new Date(dataset[dataset.length - 1]?.date || new Date())) / (1000 * 3600 * 24));
      metricDailyAvg.textContent = formatINR(totalSpent / Math.max(1, Math.round(daysSpan)));
    } else {
      const [y, m] = month.split('-').map(Number);
      const totalDays = new Date(y, m, 0).getDate();
      metricDailyAvg.textContent = formatINR(totalSpent / totalDays);
    }
  }

  // 2. Render Charts
  renderReportsCharts(dataset, month, scope);

  // 3. Render Detailed Category Breakdown Table
  renderReportsCategoryTable(dataset, totalSpent);
}

/**
 * Render Reports 4-Chart Grid
 */
function renderReportsCharts(dataset, month, scope) {
  // Chart 1: Daily Timeline (Bar)
  const dailyCanvas = document.getElementById('reportDailyBarChart');
  const dailyEmpty = document.getElementById('reportDailyEmpty');
  if (dailyCanvas) {
    if (chartInstances.reportDaily) chartInstances.reportDaily.destroy();

    if (dataset.length === 0) {
      dailyCanvas.style.display = 'none';
      if (dailyEmpty) dailyEmpty.style.display = 'flex';
    } else {
      dailyCanvas.style.display = 'block';
      if (dailyEmpty) dailyEmpty.style.display = 'none';

      // Group by date
      const dateMap = {};
      dataset.forEach(tx => {
        dateMap[tx.date] = (dateMap[tx.date] || 0) + Number(tx.amount);
      });

      const sortedDates = Object.keys(dateMap).sort();
      const labels = sortedDates.map(d => formatDateIN(d));
      const values = sortedDates.map(d => dateMap[d]);

      chartInstances.reportDaily = new Chart(dailyCanvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Daily Spending (₹)',
            data: values,
            backgroundColor: 'rgba(6, 182, 212, 0.75)',
            hoverBackgroundColor: '#06b6d4',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              ticks: {
                color: state.settings.theme === 'dark' ? '#64748b' : '#94a3b8',
                maxTicksLimit: 12,
                font: { size: 10 }
              }
            },
            y: {
              grid: { color: state.settings.theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0' },
              ticks: {
                color: state.settings.theme === 'dark' ? '#64748b' : '#94a3b8',
                callback: v => formatINR(v, 0),
                font: { size: 10 }
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` Spent: ${formatINR(ctx.parsed.y)}`
              }
            }
          }
        }
      });
    }
  }

  // Chart 2: Category Doughnut
  const catCanvas = document.getElementById('reportCategoryDoughnutChart');
  const catEmpty = document.getElementById('reportCategoryEmpty');
  if (catCanvas) {
    if (chartInstances.reportCategory) chartInstances.reportCategory.destroy();

    const catTotals = {};
    dataset.forEach(tx => {
      const c = tx.category || 'Other';
      catTotals[c] = (catTotals[c] || 0) + Number(tx.amount);
    });

    const labels = Object.keys(catTotals);
    const values = Object.values(catTotals);

    if (labels.length === 0) {
      catCanvas.style.display = 'none';
      if (catEmpty) catEmpty.style.display = 'flex';
    } else {
      catCanvas.style.display = 'block';
      if (catEmpty) catEmpty.style.display = 'none';

      const colors = labels.map(label => getCategoryInfo(label).color);

      chartInstances.reportCategory = new Chart(catCanvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: state.settings.theme === 'dark' ? '#121a2e' : '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: state.settings.theme === 'dark' ? '#94a3b8' : '#475569',
                boxWidth: 10,
                font: { size: 10 },
                padding: 10
              }
            },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const sum = values.reduce((a, b) => a + b, 0);
                  const pct = sum > 0 ? ((ctx.parsed / sum) * 100).toFixed(1) : 0;
                  return ` ${ctx.label}: ${formatINR(ctx.parsed)} (${pct}%)`;
                }
              }
            }
          },
          cutout: '65%'
        }
      });
    }
  }

  // Chart 3: Payment Method Distribution
  const paymentCanvas = document.getElementById('reportPaymentMethodChart');
  const paymentEmpty = document.getElementById('reportPaymentEmpty');
  if (paymentCanvas) {
    if (chartInstances.reportPayment) chartInstances.reportPayment.destroy();

    const paymentTotals = {};
    dataset.forEach(tx => {
      const p = tx.paymentMethod || 'UPI';
      paymentTotals[p] = (paymentTotals[p] || 0) + Number(tx.amount);
    });

    const labels = Object.keys(paymentTotals);
    const values = Object.values(paymentTotals);

    if (labels.length === 0) {
      paymentCanvas.style.display = 'none';
      if (paymentEmpty) paymentEmpty.style.display = 'flex';
    } else {
      paymentCanvas.style.display = 'block';
      if (paymentEmpty) paymentEmpty.style.display = 'none';

      chartInstances.reportPayment = new Chart(paymentCanvas, {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Amount (₹)',
            data: values,
            backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#64748b'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: state.settings.theme === 'dark' ? '#64748b' : '#94a3b8', font: { size: 11 } }
            },
            y: {
              grid: { color: state.settings.theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0' },
              ticks: {
                color: state.settings.theme === 'dark' ? '#64748b' : '#94a3b8',
                callback: v => formatINR(v, 0),
                font: { size: 10 }
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` Total: ${formatINR(ctx.parsed.y)}`
              }
            }
          }
        }
      });
    }
  }

  // Chart 4: Multi-Month Historical Spending Trend
  const historyCanvas = document.getElementById('reportHistoricalTrendChart');
  const historyEmpty = document.getElementById('reportHistoryEmpty');
  if (historyCanvas) {
    if (chartInstances.reportHistorical) chartInstances.reportHistorical.destroy();

    // Group all transactions by month
    const monthlyMap = {};
    state.transactions.forEach(tx => {
      if (tx.date && tx.date.length >= 7) {
        const ym = tx.date.substring(0, 7);
        monthlyMap[ym] = (monthlyMap[ym] || 0) + Number(tx.amount);
      }
    });

    const sortedMonths = Object.keys(monthlyMap).sort();

    if (sortedMonths.length === 0) {
      historyCanvas.style.display = 'none';
      if (historyEmpty) historyEmpty.style.display = 'flex';
    } else {
      historyCanvas.style.display = 'block';
      if (historyEmpty) historyEmpty.style.display = 'none';

      const labels = sortedMonths.map(ym => getMonthName(ym));
      const data = sortedMonths.map(ym => monthlyMap[ym]);

      chartInstances.reportHistorical = new Chart(historyCanvas, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Total Spent (₹)',
            data,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            borderWidth: 3,
            pointBackgroundColor: '#10b981',
            pointRadius: 5,
            fill: true,
            tension: 0.3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: state.settings.theme === 'dark' ? '#64748b' : '#94a3b8', font: { size: 11 } }
            },
            y: {
              grid: { color: state.settings.theme === 'dark' ? 'rgba(255, 255, 255, 0.05)' : '#e2e8f0' },
              ticks: {
                color: state.settings.theme === 'dark' ? '#64748b' : '#94a3b8',
                callback: v => formatINR(v, 0),
                font: { size: 10 }
              }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => ` Spent: ${formatINR(ctx.parsed.y)}`
              }
            }
          }
        }
      });
    }
  }
}

/**
 * Detailed Category Table in Reports
 */
function renderReportsCategoryTable(dataset, totalSpent) {
  const tbody = document.getElementById('reportCategoryTableBody');
  if (!tbody) return;

  const catTotals = {};
  const catCounts = {};

  dataset.forEach(tx => {
    const c = tx.category || 'Other';
    catTotals[c] = (catTotals[c] || 0) + Number(tx.amount);
    catCounts[c] = (catCounts[c] || 0) + 1;
  });

  const sorted = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);

  if (sorted.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center" style="padding: 24px; color: var(--text-dim);">
          No transactions to display for this report selection.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = sorted.map(catName => {
    const cat = getCategoryInfo(catName);
    const amount = catTotals[catName];
    const count = catCounts[catName];
    const pct = totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : '0';

    return `
      <tr>
        <td>
          <div class="tx-title-cell">
            <div class="tx-cat-icon" style="background-color: ${cat.color}20; color: ${cat.color}">
              <i data-lucide="${cat.icon}"></i>
            </div>
            <span class="tx-title-main">${escapeHTML(cat.name)}</span>
          </div>
        </td>
        <td>${count} entries</td>
        <td class="text-right"><strong>${formatINR(amount)}</strong></td>
        <td class="text-right">${pct}%</td>
      </tr>
    `;
  }).join('');

  refreshIcons();
}

// ============================================================================
// 12. VIEW 6: SETTINGS
// ============================================================================

function renderSettingsView() {
  const nameInput = document.getElementById('settingsUserName');
  const budgetInput = document.getElementById('settingsDefaultBudget');
  const decimalsToggle = document.getElementById('settingsShowDecimals');

  if (nameInput) nameInput.value = state.settings.userName;
  if (budgetInput) budgetInput.value = state.settings.defaultBudget;
  if (decimalsToggle) decimalsToggle.checked = state.settings.showDecimals;

  // Active theme button highlight
  const darkBtn = document.getElementById('themeDarkBtn');
  const lightBtn = document.getElementById('themeLightBtn');

  if (darkBtn && lightBtn) {
    if (state.settings.theme === 'dark') {
      darkBtn.classList.add('active');
      lightBtn.classList.remove('active');
    } else {
      darkBtn.classList.remove('active');
      lightBtn.classList.add('active');
    }
  }
}

// ============================================================================
// 13. GLOBAL VIEW SWITCHING & ROUTING
// ============================================================================

function navigateTo(viewName) {
  state.activeView = viewName;

  // 1. Update navigation items active state
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });

  // 2. Hide all view panels and display target view
  document.querySelectorAll('.view-panel').forEach(panel => {
    panel.classList.remove('active');
  });

  const target = document.getElementById(`view-${viewName}`);
  if (target) {
    target.classList.add('active');
  }

  // 3. Update topbar title & subtitle
  const titleEl = document.getElementById('pageTitle');
  const subtitleEl = document.getElementById('pageSubtitle');

  const titles = {
    dashboard: { title: 'Dashboard', sub: 'Overview of your expenses & monthly budgets' },
    transactions: { title: 'Transactions', sub: 'Filter, search, sort and manage all expenses' },
    budgets: { title: 'Budgets', sub: 'Monthly spending targets, progress meter & threshold alerts' },
    categories: { title: 'Categories', sub: 'Manage expense categories, custom colors & icons' },
    reports: { title: 'Reports & Analytics', sub: 'Visual spending trends and financial breakdowns' },
    settings: { title: 'Settings', sub: 'Personal preferences, theme & offline LocalStorage data' }
  };

  if (titleEl && subtitleEl && titles[viewName]) {
    titleEl.textContent = titles[viewName].title;
    subtitleEl.textContent = titles[viewName].sub;
  }

  // 4. Render corresponding view data
  switch (viewName) {
    case 'dashboard':
      renderDashboard();
      break;
    case 'transactions':
      renderTransactionsView();
      break;
    case 'budgets':
      renderBudgetsView();
      break;
    case 'categories':
      renderCategoriesView();
      break;
    case 'reports':
      renderReportsView();
      break;
    case 'settings':
      renderSettingsView();
      break;
  }

  // Close mobile sidebar if open
  closeMobileSidebar();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function openMobileSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebarBackdrop')?.classList.add('open');
}

function closeMobileSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebarBackdrop')?.classList.remove('open');
}

function toggleTheme(targetTheme) {
  const newTheme = targetTheme || (state.settings.theme === 'dark' ? 'light' : 'dark');
  state.settings.theme = newTheme;
  document.documentElement.setAttribute('data-theme', newTheme);
  saveSettings();

  // Re-render active view to update chart themes
  navigateTo(state.activeView);
  showToast(`Switched to ${newTheme === 'dark' ? 'Dark Navy' : 'Light Slate'} theme`, 'success', 2000);
}

// ============================================================================
// 14. EXPENSE MODAL & CRUD
// ============================================================================

function openExpenseModal(expenseId = null) {
  const modal = document.getElementById('expenseModal');
  const titleEl = document.getElementById('expenseModalTitle');
  const form = document.getElementById('expenseForm');
  const amountErr = document.getElementById('expenseAmountError');
  const titleErr = document.getElementById('expenseTitleError');

  if (!modal || !form) return;

  // Clear errors
  amountErr?.classList.remove('visible');
  titleErr?.classList.remove('visible');
  form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

  state.editingTransactionId = expenseId;

  if (expenseId) {
    // Edit Mode
    const tx = state.transactions.find(t => t.id === expenseId);
    if (!tx) return;

    if (titleEl) titleEl.textContent = 'Edit Expense';
    document.getElementById('expenseId').value = tx.id;
    document.getElementById('expenseAmount').value = tx.amount;
    document.getElementById('expenseTitle').value = tx.title;
    document.getElementById('expenseCategory').value = tx.category;
    document.getElementById('expenseDate').value = tx.date;
    document.getElementById('expensePaymentMethod').value = tx.paymentMethod || 'UPI';
    document.getElementById('expenseNotes').value = tx.notes || '';
  } else {
    // New Expense Mode
    if (titleEl) titleEl.textContent = 'Add New Expense';
    form.reset();
    document.getElementById('expenseId').value = '';
    
    // Default to today's date
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    document.getElementById('expenseDate').value = `${y}-${m}-${d}`;
  }

  modal.classList.add('open');
  refreshIcons();
}

function closeExpenseModal() {
  document.getElementById('expenseModal')?.classList.remove('open');
  state.editingTransactionId = null;
}

function handleExpenseFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('expenseId').value.trim();
  const amountInput = document.getElementById('expenseAmount');
  const titleInput = document.getElementById('expenseTitle');
  const categoryInput = document.getElementById('expenseCategory');
  const dateInput = document.getElementById('expenseDate');
  const paymentInput = document.getElementById('expensePaymentMethod');
  const notesInput = document.getElementById('expenseNotes');

  const amountVal = parseFloat(amountInput.value);
  const titleVal = titleInput.value.trim();
  const catVal = categoryInput.value.trim();
  const dateVal = dateInput.value.trim();
  const paymentVal = paymentInput.value.trim();
  const notesVal = notesInput.value.trim();

  let hasError = false;

  // Validation
  if (isNaN(amountVal) || amountVal <= 0) {
    amountInput.classList.add('is-invalid');
    document.getElementById('expenseAmountError')?.classList.add('visible');
    hasError = true;
  } else {
    amountInput.classList.remove('is-invalid');
    document.getElementById('expenseAmountError')?.classList.remove('visible');
  }

  if (!titleVal) {
    titleInput.classList.add('is-invalid');
    document.getElementById('expenseTitleError')?.classList.add('visible');
    hasError = true;
  } else {
    titleInput.classList.remove('is-invalid');
    document.getElementById('expenseTitleError')?.classList.remove('visible');
  }

  if (!dateVal) {
    dateInput.classList.add('is-invalid');
    hasError = true;
  } else {
    dateInput.classList.remove('is-invalid');
  }

  if (hasError) return;

  if (id) {
    // Update existing transaction
    const index = state.transactions.findIndex(t => t.id === id);
    if (index !== -1) {
      state.transactions[index] = {
        ...state.transactions[index],
        title: titleVal,
        amount: amountVal,
        category: catVal,
        date: dateVal,
        paymentMethod: paymentVal,
        notes: notesVal
      };
      saveTransactions();
      showToast(`Expense "${titleVal}" updated successfully!`, 'success');
    }
  } else {
    // Create new transaction
    const newTx = {
      id: 'tx-' + Date.now(),
      title: titleVal,
      amount: amountVal,
      category: catVal,
      date: dateVal,
      paymentMethod: paymentVal,
      notes: notesVal,
      createdAt: Date.now()
    };
    state.transactions.unshift(newTx);
    saveTransactions();
    showToast(`Added expense of ${formatINR(amountVal)} for "${titleVal}"`, 'success');
  }

  closeExpenseModal();
  populateMonthSelectors();
  navigateTo(state.activeView);
}

function promptDeleteTransaction(txId) {
  const tx = state.transactions.find(t => t.id === txId);
  if (!tx) return;

  openConfirmModal({
    title: 'Delete Expense?',
    message: `Are you sure you want to delete "${escapeHTML(tx.title)}" for ${formatINR(tx.amount)}? This action cannot be undone.`,
    confirmText: 'Delete',
    onConfirm: () => {
      state.transactions = state.transactions.filter(t => t.id !== txId);
      saveTransactions();
      showToast('Expense deleted successfully', 'success');
      populateMonthSelectors();
      navigateTo(state.activeView);
    }
  });
}

// ============================================================================
// 15. CATEGORY MODAL & CRUD
// ============================================================================

function openCategoryModal(categoryId = null) {
  const modal = document.getElementById('categoryModal');
  const titleEl = document.getElementById('categoryModalTitle');
  const form = document.getElementById('categoryForm');
  if (!modal || !form) return;

  state.editingCategoryId = categoryId;
  document.getElementById('categoryNameError')?.classList.remove('visible');

  if (categoryId) {
    const cat = state.categories.find(c => c.id === categoryId);
    if (!cat) return;

    if (titleEl) titleEl.textContent = 'Edit Category';
    document.getElementById('categoryId').value = cat.id;
    document.getElementById('categoryNameInput').value = cat.name;
    document.getElementById('categorySelectedColor').value = cat.color;
    document.getElementById('categorySelectedIcon').value = cat.icon;

    // Highlight swatches
    document.querySelectorAll('#categoryColorPalette .color-swatch').forEach(s => {
      s.classList.toggle('active', s.dataset.color.toLowerCase() === cat.color.toLowerCase());
    });
    document.querySelectorAll('#categoryIconPalette .icon-choice-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.icon === cat.icon);
    });
  } else {
    if (titleEl) titleEl.textContent = 'Add New Category';
    form.reset();
    document.getElementById('categoryId').value = '';
    document.getElementById('categorySelectedColor').value = PRESET_COLORS[0];
    document.getElementById('categorySelectedIcon').value = PRESET_ICONS[0];

    document.querySelectorAll('#categoryColorPalette .color-swatch').forEach((s, i) => {
      s.classList.toggle('active', i === 0);
    });
    document.querySelectorAll('#categoryIconPalette .icon-choice-btn').forEach((b, i) => {
      b.classList.toggle('active', i === 0);
    });
  }

  modal.classList.add('open');
  refreshIcons();
}

function closeCategoryModal() {
  document.getElementById('categoryModal')?.classList.remove('open');
  state.editingCategoryId = null;
}

function handleCategoryFormSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('categoryId').value.trim();
  const nameInput = document.getElementById('categoryNameInput');
  const nameVal = nameInput.value.trim();
  const colorVal = document.getElementById('categorySelectedColor').value;
  const iconVal = document.getElementById('categorySelectedIcon').value;

  if (!nameVal) {
    nameInput.classList.add('is-invalid');
    document.getElementById('categoryNameError')?.classList.add('visible');
    return;
  }

  // Check unique name
  const duplicate = state.categories.find(c => c.name.toLowerCase() === nameVal.toLowerCase() && c.id !== id);
  if (duplicate) {
    nameInput.classList.add('is-invalid');
    const err = document.getElementById('categoryNameError');
    if (err) {
      err.textContent = 'A category with this name already exists.';
      err.classList.add('visible');
    }
    return;
  }

  if (id) {
    const idx = state.categories.findIndex(c => c.id === id);
    if (idx !== -1) {
      const oldName = state.categories[idx].name;
      state.categories[idx] = { ...state.categories[idx], name: nameVal, color: colorVal, icon: iconVal };
      
      // Update existing transactions if category renamed
      if (oldName !== nameVal) {
        state.transactions.forEach(t => {
          if (t.category === oldName) t.category = nameVal;
        });
        saveTransactions();
      }

      saveCategories();
      showToast(`Category "${nameVal}" updated`, 'success');
    }
  } else {
    const newCat = {
      id: 'cat-' + Date.now(),
      name: nameVal,
      color: colorVal,
      icon: iconVal,
      isCustom: true
    };
    state.categories.push(newCat);
    saveCategories();
    showToast(`Added new category "${nameVal}"`, 'success');
  }

  closeCategoryModal();
  populateCategorySelectors();
  renderCategoriesView();
}

function promptDeleteCategory(catId) {
  const cat = state.categories.find(c => c.id === catId);
  if (!cat) return;

  const usedCount = state.transactions.filter(t => t.category === cat.name).length;

  if (usedCount > 0) {
    // Requires safe reassignment
    state.pendingDeleteCategoryId = catId;
    const modal = document.getElementById('reassignCategoryModal');
    const msg = document.getElementById('reassignPromptMessage');
    const select = document.getElementById('reassignTargetCategory');

    if (msg) {
      msg.innerHTML = `Category <strong>"${escapeHTML(cat.name)}"</strong> is currently used in <strong>${usedCount}</strong> expense transaction(s). Please choose a replacement category before deleting.`;
    }

    if (select) {
      select.innerHTML = state.categories
        .filter(c => c.id !== catId)
        .map(c => `<option value="${escapeHTML(c.name)}">${escapeHTML(c.name)}</option>`)
        .join('');
    }

    modal?.classList.add('open');
    refreshIcons();
  } else {
    // Safe to delete directly
    openConfirmModal({
      title: 'Delete Category?',
      message: `Delete "${escapeHTML(cat.name)}"? No transactions are currently using it.`,
      confirmText: 'Delete Category',
      onConfirm: () => {
        state.categories = state.categories.filter(c => c.id !== catId);
        saveCategories();
        showToast('Category deleted successfully', 'success');
        populateCategorySelectors();
        renderCategoriesView();
      }
    });
  }
}

function handleCategoryReassignConfirm() {
  const catId = state.pendingDeleteCategoryId;
  const targetName = document.getElementById('reassignTargetCategory')?.value;
  if (!catId || !targetName) return;

  const cat = state.categories.find(c => c.id === catId);
  if (!cat) return;

  // Reassign transactions
  let reassignedCount = 0;
  state.transactions.forEach(t => {
    if (t.category === cat.name) {
      t.category = targetName;
      reassignedCount++;
    }
  });

  // Delete category
  state.categories = state.categories.filter(c => c.id !== catId);

  saveTransactions();
  saveCategories();

  document.getElementById('reassignCategoryModal')?.classList.remove('open');
  state.pendingDeleteCategoryId = null;

  showToast(`Reassigned ${reassignedCount} expense(s) to "${targetName}" and deleted "${cat.name}"`, 'success');
  populateCategorySelectors();
  renderCategoriesView();
}

// ============================================================================
// 16. CSV EXPORT ENGINE (COMPLIANT WITH INDIAN RUPEE HEADERS)
// ============================================================================

function exportTransactionsCSV(customList = null, filenameSuffix = '') {
  const txList = customList || state.transactions;

  if (txList.length === 0) {
    showToast('No transactions to export', 'warning');
    return;
  }

  // Proper CSV headers
  const headers = ['ID', 'Title', 'Amount (Numeric)', 'Currency', 'Category', 'Date', 'Payment Method', 'Notes'];

  const rows = txList.map(tx => {
    return [
      `"${escapeCSV(tx.id)}"`,
      `"${escapeCSV(tx.title)}"`,
      Number(tx.amount).toFixed(2),
      '"INR"',
      `"${escapeCSV(tx.category)}"`,
      `"${escapeCSV(tx.date)}"`,
      `"${escapeCSV(tx.paymentMethod || 'UPI')}"`,
      `"${escapeCSV(tx.notes || '')}"`
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const ym = filenameSuffix || state.currentMonth;
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `rupeeflow-transactions-${ym}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`Exported ${txList.length} transactions to CSV`, 'success');
}

function escapeCSV(text) {
  if (text === null || text === undefined) return '';
  return String(text).replace(/"/g, '""');
}

// ============================================================================
// 17. BACKUP & RESTORE JSON ENGINE
// ============================================================================

function exportJSONBackup() {
  const backupData = {
    appName: 'RupeeFlow',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    settings: state.settings,
    budgets: state.budgets,
    categories: state.categories,
    transactions: state.transactions
  };

  const str = JSON.stringify(backupData, null, 2);
  const blob = new Blob([str], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `rupeeflow-backup-${getCurrentYearMonth()}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast('Downloaded full RupeeFlow JSON backup', 'success');
}

function importJSONBackup(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.transactions || !Array.isArray(data.transactions)) {
        throw new Error('Invalid backup file structure.');
      }

      state.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
      state.budgets = data.budgets || {};
      state.categories = data.categories || [...DEFAULT_CATEGORIES];
      state.transactions = data.transactions || [];

      saveSettings();
      saveBudgets();
      saveCategories();
      saveTransactions();

      populateMonthSelectors();
      populateCategorySelectors();
      navigateTo(state.activeView);
      showToast('Data restored successfully from backup!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to import backup: invalid JSON format', 'error');
    }
  };
  reader.readAsText(file);
}

// ============================================================================
// 18. CONFIRMATION MODAL HELPER
// ============================================================================

let currentConfirmCallback = null;

function openConfirmModal({ title, message, confirmText = 'Confirm', onConfirm }) {
  const modal = document.getElementById('confirmModal');
  const titleEl = document.getElementById('confirmModalTitle');
  const msgEl = document.getElementById('confirmModalMessage');
  const actionBtn = document.getElementById('confirmModalActionBtn');

  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.innerHTML = message;
  if (actionBtn) actionBtn.textContent = confirmText;

  currentConfirmCallback = onConfirm;
  modal?.classList.add('open');
  refreshIcons();
}

function closeConfirmModal() {
  document.getElementById('confirmModal')?.classList.remove('open');
  currentConfirmCallback = null;
}

// ============================================================================
// 19. EVENT LISTENERS INITIALIZATION
// ============================================================================

function setupEventListeners() {
  // 1. Navigation View Switchers
  document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view) navigateTo(view);
    });
  });

  // Mobile menu toggle
  document.getElementById('mobileMenuBtn')?.addEventListener('click', openMobileSidebar);
  document.getElementById('sidebarCloseBtn')?.addEventListener('click', closeMobileSidebar);
  document.getElementById('sidebarBackdrop')?.addEventListener('click', closeMobileSidebar);

  // Quick Global Month Selector
  document.getElementById('globalMonthSelector')?.addEventListener('change', e => {
    state.currentMonth = e.target.value;
    navigateTo(state.activeView);
  });

  // Theme Toggle Button in Topbar
  document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
    toggleTheme();
  });

  // Add Expense Buttons across screens
  const addButtons = [
    'quickAddExpenseBtn', 'topbarAddBtn', 'dashboardAddBtn',
    'emptyStateAddBtn', 'txAddNewBtn', 'txEmptyAddBtn'
  ];
  addButtons.forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => openExpenseModal());
  });

  // Expense Modal Form
  document.getElementById('expenseForm')?.addEventListener('submit', handleExpenseFormSubmit);
  document.getElementById('expenseModalCloseBtn')?.addEventListener('click', closeExpenseModal);
  document.getElementById('expenseModalCancelBtn')?.addEventListener('click', closeExpenseModal);

  // Category Modal Form
  document.getElementById('btnAddNewCategory')?.addEventListener('click', () => openCategoryModal());
  document.getElementById('categoryForm')?.addEventListener('submit', handleCategoryFormSubmit);
  document.getElementById('categoryModalCloseBtn')?.addEventListener('click', closeCategoryModal);
  document.getElementById('categoryModalCancelBtn')?.addEventListener('click', closeCategoryModal);

  // Reassign Category Modal
  document.getElementById('reassignModalCloseBtn')?.addEventListener('click', () => {
    document.getElementById('reassignCategoryModal')?.classList.remove('open');
  });
  document.getElementById('reassignModalCancelBtn')?.addEventListener('click', () => {
    document.getElementById('reassignCategoryModal')?.classList.remove('open');
  });
  document.getElementById('reassignModalConfirmBtn')?.addEventListener('click', handleCategoryReassignConfirm);

  // Confirmation Modal
  document.getElementById('confirmModalCloseBtn')?.addEventListener('click', closeConfirmModal);
  document.getElementById('confirmModalCancelBtn')?.addEventListener('click', closeConfirmModal);
  document.getElementById('confirmModalActionBtn')?.addEventListener('click', () => {
    if (typeof currentConfirmCallback === 'function') {
      currentConfirmCallback();
    }
    closeConfirmModal();
  });

  // Close modals on clicking backdrop
  document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', e => {
      if (e.target === modal) {
        modal.classList.remove('open');
      }
    });
  });

  // Keyboard Escape to close modals
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
      closeMobileSidebar();
    }
  });

  // 2. Dashboard Shortcuts
  document.getElementById('btnGoToCategories')?.addEventListener('click', () => navigateTo('categories'));
  document.getElementById('btnGoToReports')?.addEventListener('click', () => navigateTo('reports'));
  document.getElementById('btnViewAllTransactions')?.addEventListener('click', () => navigateTo('transactions'));
  document.getElementById('dashboardExportBtn')?.addEventListener('click', () => {
    const stats = getMonthStats(state.currentMonth);
    exportTransactionsCSV(stats.transactions, state.currentMonth);
  });

  // 3. Transactions Filter & Search Controls
  const searchInput = document.getElementById('txSearchInput');
  const clearSearchBtn = document.getElementById('txClearSearch');

  searchInput?.addEventListener('input', e => {
    state.txFilter.search = e.target.value;
    state.txFilter.page = 1;
    if (clearSearchBtn) {
      clearSearchBtn.style.display = e.target.value ? 'block' : 'none';
    }
    renderTransactionsView();
  });

  clearSearchBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    state.txFilter.search = '';
    state.txFilter.page = 1;
    clearSearchBtn.style.display = 'none';
    renderTransactionsView();
  });

  document.getElementById('txFilterMonth')?.addEventListener('change', e => {
    state.txFilter.month = e.target.value;
    state.txFilter.page = 1;
    renderTransactionsView();
  });

  document.getElementById('txFilterCategory')?.addEventListener('change', e => {
    state.txFilter.category = e.target.value;
    state.txFilter.page = 1;
    renderTransactionsView();
  });

  document.getElementById('txFilterPayment')?.addEventListener('change', e => {
    state.txFilter.payment = e.target.value;
    state.txFilter.page = 1;
    renderTransactionsView();
  });

  document.getElementById('txSortOrder')?.addEventListener('change', e => {
    state.txFilter.sort = e.target.value;
    renderTransactionsView();
  });

  document.getElementById('txResetFiltersBtn')?.addEventListener('click', () => {
    state.txFilter.search = '';
    state.txFilter.month = 'ALL';
    state.txFilter.category = 'ALL';
    state.txFilter.payment = 'ALL';
    state.txFilter.sort = 'date-desc';
    state.txFilter.page = 1;

    if (searchInput) searchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.style.display = 'none';
    document.getElementById('txFilterMonth').value = 'ALL';
    document.getElementById('txFilterCategory').value = 'ALL';
    document.getElementById('txFilterPayment').value = 'ALL';
    document.getElementById('txSortOrder').value = 'date-desc';

    renderTransactionsView();
    showToast('Filters reset', 'success', 1500);
  });

  // Pagination Controls
  document.getElementById('txPrevPageBtn')?.addEventListener('click', () => {
    if (state.txFilter.page > 1) {
      state.txFilter.page--;
      renderTransactionsView();
    }
  });

  document.getElementById('txNextPageBtn')?.addEventListener('click', () => {
    state.txFilter.page++;
    renderTransactionsView();
  });

  // Transactions View CSV Export
  document.getElementById('txExportBtn')?.addEventListener('click', () => {
    exportTransactionsCSV(null, state.txFilter.month === 'ALL' ? 'all' : state.txFilter.month);
  });

  // 4. Budgets View Actions
  document.getElementById('budgetMonthPicker')?.addEventListener('change', () => {
    renderBudgetsView();
  });

  document.getElementById('btnSaveBudget')?.addEventListener('click', () => {
    const picker = document.getElementById('budgetMonthPicker');
    const input = document.getElementById('budgetInputAmount');
    const targetMonth = picker?.value || state.currentMonth;
    const amount = parseFloat(input?.value);

    if (isNaN(amount) || amount < 0) {
      showToast('Please enter a valid positive budget amount', 'error');
      return;
    }

    state.budgets[targetMonth] = amount;
    saveBudgets();
    renderBudgetsView();
    renderDashboard();
    showToast(`Monthly budget for ${getMonthName(targetMonth)} set to ${formatINR(amount)}`, 'success');
  });

  // 5. Reports View Actions
  document.getElementById('reportsMonthSelect')?.addEventListener('change', e => {
    state.reports.month = e.target.value;
    renderReportsView();
  });

  document.getElementById('reportsScopeGroup')?.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    document.querySelectorAll('#reportsScopeGroup button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.reports.scope = btn.dataset.scope;
    renderReportsView();
  });

  document.getElementById('reportsExportBtn')?.addEventListener('click', () => {
    const { month, scope } = state.reports;
    const dataset = (scope === 'all')
      ? state.transactions
      : state.transactions.filter(tx => tx.date.startsWith(month));
    exportTransactionsCSV(dataset, scope === 'all' ? 'all-reports' : month);
  });

  // 6. Settings Actions
  document.getElementById('btnSavePreferences')?.addEventListener('click', () => {
    const nameInput = document.getElementById('settingsUserName');
    const budgetInput = document.getElementById('settingsDefaultBudget');
    const decimalsToggle = document.getElementById('settingsShowDecimals');

    if (nameInput) state.settings.userName = nameInput.value.trim() || 'Rahul Sharma';
    if (budgetInput) {
      const b = parseFloat(budgetInput.value);
      if (!isNaN(b) && b >= 0) state.settings.defaultBudget = b;
    }
    if (decimalsToggle) state.settings.showDecimals = decimalsToggle.checked;

    saveSettings();
    renderSidebarBudget();
    renderDashboard();
    showToast('Preferences saved successfully!', 'success');
  });

  document.getElementById('themeDarkBtn')?.addEventListener('click', () => toggleTheme('dark'));
  document.getElementById('themeLightBtn')?.addEventListener('click', () => toggleTheme('light'));

  // Data Actions in Settings
  document.getElementById('btnExportJSON')?.addEventListener('click', exportJSONBackup);

  document.getElementById('btnImportJSON')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
      importJSONBackup(file);
      e.target.value = '';
    }
  });

  document.getElementById('btnResetDemoData')?.addEventListener('click', () => {
    openConfirmModal({
      title: 'Reset Demo Data?',
      message: 'This will restore realistic Indian sample expenses (Swiggy, Blinkit, Rent, Petrol, etc.) and reset your current month budget.',
      confirmText: 'Reset Demo Data',
      onConfirm: () => {
        const { sampleTransactions, sampleBudgets } = generateDemoData();
        state.transactions = sampleTransactions;
        state.budgets = sampleBudgets;
        state.categories = [...DEFAULT_CATEGORIES];
        saveTransactions();
        saveBudgets();
        saveCategories();

        populateMonthSelectors();
        populateCategorySelectors();
        navigateTo('dashboard');
        showToast('Sample Indian demo data has been restored!', 'success');
      }
    });
  });

  document.getElementById('btnClearAllData')?.addEventListener('click', () => {
    openConfirmModal({
      title: 'Erase All Data?',
      message: '🚨 <strong style="color:var(--accent-rose)">Warning:</strong> This will permanently erase ALL expenses, custom categories, and budgets stored in this browser.',
      confirmText: 'Erase Everything',
      onConfirm: () => {
        state.transactions = [];
        state.budgets = { [getCurrentYearMonth()]: state.settings.defaultBudget };
        state.categories = [...DEFAULT_CATEGORIES];
        saveTransactions();
        saveBudgets();
        saveCategories();

        populateMonthSelectors();
        populateCategorySelectors();
        navigateTo('dashboard');
        showToast('All transaction and budget data erased', 'warning');
      }
    });
  });

  // Window resize to handle mobile table/card toggle
  window.addEventListener('resize', () => {
    if (state.activeView === 'transactions') {
      const table = document.getElementById('txFullTable');
      const mobileContainer = document.getElementById('txMobileCardsContainer');
      if (table && mobileContainer) {
        if (window.innerWidth <= 768) {
          table.style.display = 'none';
          mobileContainer.style.display = 'flex';
        } else {
          table.style.display = 'table';
          mobileContainer.style.display = 'none';
        }
      }
    }
  });
}

// ============================================================================
// 20. APPLICATION BOOTSTRAP
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Load data from LocalStorage
  loadState();

  // 2. Set theme attribute on root
  document.documentElement.setAttribute('data-theme', state.settings.theme);

  // 3. Initialize color and icon swatches for modal
  initCategoryModalPickers();

  // 4. Setup all dynamic selectors
  populateMonthSelectors();
  populateCategorySelectors();

  // 5. Attach event handlers
  setupEventListeners();

  // 6. Navigate to initial dashboard view
  navigateTo('dashboard');

  // 7. Initial Lucide icons render
  refreshIcons();
});
