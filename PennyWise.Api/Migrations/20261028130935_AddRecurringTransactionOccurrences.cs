using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PennyWise.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddRecurringTransactionOccurrences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_Email",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Budgets_UserId_Category_Month_Year",
                table: "Budgets");

            migrationBuilder.CreateTable(
                name: "RecurringTransactionOccurrences",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    RecurringTransactionId = table.Column<int>(type: "INTEGER", nullable: false),
                    UserId = table.Column<int>(type: "INTEGER", nullable: false),
                    OccurrenceDate = table.Column<DateTime>(type: "TEXT", nullable: false),
                    TransactionId = table.Column<int>(type: "INTEGER", nullable: true),
                    ProcessedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecurringTransactionOccurrences", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RecurringTransactionOccurrences_RecurringTransactionId_OccurrenceDate",
                table: "RecurringTransactionOccurrences",
                columns: new[] { "RecurringTransactionId", "OccurrenceDate" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RecurringTransactionOccurrences");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Budgets_UserId_Category_Month_Year",
                table: "Budgets",
                columns: new[] { "UserId", "Category", "Month", "Year" },
                unique: true);
        }
    }
}
