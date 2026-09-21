"use client";

import { useState, useCallback } from "react";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

function safeFormat(date: Date | string, fmt: string): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "—";
    return format(d, fmt);
  } catch {
    return "—";
  }
}

function safeFormatDistance(date: Date | string, options?: { addSuffix?: boolean }): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    return formatDistanceToNow(d, options);
  } catch {
    return "";
  }
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/table";
import { useAppStore } from "@/lib/store";

const ALL_CATEGORIES = [
  "F&B",
  "Transportation",
  "Housing",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Education",
  "Income",
  "Transfer",
  "Gift",
  "Debt Payment",
  "Receivable Collection",
  "Other",
];

export function TransactionView() {
  const {
    transactions,
    addTransaction,
    deleteTransaction,
    categorize,
    isLoading,
  } = useAppStore();

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isCategorizing, setIsCategorizing] = useState(false);

  const handleAutoCategorize = useCallback(async () => {
    if (!description.trim()) return;
    setIsCategorizing(true);
    try {
      const result = await categorize(description);
      if (result) {
        setCategory(result.category);
        setType(result.type as "income" | "expense");
      }
    } finally {
      setIsCategorizing(false);
    }
  }, [description, categorize]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date || !description || !category || !type) return;

    setIsAdding(true);
    try {
      const success = await addTransaction({
        amount: parseFloat(amount),
        date,
        description,
        category,
        type,
      });
      if (success) {
        setAmount("");
        setDate(format(new Date(), "yyyy-MM-dd"));
        setDescription("");
        setCategory("");
        setType("expense");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteTransaction(id);
    } finally {
      setIsDeleting(null);
    }
  };

  function formatCurrency(amount: number, txType: string) {
    const formatted = `$${Math.abs(amount).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
    return txType === "income" ? `+${formatted}` : `-${formatted}`;
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">
          Add and manage your income and expenses
        </p>
      </div>

      {/* Add Transaction Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Transaction</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-2 lg:col-span-1">
              <Label htmlFor="tx-amount">Amount</Label>
              <Input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 lg:col-span-1">
              <Label htmlFor="tx-date">Date</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="tx-desc">
                Description{" "}
                {isCategorizing && (
                  <span className="text-xs text-muted-foreground">
                    (auto-categorizing...)
                  </span>
                )}
              </Label>
              <Input
                id="tx-desc"
                placeholder="e.g. Coffee at Starbucks"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleAutoCategorize}
                required
              />
            </div>
            <div className="space-y-2 lg:col-span-1">
              <Label htmlFor="tx-category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="tx-category" className="w-full">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-1">
              <Label htmlFor="tx-type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "income" | "expense")}
              >
                <SelectTrigger id="tx-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end sm:col-span-2 lg:col-span-6">
              <Button
                type="submit"
                disabled={isAdding}
                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
              >
                {isAdding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Add Transaction
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground">
              No transactions yet. Add your first transaction above.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-muted-foreground text-xs">
                        <div>
                          {safeFormat(tx.date, "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {safeFormatDistance(tx.date, { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {tx.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {tx.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            tx.type === "income" ? "default" : "destructive"
                          }
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
                        {formatCurrency(tx.amount, tx.type)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(tx.id)}
                          disabled={isDeleting === tx.id}
                        >
                          {isDeleting === tx.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
