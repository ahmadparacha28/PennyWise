
using System;
using System.ComponentModel.DataAnnotations;

namespace PennyWise1.Api.Models
{
    public class RecurringTransactionOccurrence
    {
        public int Id { get; set; }

        [Required]
        public int RecurringTransactionId { get; set; }

        [Required]
        public int UserId { get; set; }

        // The scheduled date this occurrence represents.
        public DateTime OccurrenceDate { get; set; }

        // The real transaction created for this occurrence.
        public int? TransactionId { get; set; }

        public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
    }
}
