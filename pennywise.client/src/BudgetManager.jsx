
import { useCallback, useEffect, useState } from "react";
import "./BudgetManager.css";

const API_URL = "http://localhost:5010/api/Budgets";

const now = new Date();

function getSpent(transactions, category, month, year) {
  return transactions
    .filter((transaction) => {
      const transactionDate = String(transaction.date || "").slice(0, 10);
      const [transactionYear, transactionMonth] = transactionDate
        .split("-")
        .map(Number);

      return (
        String(transaction.type).toLowerCase() === "expense" &&
        String(transaction.category).toLowerCase() ===
          String(category).toLowerCase() &&
        transactionMonth === Number(month) &&
        transactionYear === Number(year)
      );
    })
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
}

function formatMoney(amount) {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function BudgetManager({ token, transactions = [] }) {
  const [budgets, setBudgets] = useState([]);
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [category, setCategory] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadBudgets = useCallback(async () => {
    if (!token) return;

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}?month=${month}&year=${year}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Could not load budgets.");
      }

      setBudgets(await response.json());
    } catch (error) {
      setMessage(error.message || "Failed to load budgets.");
    } finally {
      setLoading(false);
    }
  }, [token, month, year]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (!category.trim() || Number(monthlyLimit) <= 0) {
      setMessage("Enter a category and a budget amount greater than zero.");
      return;
    }

    const budgetData = {
      category: category.trim(),
      monthlyLimit: Number(monthlyLimit),
      month: Number(month),
      year: Number(year),
    };

    try {
      const response = await fetch(
        editingId ? `${API_URL}/${editingId}` : API_URL,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(budgetData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Could not save budget."
        );
      }

      setMessage(editingId ? "Budget updated successfully." : "Budget created successfully.");
      setCategory("");
      setMonthlyLimit("");
      setEditingId(null);

      await loadBudgets();
    } catch (error) {
      setMessage(error.message || "Something went wrong.");
    }
  }

  function startEdit(budget) {
    setCategory(budget.category);
    setMonthlyLimit(String(budget.monthlyLimit));
    setMonth(Number(budget.month));
    setYear(Number(budget.year));
    setEditingId(budget.id);
    setMessage("");

    document
      .getElementById("budget-form")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function cancelEdit() {
    setCategory("");
    setMonthlyLimit("");
    setEditingId(null);
    setMessage("");
  }

  async function deleteBudget(id) {
    if (!window.confirm("Are you sure you want to delete this budget?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Could not delete budget.");
      }

      setMessage("Budget deleted successfully.");
      await loadBudgets();
    } catch (error) {
      setMessage(error.message || "Failed to delete budget.");
    }
  }

  return (
    <section className="budget-section">
      <div className="budget-heading">
        <div>
          <h2>Monthly Budgets</h2>
          <p>Set spending limits and track your expenses.</p>
        </div>
      </div>

      <div className="budget-period">
        <label>
          Month
          <select
            value={month}
            onChange={(event) => setMonth(Number(event.target.value))}
          >
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {new Date(2000, index).toLocaleString("en", {
                  month: "long",
                })}
              </option>
            ))}
          </select>
        </label>

        <label>
          Year
          <input
            type="number"
            min="2000"
            max="2100"
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
          />
        </label>
      </div>

      <form id="budget-form" className="budget-form" onSubmit={handleSubmit}>
        <h3>{editingId ? "Edit Budget" : "Create a Budget"}</h3>

        <label>
          Category
          <input
            type="text"
            placeholder="e.g. Food, Transport, Shopping"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            required
          />
        </label>

        <label>
          Monthly Limit (PKR)
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="15000"
            value={monthlyLimit}
            onChange={(event) => setMonthlyLimit(event.target.value)}
            required
          />
        </label>

        <div className="budget-form-actions">
          <button type="submit">
            {editingId ? "Update Budget" : "Add Budget"}
          </button>

          {editingId && (
            <button type="button" className="budget-cancel" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {message && (
        <p className="budget-message" role="status">
          {message}
        </p>
      )}

      {loading ? (
        <p>Loading budgets...</p>
      ) : budgets.length === 0 ? (
        <p className="budget-empty">
          No budgets for this month. Create your first budget above.
        </p>
      ) : (
        <div className="budget-grid">
          {budgets.map((budget) => {
            const spent = getSpent(
              transactions,
              budget.category,
              budget.month,
              budget.year
            );

            const limit = Number(budget.monthlyLimit);
            const remaining = limit - spent;
            const percentage = limit > 0 ? (spent / limit) * 100 : 0;
            const progress = Math.min(percentage, 100);

            return (
              <article className="budget-card" key={budget.id}>
                <div className="budget-card-top">
                  <h3>{budget.category}</h3>
                  <span
                    className={`budget-status ${
                      remaining < 0
                        ? "over-budget"
                        : percentage >= 80
                        ? "near-limit"
                        : "within-budget"
                    }`}
                  >
                    {remaining < 0
                      ? "Over budget"
                      : percentage >= 80
                      ? "Near limit"
                      : "On track"}
                  </span>
                </div>

                <p className="budget-spent">{formatMoney(spent)}</p>
                <p className="budget-muted">
                  spent of {formatMoney(limit)}
                </p>

                <div
                  className="budget-progress-track"
                  role="progressbar"
                  aria-valuenow={Math.min(Math.round(percentage), 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${budget.category} budget used`}
                >
                  <div
                    className={`budget-progress-fill ${
                      remaining < 0 ? "progress-over" : ""
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="budget-figures">
                  <span>{Math.round(percentage)}% used</span>
                  <span className={remaining < 0 ? "negative-amount" : ""}>
                    {remaining < 0 ? "Over by " : "Left: "}
                    {formatMoney(Math.abs(remaining))}
                  </span>
                </div>

                <div className="budget-card-actions">
                  <button
                    type="button"
                    onClick={() => startEdit(budget)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="budget-delete"
                    onClick={() => deleteBudget(budget.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
