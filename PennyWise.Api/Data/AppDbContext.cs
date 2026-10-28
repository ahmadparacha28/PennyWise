
using Microsoft.EntityFrameworkCore;
using PennyWise1.Api.Models;

namespace PennyWise1.Api.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options)
        {
        }

        public DbSet<Transaction> Transactions { get; set; } = null!;
        public DbSet<AppUser> Users { get; set; } = null!;
        public DbSet<Budget> Budgets { get; set; } = null!;
        public DbSet<RecurringTransaction> RecurringTransactions { get; set; } = null!;

        public DbSet<RecurringTransactionOccurrence>
            RecurringTransactionOccurrences { get; set; } = null!;

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<RecurringTransactionOccurrence>()
                .HasIndex(x => new
                {
                    x.RecurringTransactionId,
                    x.OccurrenceDate
                })
                .IsUnique();
        }
    }
}
