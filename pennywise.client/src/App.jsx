
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

import Auth from "./Auth";
import BudgetManager from "./BudgetManager";
import RecurringTransactions from "./RecurringTransactions";
import "./App.css";

const API_URL = "http://localhost:5010/api/Transactions";

const initialForm = {
  type: "Expense",
  amount: "",
  description: "",
  category: "Food",
  date: new Date().toISOString().slice(0, 10),
  notes: "",
};

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const formatDate = (date) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "—";

  return parsedDate.toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function App() {
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Transaction filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Login callback from Auth.jsx
  const handleLogin = (authToken, userEmail) => {
    setToken(authToken);
    setEmail(userEmail || "");
    setMessage("");
    setError("");
  };

  // Load transactions belonging to the authenticated user
  const loadTransactions = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setToken("");
          setEmail("");
          setTransactions([]);
          setError("Your session has expired. Please log in again.");
          return;
        }

        throw new Error("Unable to load transactions.");
      }

      const data = await response.json();
      setTransactions(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Something went wrong while loading transactions.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      loadTransactions();
    }
  }, [token, loadTransactions]);

  // Logout
  const handleLogout = () => {
    setToken("");
    setEmail("");
    setTransactions([]);
    setForm(initialForm);
    setEditingId(null);
    setMessage("");
    setError("");
  };

  // Form input handler
  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // Reset transaction form
  const resetForm = () => {
    setForm({
      ...initialForm,
      date: new Date().toISOString().slice(0, 10),
    });
    setEditingId(null);
  };

  // Create or update a transaction
  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.description.trim() || !form.category.trim()) {
      setError("Please enter a description and category.");
      return;
    }

    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }

    try {
      const payload = {
        type: form.type,
        amount: Number(form.amount),
        description: form.description.trim(),
        category: form.category.trim(),
        date: form.date,
        notes: form.notes.trim(),
      };

      const response = await fetch(
        editingId ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || "Unable to save transaction.");
      }

      setMessage(
        editingId
          ? "Transaction updated successfully."
          : "Transaction added successfully."
      );

      resetForm();
      await loadTransactions();
    } catch (err) {
      setError(err.message || "Unable to save transaction.");
    }
  };

  // Populate form when editing
  const startEdit = (transaction) => {
    setEditingId(transaction.id);

    setForm({
      type: transaction.type || "Expense",
      amount: String(transaction.amount ?? ""),
      description: transaction.description || "",
      category: transaction.category || "Other",
      date: transaction.date
        ? transaction.date.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      notes: transaction.notes || "",
    });

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // Delete transaction
  const deleteTransaction = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this transaction?"
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const details = await response.text();
        throw new Error(details || "Unable to delete transaction.");
      }

      if (editingId === id) {
        resetForm();
      }

      setMessage("Transaction deleted successfully.");
      await loadTransactions();
    } catch (err) {
      setError(err.message || "Unable to delete transaction.");
    }
  };

  // Dashboard calculations
  const income = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.type === "Income")
        .reduce((total, transaction) => total + Number(transaction.amount || 0), 0),
    [transactions]
  );

  const expenses = useMemo(
    () =>
      transactions
        .filter((transaction) => transaction.type === "Expense")
        .reduce((total, transaction) => total + Number(transaction.amount || 0), 0),
    [transactions]
  );

  const balance = income - expenses;

  // Available categories
  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(
        transactions
          .map((transaction) => transaction.category)
          .filter(Boolean)
      ),
    ];

    return uniqueCategories.sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  // Apply search, category, type, and date filters
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((transaction) => {
        const searchText = search.toLowerCase();

        const matchesSearch =
          (transaction.description || "").toLowerCase().includes(searchText) ||
          (transaction.category || "").toLowerCase().includes(searchText) ||
          (transaction.notes || "").toLowerCase().includes(searchText);

        const matchesCategory =
          categoryFilter === "All" ||
          transaction.category === categoryFilter;

        const matchesType =
          typeFilter === "All" || transaction.type === typeFilter;

        const transactionDate = transaction.date
          ? transaction.date.slice(0, 10)
          : "";

        const matchesStartDate =
          !startDate || transactionDate >= startDate;

        const matchesEndDate =
          !endDate || transactionDate <= endDate;

        return (
          matchesSearch &&
          matchesCategory &&
          matchesType &&
          matchesStartDate &&
          matchesEndDate
        );
      })
      .sort(
        (a, b) =>
          new Date(b.date || 0).getTime() -
          new Date(a.date || 0).getTime()
      );
  }, [
    transactions,
    search,
    categoryFilter,
    typeFilter,
    startDate,
    endDate,
  ]);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("All");
    setTypeFilter("All");
    setStartDate("");
    setEndDate("");
  };

  // Expense totals grouped by category
  const categoryChartData = useMemo(() => {
    const totals = {};

    transactions
      .filter((transaction) => transaction.type === "Expense")
      .forEach((transaction) => {
        const category = transaction.category || "Other";

        totals[category] =
          (totals[category] || 0) + Number(transaction.amount || 0);
      });

    return Object.entries(totals)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [transactions]);

  // Monthly income and expenses
  const monthlyChartData = useMemo(() => {
    const totals = {};

    transactions.forEach((transaction) => {
      if (!transaction.date) return;

      const date = new Date(transaction.date);

      if (Number.isNaN(date.getTime())) return;

      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

      if (!totals[monthKey]) {
        totals[monthKey] = {
          monthKey,
          income: 0,
          expenses: 0,
        };
      }

      if (transaction.type === "Income") {
        totals[monthKey].income += Number(transaction.amount || 0);
      } else if (transaction.type === "Expense") {
        totals[monthKey].expenses += Number(transaction.amount || 0);
      }
    });

    return Object.values(totals)
      .sort((a, b) => a.monthKey.localeCompare(b.monthKey))
      .slice(-6)
      .map((item) => {
        const [year, month] = item.monthKey.split("-");

        return {
          ...item,
          month: new Date(Number(year), Number(month) - 1, 1)
            .toLocaleDateString("en-PK", { month: "short", year: "2-digit" }),
        };
      });
  }, [transactions]);

  const incomeExpenseData = useMemo(
    () => [
      { name: "Income", amount: income },
      { name: "Expenses", amount: expenses },
    ],
    [income, expenses]
  );

  // Display login/register until authenticated
  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {/* Top navigation */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-icon">P</div>
          <div>
            <h1>PennyWise</h1>
            <span>Personal Finance Manager</span>
          </div>
        </div>

        <div className="user-actions">
          <span className="user-email">{email || "My Account"}</span>
          <button
            type="button"
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard">
        {/* Welcome section */}
        <section className="welcome-section">
          <div>
            <p className="welcome-eyebrow">YOUR FINANCIAL OVERVIEW</p>
            <h2>Welcome to PennyWise</h2>
            <p>
              Track your money, manage your budgets, and stay in control of
              your finances.
            </p>
          </div>

          <button
            type="button"
            className="refresh-button"
            onClick={loadTransactions}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh data"}
          </button>
        </section>

        {/* Status messages */}
        {message && (
          <div className="app-message success-message">{message}</div>
        )}

        {error && (
          <div className="app-message error-message">{error}</div>
        )}

        {/* Financial summary cards */}
        <section className="summary-cards">
          <article className="summary-card income-card">
            <div className="summary-card-top">
              <span>Total Income</span>
              <span className="summary-icon">↗</span>
            </div>
            <h3>{formatMoney(income)}</h3>
            <p>Income from all recorded transactions</p>
          </article>

          <article className="summary-card expense-card">
            <div className="summary-card-top">
              <span>Total Expenses</span>
              <span className="summary-icon">↘</span>
            </div>
            <h3>{formatMoney(expenses)}</h3>
            <p>Money spent across all categories</p>
          </article>

          <article className="summary-card balance-card">
            <div className="summary-card-top">
              <span>Available Balance</span>
              <span className="summary-icon">₨</span>
            </div>
            <h3>{formatMoney(balance)}</h3>
            <p>Income minus recorded expenses</p>
          </article>

          <article className="summary-card count-card">
            <div className="summary-card-top">
              <span>Transactions</span>
              <span className="summary-icon">▤</span>
            </div>
            <h3>{transactions.length}</h3>
            <p>Total recorded transactions</p>
          </article>
        </section>

        {/* Monthly budgets */}
        <BudgetManager
          token={token}
          transactions={transactions}
        />

        {/* Recurring transactions */}
        <RecurringTransactions token={token} />

        {/* Analytics */}
        <section className="charts-section">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">FINANCIAL ANALYTICS</p>
              <h2>Your financial insights</h2>
            </div>
          </div>

          <div className="charts-grid">
            <article className="chart-card">
              <div className="chart-heading">
                <h3>Monthly Income vs Expenses</h3>
                <p>Last six months with recorded activity</p>
              </div>

              <div className="chart-container">
                {monthlyChartData.length === 0 ? (
                  <div className="chart-empty">
                    Add transactions to see your monthly activity.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={monthlyChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => formatMoney(value)}
                      />
                      <Legend />
                      <Bar
                        dataKey="income"
                        name="Income"
                        fill="#0f9f76"
                        radius={[5, 5, 0, 0]}
                      />
                      <Bar
                        dataKey="expenses"
                        name="Expenses"
                        fill="#e56b6f"
                        radius={[5, 5, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>

            <article className="chart-card">
              <div className="chart-heading">
                <h3>Expenses by Category</h3>
                <p>Understand where your money goes</p>
              </div>

              <div className="chart-container">
                {categoryChartData.length === 0 ? (
                  <div className="chart-empty">
                    Add expense transactions to see category breakdowns.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={48}
                        paddingAngle={3}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell
                            key={entry.name}
                            fill={[
                              "#0f9f76",
                              "#4f7cac",
                              "#e9a23b",
                              "#8b75c9",
                              "#e56b6f",
                              "#38a3a5",
                              "#718096",
                              "#d977a8",
                            ][index % 8]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => formatMoney(value)}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>

            <article className="chart-card chart-card-wide">
              <div className="chart-heading">
                <h3>Balance Trend</h3>
                <p>Monthly net income after expenses</p>
              </div>

              <div className="chart-container">
                {monthlyChartData.length === 0 ? (
                  <div className="chart-empty">
                    Add transactions to see your balance trend.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart
                      data={monthlyChartData.map((item) => ({
                        ...item,
                        net: item.income - item.expenses,
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => formatMoney(value)}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="net"
                        name="Net income"
                        stroke="#4f7cac"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </article>

            <article className="chart-card">
              <div className="chart-heading">
                <h3>Income vs Expenses</h3>
                <p>Your overall recorded totals</p>
              </div>

              <div className="chart-container">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={incomeExpenseData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => formatMoney(value)}
                    />
                    <Bar
                      dataKey="amount"
                      name="Amount"
                      radius={[6, 6, 0, 0]}
                    >
                      <Cell fill="#0f9f76" />
                      <Cell fill="#e56b6f" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </div>
        </section>

        {/* Add or edit transaction */}
        <section className="transaction-section">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">TRANSACTION MANAGEMENT</p>
              <h2>{editingId ? "Edit transaction" : "Add a transaction"}</h2>
              <p>Record your income and expenses in one place.</p>
            </div>
          </div>

          <form className="transaction-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Transaction Type
                <select
                  name="type"
                  value={form.type}
                  onChange={handleChange}
                  required
                >
                  <option value="Expense">Expense</option>
                  <option value="Income">Income</option>
                </select>
              </label>

              <label>
                Amount (PKR)
                <input
                  type="number"
                  name="amount"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="Enter amount"
                  required
                />
              </label>

              <label>
                Description
                <input
                  type="text"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="e.g. Grocery shopping"
                  maxLength={200}
                  required
                />
              </label>

              <label>
                Category
                <input
                  type="text"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  placeholder="e.g. Food, Salary, Rent"
                  maxLength={100}
                  required
                />
              </label>

              <label>
                Date
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                />
              </label>

              <label>
                Notes (Optional)
                <input
                  type="text"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Additional details"
                />
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" disabled={loading}>
                {editingId ? "Save changes" : "Add transaction"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="cancel-button"
                  onClick={resetForm}
                >
                  Cancel editing
                </button>
              )}
            </div>
          </form>
        </section>

        {/* Transaction history and filters */}
        <section className="transactions-section">
          <div className="section-heading">
            <div>
              <p className="section-eyebrow">YOUR RECORDS</p>
              <h2>Transaction history</h2>
              <p>
                Showing {filteredTransactions.length} of {transactions.length}{" "}
                transactions.
              </p>
            </div>
          </div>

          <div className="transaction-filters">
            <label>
              Search
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search description, category, notes..."
              />
            </label>

            <label>
              Category
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
              >
                <option value="All">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Type
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
              >
                <option value="All">All types</option>
                <option value="Income">Income</option>
                <option value="Expense">Expense</option>
              </select>
            </label>

            <label>
              From
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </label>

            <label>
              To
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="clear-filters-button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          </div>

          <div className="transaction-table-wrapper">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{formatDate(transaction.date)}</td>

                    <td>
                      <div className="transaction-description">
                        {transaction.description || "—"}
                      </div>
                      {transaction.notes && (
                        <small className="transaction-notes">
                          {transaction.notes}
                        </small>
                      )}
                    </td>

                    <td>{transaction.category || "Other"}</td>

                    <td>
                      <span
                        className={`transaction-type ${
                          transaction.type === "Income"
                            ? "type-income"
                            : "type-expense"
                        }`}
                      >
                        {transaction.type}
                      </span>
                    </td>

                    <td
                      className={
                        transaction.type === "Income"
                          ? "amount-income"
                          : "amount-expense"
                      }
                    >
                      {transaction.type === "Income" ? "+" : "−"}
                      {formatMoney(transaction.amount)}
                    </td>

                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="edit-button"
                          onClick={() => startEdit(transaction)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => deleteTransaction(transaction.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-table">
                      {loading
                        ? "Loading transactions..."
                        : "No transactions match your filters."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="dashboard-footer">
          <p>PennyWise Personal Finance Manager</p>
          <span>Manage your money. Make smarter decisions.</span>
        </footer>
      </main>
    </div>
  );
}

export default App;
