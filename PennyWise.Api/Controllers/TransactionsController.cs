
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PennyWise1.Api.Data;
using PennyWise1.Api.Models;

namespace PennyWise1.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TransactionsController : ControllerBase
{
    private readonly AppDbContext _context;

    public TransactionsController(AppDbContext context)
    {
        _context = context;
    }

    private int? GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);

        return int.TryParse(value, out var userId)
            ? userId
            : null;
    }

    [HttpGet]
    public async Task<IActionResult> GetTransactions()
    {
        var userId = GetUserId();

        if (userId == null)
            return Unauthorized();

        var transactions = await _context.Transactions
            .Where(t => t.UserId == userId)
            .OrderByDescending(t => t.Date)
            .ToListAsync();

        return Ok(transactions);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetTransaction(int id)
    {
        var userId = GetUserId();

        if (userId == null)
            return Unauthorized();

        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (transaction == null)
            return NotFound();

        return Ok(transaction);
    }

    [HttpPost]
    public async Task<IActionResult> CreateTransaction(Transaction transaction)
    {
        var userId = GetUserId();

        if (userId == null)
            return Unauthorized();

        if (transaction.Amount <= 0)
            return BadRequest(new { message = "Amount must be greater than zero." });

        if (transaction.Type != "Income" && transaction.Type != "Expense")
            return BadRequest(new { message = "Type must be Income or Expense." });

        if (string.IsNullOrWhiteSpace(transaction.Description) ||
            string.IsNullOrWhiteSpace(transaction.Category))
        {
            return BadRequest(new
            {
                message = "Description and category are required."
            });
        }

        // Ownership is assigned by the server, never by the request.
        transaction.Id = 0;
        transaction.UserId = userId.Value;
        transaction.CreatedAt = DateTime.UtcNow;

        _context.Transactions.Add(transaction);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetTransaction),
            new { id = transaction.Id },
            transaction);
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateTransaction(
        int id, Transaction updatedTransaction)
    {
        var userId = GetUserId();

        if (userId == null)
            return Unauthorized();

        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (transaction == null)
            return NotFound();

        if (updatedTransaction.Amount <= 0)
            return BadRequest(new { message = "Amount must be greater than zero." });

        if (updatedTransaction.Type != "Income" &&
            updatedTransaction.Type != "Expense")
        {
            return BadRequest(new { message = "Type must be Income or Expense." });
        }

        if (string.IsNullOrWhiteSpace(updatedTransaction.Description) ||
            string.IsNullOrWhiteSpace(updatedTransaction.Category))
        {
            return BadRequest(new
            {
                message = "Description and category are required."
            });
        }

        transaction.Type = updatedTransaction.Type;
        transaction.Amount = updatedTransaction.Amount;
        transaction.Description = updatedTransaction.Description;
        transaction.Category = updatedTransaction.Category;
        transaction.Date = updatedTransaction.Date;
        transaction.Notes = updatedTransaction.Notes;

        await _context.SaveChangesAsync();

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteTransaction(int id)
    {
        var userId = GetUserId();

        if (userId == null)
            return Unauthorized();

        var transaction = await _context.Transactions
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (transaction == null)
            return NotFound();

        _context.Transactions.Remove(transaction);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
