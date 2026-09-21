import { create } from "zustand";

export type ActiveView = "dashboard" | "transactions" | "debts" | "reports";

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  category: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface Debt {
  id: string;
  personName: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface Summary {
  activeBalance: number;
  totalIncome: number;
  totalExpenses: number;
  totalDebt: number;
  totalReceivable: number;
  monthlyData: MonthlyData[];
}

interface AppState {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;

  transactions: Transaction[];
  debts: Debt[];
  summary: Summary | null;

  isLoading: boolean;

  fetchTransactions: () => Promise<void>;
  fetchDebts: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  refreshAll: () => Promise<void>;

  addTransaction: (data: {
    amount: number;
    date: string;
    description: string;
    category: string;
    type: string;
  }) => Promise<boolean>;
  deleteTransaction: (id: string) => Promise<boolean>;

  addDebt: (data: {
    personName: string;
    amount: number;
    dueDate: string;
    type: string;
  }) => Promise<boolean>;
  updateDebt: (
    id: string,
    action: "settle" | "partial",
    partialAmount?: number
  ) => Promise<boolean>;
  deleteDebt: (id: string) => Promise<boolean>;

  categorize: (description: string) => Promise<{
    category: string;
    type: string;
  } | null>;
}

export const useAppStore = create<AppState>((set, get) => ({
  activeView: "dashboard",
  setActiveView: (view) => set({ activeView: view }),

  transactions: [],
  debts: [],
  summary: null,
  isLoading: false,

  fetchTransactions: async () => {
    try {
      const res = await fetch("/api/transactions");
      if (res.ok) {
        const data = await res.json();
        set({ transactions: data });
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    }
  },

  fetchDebts: async () => {
    try {
      const res = await fetch("/api/debts");
      if (res.ok) {
        const data = await res.json();
        set({ debts: data });
      }
    } catch (error) {
      console.error("Failed to fetch debts:", error);
    }
  },

  fetchSummary: async () => {
    try {
      const res = await fetch("/api/summary");
      if (res.ok) {
        const data = await res.json();
        set({ summary: data });
      }
    } catch (error) {
      console.error("Failed to fetch summary:", error);
    }
  },

  refreshAll: async () => {
    set({ isLoading: true });
    await Promise.all([
      get().fetchTransactions(),
      get().fetchDebts(),
      get().fetchSummary(),
    ]);
    set({ isLoading: false });
  },

  addTransaction: async (data) => {
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await get().refreshAll();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to add transaction:", error);
      return false;
    }
  },

  deleteTransaction: async (id) => {
    try {
      const res = await fetch(`/api/transactions?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await get().refreshAll();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to delete transaction:", error);
      return false;
    }
  },

  addDebt: async (data) => {
    try {
      const res = await fetch("/api/debts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        await get().refreshAll();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to add debt:", error);
      return false;
    }
  },

  updateDebt: async (id, action, partialAmount) => {
    try {
      const body: Record<string, unknown> = { id, action };
      if (action === "partial" && partialAmount) {
        body.partialAmount = partialAmount;
      }
      const res = await fetch("/api/debts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await get().refreshAll();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to update debt:", error);
      return false;
    }
  },

  deleteDebt: async (id) => {
    try {
      const res = await fetch(`/api/debts?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await get().refreshAll();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to delete debt:", error);
      return false;
    }
  },

  categorize: async (description) => {
    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      if (res.ok) {
        const data = await res.json();
        return data;
      }
      return null;
    } catch (error) {
      console.error("Failed to categorize:", error);
      return null;
    }
  },
}));
