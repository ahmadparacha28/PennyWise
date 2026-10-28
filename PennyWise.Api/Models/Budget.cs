
namespace PennyWise1.Api.Models;

public class Budget
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string Category { get; set; } = string.Empty;

    public decimal MonthlyLimit { get; set; }

    public int Month { get; set; }

    public int Year { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
