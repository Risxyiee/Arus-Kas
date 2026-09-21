"use client";

import { useState, useMemo } from "react";
import { Download, FileBarChart } from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { useAppStore } from "@/lib/store";

function formatCurrency(amount: number) {
  return `$${Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function safeFormat(date: Date | string, fmt: string): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "—";
    return format(d, fmt);
  } catch {
    return "—";
  }
}

export function ReportsView() {
  const { transactions, debts } = useAppStore();
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Generate available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach((tx) => {
      const m = safeFormat(tx.date, "yyyy-MM");
      if (m !== "—") months.add(m);
    });
    debts.forEach((d) => {
      const m = safeFormat(d.dueDate, "yyyy-MM");
      if (m !== "—") months.add(m);
    });
    return Array.from(months).sort().reverse();
  }, [transactions, debts]);

  // Filter data by selected month
  const filteredTransactions = useMemo(() => {
    if (selectedMonth === "all") return transactions;
    return transactions.filter((tx) => {
      return safeFormat(tx.date, "yyyy-MM") === selectedMonth;
    });
  }, [transactions, selectedMonth]);

  const filteredDebts = useMemo(() => {
    if (selectedMonth === "all") return debts.filter((d) => d.type === "debt");
    return debts.filter(
      (d) =>
        d.type === "debt" &&
        safeFormat(d.dueDate, "yyyy-MM") === selectedMonth
    );
  }, [debts, selectedMonth]);

  const filteredReceivables = useMemo(() => {
    if (selectedMonth === "all")
      return debts.filter((d) => d.type === "receivable");
    return debts.filter(
      (d) =>
        d.type === "receivable" &&
        safeFormat(d.dueDate, "yyyy-MM") === selectedMonth
    );
  }, [debts, selectedMonth]);

  // Totals
  const txTotalIncome = filteredTransactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount, 0);
  const txTotalExpense = filteredTransactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount, 0);
  const debtTotal = filteredDebts.reduce((s, d) => s + d.amount, 0);
  const debtPaidTotal = filteredDebts.reduce((s, d) => s + d.paidAmount, 0);
  const receivableTotal = filteredReceivables.reduce(
    (s, d) => s + d.amount,
    0
  );
  const receivablePaidTotal = filteredReceivables.reduce(
    (s, d) => s + d.paidAmount,
    0
  );

  const handleDownloadPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.setTextColor(5, 150, 105); // emerald
    doc.text("FinTrack", 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Report generated on ${safeFormat(new Date(), "MMMM d, yyyy 'at' h:mm a")}`, 14, 30);
    doc.text(
      selectedMonth === "all"
        ? "All months"
        : `Month: ${selectedMonth}`,
      14,
      36
    );

    let yPos = 44;

    // Transactions Table
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Transactions", 14, yPos);
    yPos += 4;

    if (filteredTransactions.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [["Date", "Description", "Category", "Type", "Amount"]],
        body: filteredTransactions.map((tx) => [
          safeFormat(tx.date, "MMM d, yyyy"),
          tx.description,
          tx.category,
          tx.type === "income" ? "Income" : "Expense",
          formatCurrency(tx.amount),
        ]),
        foot: [
          [
            "",
            "",
            "",
            "Total",
            `Income: ${formatCurrency(txTotalIncome)} | Expense: ${formatCurrency(txTotalExpense)}`,
          ],
        ],
        theme: "striped",
        headStyles: { fillColor: [5, 150, 105] },
        margin: { left: 14 },
      });
      yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    } else {
      doc.setFontSize(10);
      doc.text("No transactions found.", 14, yPos + 4);
      yPos += 12;
    }

    // Debts Table
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text("Debts", 14, yPos);
    yPos += 4;

    if (filteredDebts.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [["Person", "Amount", "Paid", "Remaining", "Due Date", "Status"]],
        body: filteredDebts.map((d) => [
          d.personName,
          formatCurrency(d.amount),
          formatCurrency(d.paidAmount),
          formatCurrency(d.amount - d.paidAmount),
          safeFormat(d.dueDate, "MMM d, yyyy"),
          d.status,
        ]),
        foot: [
          [
            "Total",
            formatCurrency(debtTotal),
            formatCurrency(debtPaidTotal),
            formatCurrency(debtTotal - debtPaidTotal),
            "",
            "",
          ],
        ],
        theme: "striped",
        headStyles: { fillColor: [249, 115, 22] }, // orange
        margin: { left: 14 },
      });
      yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
    } else {
      doc.setFontSize(10);
      doc.text("No debts found.", 14, yPos + 4);
      yPos += 12;
    }

    // Receivables Table
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(14);
    doc.text("Receivables", 14, yPos);
    yPos += 4;

    if (filteredReceivables.length > 0) {
      autoTable(doc, {
        startY: yPos,
        head: [["Person", "Amount", "Received", "Remaining", "Due Date", "Status"]],
        body: filteredReceivables.map((d) => [
          d.personName,
          formatCurrency(d.amount),
          formatCurrency(d.paidAmount),
          formatCurrency(d.amount - d.paidAmount),
          safeFormat(d.dueDate, "MMM d, yyyy"),
          d.status,
        ]),
        foot: [
          [
            "Total",
            formatCurrency(receivableTotal),
            formatCurrency(receivablePaidTotal),
            formatCurrency(receivableTotal - receivablePaidTotal),
            "",
            "",
          ],
        ],
        theme: "striped",
        headStyles: { fillColor: [20, 184, 166] }, // teal
        margin: { left: 14 },
      });
    } else {
      doc.setFontSize(10);
      doc.text("No receivables found.", 14, yPos + 4);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `FinTrack Personal Finance Report | Page ${i} of ${pageCount}`,
        14,
        doc.internal.pageSize.getHeight() - 10
      );
    }

    doc.save(
      `fintrack-report-${safeFormat(new Date(), "yyyy-MM-dd")}.pdf`
    );
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">
            Detailed financial reports and PDF export
          </p>
        </div>
        <Button
          onClick={handleDownloadPDF}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          <Download className="size-4" />
          Download Report (PDF)
        </Button>
      </div>

      {/* Month Filter */}
      <div className="flex items-center gap-3">
        <Label htmlFor="report-month" className="whitespace-nowrap">
          Filter by Month:
        </Label>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger id="report-month" className="w-48">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {availableMonths.map((m) => (
              <SelectItem key={m} value={m}>
                {safeFormat(m + "-01", "MMMM yyyy")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileBarChart className="size-5 text-emerald-600" />
            Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              No transactions for the selected period.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {safeFormat(tx.date, "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {tx.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {tx.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            tx.type === "income"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border-0"
                              : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border-0"
                          }
                        >
                          {tx.type === "income" ? "Income" : "Expense"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-semibold ${
                          tx.type === "income"
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {tx.type === "income" ? "+" : "-"}
                        {formatCurrency(tx.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} />
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      <span className="text-green-600">
                        +{formatCurrency(txTotalIncome)}
                      </span>
                      {" / "}
                      <span className="text-red-600">
                        -{formatCurrency(txTotalExpense)}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Debts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileBarChart className="size-5 text-orange-500" />
            Debts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDebts.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              No debts for the selected period.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDebts.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        {d.personName}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(d.amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatCurrency(d.paidAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-orange-600">
                        {formatCurrency(d.amount - d.paidAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {safeFormat(d.dueDate, "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            d.status === "paid"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border-0"
                              : d.status === "partially_paid"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400 border-0"
                              : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border-0"
                          }
                        >
                          {d.status === "paid"
                            ? "Paid"
                            : d.status === "partially_paid"
                            ? "Partial"
                            : "Unpaid"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(debtTotal)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-green-600">
                      {formatCurrency(debtPaidTotal)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-orange-600">
                      {formatCurrency(debtTotal - debtPaidTotal)}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receivables Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileBarChart className="size-5 text-teal-500" />
            Receivables
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredReceivables.length === 0 ? (
            <div className="flex items-center justify-center h-24 text-muted-foreground">
              No receivables for the selected period.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Person</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceivables.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        {d.personName}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(d.amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatCurrency(d.paidAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-teal-600">
                        {formatCurrency(d.amount - d.paidAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {safeFormat(d.dueDate, "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            d.status === "paid"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border-0"
                              : d.status === "partially_paid"
                              ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400 border-0"
                              : "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border-0"
                          }
                        >
                          {d.status === "paid"
                            ? "Paid"
                            : d.status === "partially_paid"
                            ? "Partial"
                            : "Unpaid"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="font-semibold">Total</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {formatCurrency(receivableTotal)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-green-600">
                      {formatCurrency(receivablePaidTotal)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold text-teal-600">
                      {formatCurrency(receivableTotal - receivablePaidTotal)}
                    </TableCell>
                    <TableCell colSpan={2} />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
