
import { useCallback, useEffect, useState } from "react";
import "./RecurringTransactions.css";

const API_URL = "http://localhost:5010/api/RecurringTransactions";

const emptyForm = {
  type: "Expense",
  amount: "",
  category: "",
  description: "",
  frequency: "Monthly",
  nextDueDate: new Date().toISOString().slice(0, 10),
  isActive: true,
};

function RecurringTransactions({ token }) {
  const [records, setRecords] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(API_URL, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? "Session expired. Please log in again."
            : "Could not load recurring transactions."
        );
      }

      setRecords(await response.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) loadRecords();
  }, [token, loadRecords]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!form.category.trim() || Number(form.amount) <= 0) {
      setError("Enter a category and an amount greater than zero.");
      return;
    }

    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        category: form.category.trim(),
        description: form.description.trim(),
        nextDueDate: `${form.nextDueDate}T00:00:00`,
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
        throw new Error(details || "Could not save the recurring transaction.");
      }

      setMessage(
        editingId
          ? "Recurring transaction updated successfully."
          : "Recurring transaction added successfully."
      );

      resetForm();
      await loadRecords();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(record) {
    setEditingId(record.id);
    setForm({
      type: record.type,
      amount: String(record.amount),
      category: record.category,
      description: record.description || "",
      frequency: record.frequency,
      nextDueDate: record.nextDueDate
        ? record.nextDueDate.slice(0, 10)
        : emptyForm.nextDueDate,
      isActive: record.isActive,
    });

    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteRecord(id) {
    if (!window.confirm("Delete this recurring transaction?")) return;

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
        throw new Error("Could not delete the recurring transaction.");
      }

      setMessage("Recurring transaction deleted.");
      await loadRecords();
    } catch (err) {
      setError(err.message);
    }
  }

  const money = (amount) =>
    new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      maximumFractionDigits: 2,
    }).format(amount);

  if (loading) {
    return <section className="recurring-section">Loading recurring transactions...</section>;
  }

  return (
    <section className="recurring-section">
      <div className="recurring-heading">
        <div>
          <p className="recurring-eyebrow">AUTOMATE YOUR PLANNING</p>
          <h2>Recurring Transactions</h2>
          <p>Keep track of salary, rent, bills, and regular payments.</p>
        </div>
        <span className="recurring-count">{records.length} scheduled</span>
      </div>

      {message && <div className="recurring-message success">{message}</div>}
      {error && <div className="recurring-message error">{error}</div>}

      <form className="recurring-form" onSubmit={handleSubmit}>
        <h3>{editingId ? "Edit recurring transaction" : "Add a recurring transaction"}</h3>

        <div className="recurring-form-grid">
          <label>
            Type
            <select name="type" value={form.type} onChange={handleChange}>
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
              placeholder="15000"
              required
            />
          </label>

          <label>
            Category
            <input
              name="category"
              value={form.category}
              onChange={handleChange}
              placeholder="Rent, Salary, Internet"
              maxLength={100}
              required
            />
          </label>

          <label>
            Frequency
            <select
              name="frequency"
              value={form.frequency}
              onChange={handleChange}
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </label>

          <label>
            Next due date
            <input
              type="date"
              name="nextDueDate"
              value={form.nextDueDate}
              onChange={handleChange}
              required
            />
          </label>

          <label>
            Description
            <input
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Optional details"
              maxLength={200}
            />
          </label>
        </div>

        {editingId && (
          <label className="recurring-active-toggle">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleChange}
            />
            Active
          </label>
        )}

        <div className="recurring-form-actions">
          <button type="submit" className="recurring-primary-button">
            {editingId ? "Save changes" : "Add recurring transaction"}
          </button>

          {editingId && (
            <button
              type="button"
              className="recurring-cancel-button"
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="recurring-list-heading">
        <h3>Your schedule</h3>
        <button type="button" onClick={loadRecords} className="recurring-refresh">
          Refresh
        </button>
      </div>

      {records.length === 0 ? (
        <div className="recurring-empty">
          <h3>No recurring transactions yet</h3>
          <p>Add your salary, rent, or another regular payment above.</p>
        </div>
      ) : (
        <div className="recurring-list">
          {records.map((record) => (
            <article className="recurring-card" key={record.id}>
              <div className="recurring-card-icon">
                {record.type === "Income" ? "↗" : "↘"}
              </div>

              <div className="recurring-card-details">
                <h4>{record.category}</h4>
                <p>{record.description || record.type}</p>
                <span>
                  {record.frequency} · Next due{" "}
                  {new Date(record.nextDueDate).toLocaleDateString()}
                </span>
              </div>

              <div className="recurring-card-right">
                <strong className={record.type === "Income" ? "income" : "expense"}>
                  {record.type === "Income" ? "+" : "−"}
                  {money(record.amount)}
                </strong>
                <span className={record.isActive ? "status-active" : "status-paused"}>
                  {record.isActive ? "Active" : "Paused"}
                </span>
                <div className="recurring-card-actions">
                  <button type="button" onClick={() => startEdit(record)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="recurring-delete"
                    onClick={() => deleteRecord(record.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default RecurringTransactions;
