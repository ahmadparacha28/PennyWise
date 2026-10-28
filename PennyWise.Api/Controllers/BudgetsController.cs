
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
public class BudgetsController : ControllerBase
{
    private readonly AppDbContext _context;

    public BudgetsController(AppDbContext context)
    {
        _context = context;
    }

    private int GetUserId()
    {
        return int.Parse(
            User.FindFirstValue(ClaimTypes.NameIdentifier)!
        );
    }

    // GET: api/Budgets?month=10&year=2026
    [HttpGet]
    public async Task<IActionResult> GetBudgets(
        [FromQuery] int? month,
        [FromQuery] int? year)
    {
        var userId = GetUserId();

        var query = _context.Budgets
            .Where(b => b.UserId == userId);

        if (month.HasValue)
            query = query.Where(b => b.Month == month.Value);

        if (year.HasValue)
            query = query.Where(b => b.Year == year.Value);

        return Ok(await query
            .OrderBy(b => b.Category)
            .ToListAsync());
    }

    // POST: api/Budgets
    [HttpPost]
    public async Task<IActionResult> CreateBudget(
        [FromBody] Budget budget)
    {
        var userId = GetUserId();

        if (budget.Month < 1 || budget.Month > 12)
            return BadRequest(new { message = "Month must be between 1 and 12." });

        if (budget.Year < 2000 || budget.Year > 2100)
            return BadRequest(new { message = "Please provide a valid year." });

        if (budget.MonthlyLimit <= 0)
            return BadRequest(new { message = "Budget must be greater than zero." });

        if (string.IsNullOrWhiteSpace(budget.Category))
            return BadRequest(new { message = "Category is required." });

        var category = budget.Category.Trim();

        var exists = await _context.Budgets.AnyAsync(b =>
            b.UserId == userId &&
            b.Category.ToLower() == category.ToLower() &&
            b.Month == budget.Month &&
            b.Year == budget.Year);

        if (exists)
            return Conflict(new { message = "A budget already exists for this category and month." });

        budget.Id = 0;
        budget.UserId = userId;
        budget.Category = category;
        budget.CreatedAt = DateTime.UtcNow;

        _context.Budgets.Add(budget);
        await _context.SaveChangesAsync();

        return CreatedAtAction(
            nameof(GetBudgets),
            new { month = budget.Month, year = budget.Year },
            budget);
    }

    // PUT: api/Budgets/1
    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateBudget(
        int id,
        [FromBody] Budget updatedBudget)
    {
        var userId = GetUserId();

        var budget = await _context.Budgets.FirstOrDefaultAsync(b =>
            b.Id == id && b.UserId == userId);

        if (budget == null)
            return NotFound(new { message = "Budget not found." });

        if (updatedBudget.Month < 1 || updatedBudget.Month > 12)
            return BadRequest(new { message = "Month must be between 1 and 12." });

        if (updatedBudget.Year < 2000 || updatedBudget.Year > 2100)
            return BadRequest(new { message = "Please provide a valid year." });

        if (updatedBudget.MonthlyLimit <= 0)
            return BadRequest(new { message = "Budget must be greater than zero." });

        if (string.IsNullOrWhiteSpace(updatedBudget.Category))
            return BadRequest(new { message = "Category is required." });

        var category = updatedBudget.Category.Trim();

        var duplicate = await _context.Budgets.AnyAsync(b =>
            b.UserId == userId &&
            b.Id != id &&
            b.Category.ToLower() == category.ToLower() &&
            b.Month == updatedBudget.Month &&
            b.Year == updatedBudget.Year);

        if (duplicate)
            return Conflict(new { message = "A budget already exists for this category and month." });

        budget.Category = category;
        budget.MonthlyLimit = updatedBudget.MonthlyLimit;
        budget.Month = updatedBudget.Month;
        budget.Year = updatedBudget.Year;

        await _context.SaveChangesAsync();

        return Ok(budget);
    }

    // DELETE: api/Budgets/1
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteBudget(int id)
    {
        var userId = GetUserId();

        var budget = await _context.Budgets.FirstOrDefaultAsync(b =>
            b.Id == id && b.UserId == userId);

        if (budget == null)
            return NotFound(new { message = "Budget not found." });

        _context.Budgets.Remove(budget);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}
