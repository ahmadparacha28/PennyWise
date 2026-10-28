
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PennyWise1.Api.Data;
using PennyWise1.Api.Models;

namespace PennyWise1.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class RecurringTransactionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        public RecurringTransactionsController(AppDbContext context)
        {
            _context = context;
        }

        private bool TryGetUserId(out int userId)
        {
            userId = 0;

            return int.TryParse(
                User.FindFirstValue(ClaimTypes.NameIdentifier),
                out userId);
        }

        private static bool IsValidType(string type)
        {
            return type == "Income" || type == "Expense";
        }

        private static bool IsValidFrequency(string frequency)
        {
            return frequency == "Daily" ||
                   frequency == "Weekly" ||
                   frequency == "Monthly" ||
                   frequency == "Yearly";
        }

        private static string? Validate(
            RecurringTransaction transaction)
        {
            if (!IsValidType(transaction.Type))
                return "Type must be Income or Expense.";

            if (transaction.Amount <= 0)
                return "Amount must be greater than zero.";

            if (string.IsNullOrWhiteSpace(transaction.Category))
                return "Category is required.";

            if (transaction.Category.Trim().Length > 100)
                return "Category cannot exceed 100 characters.";

            if ((transaction.Description?.Length ?? 0) > 200)
                return "Description cannot exceed 200 characters.";

            if (!IsValidFrequency(transaction.Frequency))
                return "Frequency must be Daily, Weekly, Monthly, or Yearly.";

            if (transaction.NextDueDate == default)
                return "A valid next due date is required.";

            return null;
        }

        // GET: api/RecurringTransactions
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!TryGetUserId(out int userId))
                return Unauthorized();

            var records = await _context.RecurringTransactions
                .AsNoTracking()
                .Where(r => r.UserId == userId)
                .OrderBy(r => r.NextDueDate)
                .ToListAsync();

            return Ok(records);
        }

        // GET: api/RecurringTransactions/5
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            if (!TryGetUserId(out int userId))
                return Unauthorized();

            var record = await _context.RecurringTransactions
                .AsNoTracking()
                .FirstOrDefaultAsync(r =>
                    r.Id == id && r.UserId == userId);

            if (record == null)
                return NotFound();

            return Ok(record);
        }

        // POST: api/RecurringTransactions
        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] RecurringTransaction transaction)
        {
            if (!TryGetUserId(out int userId))
                return Unauthorized();

            var error = Validate(transaction);

            if (error != null)
                return BadRequest(new { message = error });

            transaction.Id = 0;
            transaction.UserId = userId;
            transaction.Category = transaction.Category.Trim();
            transaction.Description =
                transaction.Description?.Trim() ?? string.Empty;
            transaction.NextDueDate = transaction.NextDueDate.Date;
            transaction.CreatedAt = DateTime.UtcNow;
            transaction.IsActive = true;

            _context.RecurringTransactions.Add(transaction);
            await _context.SaveChangesAsync();

            return CreatedAtAction(
                nameof(GetById),
                new { id = transaction.Id },
                transaction);
        }

        // PUT: api/RecurringTransactions/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(
            int id,
            [FromBody] RecurringTransaction updated)
        {
            if (!TryGetUserId(out int userId))
                return Unauthorized();

            var existing = await _context.RecurringTransactions
                .FirstOrDefaultAsync(r =>
                    r.Id == id && r.UserId == userId);

            if (existing == null)
                return NotFound();

            var error = Validate(updated);

            if (error != null)
                return BadRequest(new { message = error });

            existing.Type = updated.Type;
            existing.Amount = updated.Amount;
            existing.Category = updated.Category.Trim();
            existing.Description =
                updated.Description?.Trim() ?? string.Empty;
            existing.Frequency = updated.Frequency;
            existing.NextDueDate = updated.NextDueDate.Date;
            existing.IsActive = updated.IsActive;

            await _context.SaveChangesAsync();

            return Ok(existing);
        }

        // PATCH: api/RecurringTransactions/5/toggle
        [HttpPatch("{id:int}/toggle")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            if (!TryGetUserId(out int userId))
                return Unauthorized();

            var record = await _context.RecurringTransactions
                .FirstOrDefaultAsync(r =>
                    r.Id == id && r.UserId == userId);

            if (record == null)
                return NotFound();

            record.IsActive = !record.IsActive;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                record.Id,
                record.IsActive,
                message = record.IsActive
                    ? "Schedule resumed."
                    : "Schedule paused."
            });
        }

        // DELETE: api/RecurringTransactions/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (!TryGetUserId(out int userId))
                return Unauthorized();

            var record = await _context.RecurringTransactions
                .FirstOrDefaultAsync(r =>
                    r.Id == id && r.UserId == userId);

            if (record == null)
                return NotFound();

            _context.RecurringTransactions.Remove(record);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // POST: api/RecurringTransactions/process-due
        [HttpPost("process-due")]
        public async Task<IActionResult> ProcessDueTransactions()
        {
            if (!TryGetUserId(out int userId))
                return Unauthorized();

            var today = DateTime.UtcNow.Date;

            var schedules = await _context.RecurringTransactions
                .Where(r =>
                    r.UserId == userId &&
                    r.IsActive &&
                    r.NextDueDate <= today)
                .OrderBy(r => r.NextDueDate)
                .ToListAsync();

            int transactionsCreated = 0;
            int occurrencesRecorded = 0;
            int schedulesChecked = schedules.Count;

            foreach (var schedule in schedules)
            {
                int catchUpCount = 0;

                while (schedule.NextDueDate.Date <= today &&
                       catchUpCount < 120)
                {
                    var dueDate = schedule.NextDueDate.Date;

                    var existingOccurrence =
                        await _context.RecurringTransactionOccurrences
                            .AsNoTracking()
                            .FirstOrDefaultAsync(o =>
                                o.RecurringTransactionId == schedule.Id &&
                                o.OccurrenceDate == dueDate);

                    if (existingOccurrence != null)
                    {
                        // Already processed. Do not create it again.
                        schedule.NextDueDate = GetNextDueDate(
                            dueDate, schedule.Frequency);

                        catchUpCount++;
                        continue;
                    }

                    var marker =
                        $"PW-REC-{schedule.Id}-{dueDate:yyyyMMdd}";

                    Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction?
                        dbTransaction = null;

                    Transaction? newTransaction = null;
                    RecurringTransactionOccurrence? occurrence = null;

                    try
                    {
                        dbTransaction =
                            await _context.Database.BeginTransactionAsync();

                        // Compatibility with transactions created by the
                        // previous marker-based processor.
                        var existingTransaction =
                            await _context.Transactions
                                .FirstOrDefaultAsync(t =>
                                    t.UserId == userId &&
                                    t.Notes == marker);

                        Transaction linkedTransaction;

                        if (existingTransaction != null)
                        {
                            linkedTransaction = existingTransaction;
                        }
                        else
                        {
                            newTransaction = new Transaction
                            {
                                Type = schedule.Type,
                                Amount = schedule.Amount,
                                Category = schedule.Category,
                                Description =
                                    string.IsNullOrWhiteSpace(
                                        schedule.Description)
                                        ? $"Recurring {schedule.Category}"
                                        : schedule.Description,
                                Date = dueDate,
                                Notes = marker,
                                UserId = userId,
                                CreatedAt = DateTime.UtcNow
                            };

                            _context.Transactions.Add(newTransaction);

                            // Generate the transaction ID before recording
                            // the occurrence that refers to it.
                            await _context.SaveChangesAsync();

                            linkedTransaction = newTransaction;
                        }

                        occurrence = new RecurringTransactionOccurrence
                        {
                            RecurringTransactionId = schedule.Id,
                            UserId = userId,
                            OccurrenceDate = dueDate,
                            TransactionId = linkedTransaction.Id,
                            ProcessedAt = DateTime.UtcNow
                        };

                        _context.RecurringTransactionOccurrences.Add(
                            occurrence);

                        await _context.SaveChangesAsync();
                        await dbTransaction.CommitAsync();

                        occurrencesRecorded++;

                        if (newTransaction != null)
                            transactionsCreated++;
                    }
                    catch (DbUpdateException)
                    {
                        if (dbTransaction != null)
                            await dbTransaction.RollbackAsync();

                        // Rollback does not automatically detach tracked
                        // entities from EF Core's change tracker.
                        if (newTransaction != null)
                        {
                            _context.Entry(newTransaction).State =
                                EntityState.Detached;
                        }

                        if (occurrence != null)
                        {
                            _context.Entry(occurrence).State =
                                EntityState.Detached;
                        }

                        // Treat this as a duplicate only if another
                        // successful request actually recorded it.
                        bool occurrenceNowExists =
                            await _context.RecurringTransactionOccurrences
                                .AsNoTracking()
                                .AnyAsync(o =>
                                    o.RecurringTransactionId == schedule.Id &&
                                    o.OccurrenceDate == dueDate);

                        if (!occurrenceNowExists)
                            throw;

                        // A competing request recorded this occurrence.
                        // The unique index protects against inserting it twice.
                    }
                    finally
                    {
                        if (dbTransaction != null)
                            await dbTransaction.DisposeAsync();
                    }

                    // Advance only after recording the occurrence or
                    // confirming that it was already recorded.
                    schedule.NextDueDate = GetNextDueDate(
                        dueDate, schedule.Frequency);

                    catchUpCount++;
                }
            }

            // Persist updated schedule dates.
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Due recurring schedules processed.",
                transactionsCreated,
                occurrencesRecorded,
                schedulesChecked,
                note = "A maximum of 120 overdue occurrences is processed per schedule per request."
            });
        }

        private static DateTime GetNextDueDate(
            DateTime currentDueDate,
            string frequency)
        {
            return frequency switch
            {
                "Daily" => currentDueDate.AddDays(1),
                "Weekly" => currentDueDate.AddDays(7),
                "Monthly" => currentDueDate.AddMonths(1),
                "Yearly" => currentDueDate.AddYears(1),
                _ => throw new InvalidOperationException(
                    "Unsupported recurring frequency.")
            };
        }
    }
}
