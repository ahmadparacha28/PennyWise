
using System.ComponentModel.DataAnnotations;

namespace PennyWise1.Api.Models
{
    public class RecurringTransaction
    {
        public int Id { get; set; }

        [Required]
        public string Type { get; set; } = "Expense";

        [Range(0.01, double.MaxValue)]
        public decimal Amount { get; set; }

        [Required]
        [MaxLength(100)]
        public string Category { get; set; } = string.Empty;

        [MaxLength(200)]
        public string Description { get; set; } = string.Empty;

        [Required]
        public string Frequency { get; set; } = "Monthly";

        public DateTime NextDueDate { get; set; }

        public bool IsActive { get; set; } = true;

        public int UserId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
