"use client";

import { useState } from "react";
import {
  Plus,
  Loader2,
  CheckCircle2,
  Banknote,
  Trash2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppStore } from "@/lib/store";

function formatCurrency(amount: number) {
  return `$${Math.abs(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "paid":
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border-0">
          Paid
        </Badge>
      );
    case "partially_paid":
      return (
        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400 border-0">
          Partially Paid
        </Badge>
      );
    default:
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border-0">
          Unpaid
        </Badge>
      );
  }
}

export function DebtsView() {
  const { debts, addDebt, updateDebt, deleteDebt } = useAppStore();

  const [personName, setPersonName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [debtType, setDebtType] = useState<"debt" | "receivable">("debt");
  const [isAdding, setIsAdding] = useState(false);
  const [partialAmounts, setPartialAmounts] = useState<Record<string, string>>(
    {}
  );
  const [showPartial, setShowPartial] = useState<Record<string, boolean>>({});
  const [isSettling, setIsSettling] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const debtEntries = debts.filter((d) => d.type === "debt");
  const receivableEntries = debts.filter((d) => d.type === "receivable");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName || !amount || !dueDate) return;

    setIsAdding(true);
    try {
      const success = await addDebt({
        personName,
        amount: parseFloat(amount),
        dueDate,
        type: debtType,
      });
      if (success) {
        setPersonName("");
        setAmount("");
        setDueDate("");
        setDebtType("debt");
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleSettle = async (id: string) => {
    setIsSettling(id);
    try {
      await updateDebt(id, "settle");
    } finally {
      setIsSettling(null);
    }
  };

  const handlePartial = async (id: string) => {
    const pAmount = partialAmounts[id];
    if (!pAmount || parseFloat(pAmount) <= 0) return;

    setIsSettling(id);
    try {
      await updateDebt(id, "partial", parseFloat(pAmount));
      setShowPartial((prev) => ({ ...prev, [id]: false }));
      setPartialAmounts((prev) => ({ ...prev, [id]: "" }));
    } finally {
      setIsSettling(null);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    try {
      await deleteDebt(id);
    } finally {
      setIsDeleting(null);
    }
  };

  const renderDebtTable = (entries: typeof debts, label: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-muted-foreground">
            No {label.toLowerCase()} recorded yet.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const remaining = entry.amount - entry.paidAmount;
                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.personName}
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(entry.amount)}
                      </TableCell>
                      <TableCell className="font-mono text-green-600">
                        {formatCurrency(entry.paidAmount)}
                      </TableCell>
                      <TableCell className="font-mono text-orange-600">
                        {formatCurrency(remaining)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        <div>
                          {safeFormat(entry.dueDate, "MMM d, yyyy")}
                        </div>
                        <div className="text-xs">
                          {safeFormatDistance(entry.dueDate, {
                            addSuffix: true,
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={entry.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {entry.status !== "paid" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-emerald-600 hover:text-emerald-700"
                                onClick={() => handleSettle(entry.id)}
                                disabled={isSettling === entry.id}
                                title="Settle fully"
                              >
                                {isSettling === entry.id ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="size-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-orange-600 hover:text-orange-700"
                                onClick={() =>
                                  setShowPartial((prev) => ({
                                    ...prev,
                                    [entry.id]: !prev[entry.id],
                                  }))
                                }
                                title="Partial payment"
                              >
                                <Banknote className="size-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(entry.id)}
                            disabled={isDeleting === entry.id}
                            title="Delete"
                          >
                            {isDeleting === entry.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                        {showPartial[entry.id] && (
                          <div className="flex items-center gap-1 mt-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Amount"
                              className="h-7 w-24 text-xs"
                              value={partialAmounts[entry.id] ?? ""}
                              onChange={(e) =>
                                setPartialAmounts((prev) => ({
                                  ...prev,
                                  [entry.id]: e.target.value,
                                }))
                              }
                            />
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handlePartial(entry.id)}
                              disabled={isSettling === entry.id}
                            >
                              Pay
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Debts & Receivables
        </h1>
        <p className="text-muted-foreground">
          Track money you owe and money owed to you
        </p>
      </div>

      {/* Add Debt Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Entry</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSubmit}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"
          >
            <div className="space-y-2 lg:col-span-1">
              <Label htmlFor="debt-person">Person Name</Label>
              <Input
                id="debt-person"
                placeholder="e.g. John Doe"
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 lg:col-span-1">
              <Label htmlFor="debt-amount">Amount</Label>
              <Input
                id="debt-amount"
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
              <Label htmlFor="debt-due">Due Date</Label>
              <Input
                id="debt-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 lg:col-span-1">
              <Label htmlFor="debt-type">Type</Label>
              <Select
                value={debtType}
                onValueChange={(v) => setDebtType(v as "debt" | "receivable")}
              >
                <SelectTrigger id="debt-type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debt">Debt (I owe)</SelectItem>
                  <SelectItem value="receivable">
                    Receivable (Owed to me)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end lg:col-span-1">
              <Button
                type="submit"
                disabled={isAdding}
                className="bg-emerald-600 hover:bg-emerald-700 text-white w-full"
              >
                {isAdding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" />
                )}
                Add Entry
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabs: Debts & Receivables */}
      <Tabs defaultValue="debts">
        <TabsList>
          <TabsTrigger value="debts">
            Debts ({debtEntries.length})
          </TabsTrigger>
          <TabsTrigger value="receivables">
            Receivables ({receivableEntries.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="debts">
          {renderDebtTable(debtEntries, "Debts")}
        </TabsContent>
        <TabsContent value="receivables">
          {renderDebtTable(receivableEntries, "Receivables")}
        </TabsContent>
      </Tabs>
    </div>
  );
}
