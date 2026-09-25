export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          pin_enabled: boolean;
          pin_hash: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          name?: string;
          pin_enabled?: boolean;
          pin_hash?: string | null;
        };
        Update: {
          name?: string;
          pin_enabled?: boolean;
          pin_hash?: string | null;
        };
      };
      wallets: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string;
          initial_balance: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string;
          initial_balance?: number;
        };
        Update: {
          name?: string;
          color?: string;
          initial_balance?: number;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          wallet_id: string;
          type: "income" | "expense";
          category: string;
          description: string;
          amount: number;
          occurred_at: string;
          source: string;
          ref_id: string | null;
          recur: "none" | "monthly";
          recur_parent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          wallet_id: string;
          type: "income" | "expense";
          category: string;
          description: string;
          amount: number;
          occurred_at: string;
          source?: string;
          ref_id?: string | null;
          recur?: "none" | "monthly";
          recur_parent?: string | null;
        };
        Update: {
          type?: "income" | "expense";
          category?: string;
          description?: string;
          amount?: number;
          occurred_at?: string;
          wallet_id?: string;
          ref_id?: string | null;
          recur?: "none" | "monthly";
        };
      };
      debts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "debt" | "receivable";
          amount: number;
          paid_amount: number;
          due_date: string | null;
          note: string;
          status: "unpaid" | "partially_paid" | "paid";
          settled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: "debt" | "receivable";
          amount: number;
          paid_amount?: number;
          due_date?: string | null;
          note?: string;
          status?: "unpaid" | "partially_paid" | "paid";
        };
        Update: {
          name?: string;
          type?: "debt" | "receivable";
          amount?: number;
          paid_amount?: number;
          due_date?: string | null;
          note?: string;
          status?: "unpaid" | "partially_paid" | "paid";
          settled_at?: string | null;
        };
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category: string;
          amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category: string;
          amount: number;
        };
        Update: {
          amount?: number;
        };
      };
      custom_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: "income" | "expense";
          color: string;
          keywords: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: "income" | "expense";
          color?: string;
          keywords?: string[];
        };
        Update: {
          name?: string;
          type?: "income" | "expense";
          color?: string;
          keywords?: string[];
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan: "free" | "pro";
          started_at: string;
          expires_at: string | null;
          payment_method: string | null;
          transaction_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan?: "free" | "pro";
          started_at?: string;
          expires_at?: string | null;
          payment_method?: string | null;
          transaction_id?: string | null;
        };
        Update: {
          plan?: "free" | "pro";
          expires_at?: string | null;
          payment_method?: string | null;
          transaction_id?: string | null;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      transaction_type: "income" | "expense";
      debt_type: "debt" | "receivable";
      debt_status: "unpaid" | "partially_paid" | "paid";
      recur_type: "none" | "monthly";
      plan_type: "free" | "pro";
    };
  };
}

export type Tables = Database["public"]["Tables"];
export type TablesInsert = {
  [K in keyof Tables]: Tables[K]["Insert"];
};
export type TablesUpdate = {
  [K in keyof Tables]: Tables[K]["Update"];
};
