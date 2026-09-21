// Auto-categorization logic for transaction descriptions
// Maps keywords to categories

interface CategoryRule {
  keywords: string[];
  category: string;
  type: "income" | "expense";
}

const CATEGORY_RULES: CategoryRule[] = [
  // Food & Beverage
  { keywords: ["food", "lunch", "dinner", "breakfast", "brunch", "restaurant", "cafe", "coffee", "pizza", "burger", "sushi", "grocery", "groceries", "supermarket", "snack", "mcdonald", "kfc", "starbucks", "meal", "takeout", "delivery", "doordash", "grubhub", "ubereats"], category: "F&B", type: "expense" },
  // Transportation
  { keywords: ["gas", "fuel", "uber", "lyft", "taxi", "bus", "train", "metro", "subway", "parking", "toll", "car", "vehicle", "oil change", "maintenance", "repair", "flight", "airline", "ticket", "transport"], category: "Transportation", type: "expense" },
  // Housing
  { keywords: ["rent", "mortgage", "electricity", "water", "utility", "utilities", "internet", "wifi", "phone bill", "insurance", "home", "house", "apartment", "strata", "council"], category: "Housing", type: "expense" },
  // Entertainment
  { keywords: ["movie", "netflix", "spotify", "subscription", "game", "gaming", "concert", "theater", "hobby", "book", "magazine", "youtube", "disney", "hulu", "amazon prime"], category: "Entertainment", type: "expense" },
  // Shopping
  { keywords: ["amazon", "shop", "shopping", "clothes", "shoes", "electronics", "furniture", "purchase", "buy", "order", "ebay", "walmart", "target", "ikea"], category: "Shopping", type: "expense" },
  // Healthcare
  { keywords: ["doctor", "hospital", "medicine", "pharmacy", "dental", "health", "medical", "clinic", "therapy", "gym", "fitness"], category: "Healthcare", type: "expense" },
  // Education
  { keywords: ["tuition", "course", "school", "university", "college", "education", "udemy", "coursera", "book", "tutorial", "class"], category: "Education", type: "expense" },
  // Salary / Income
  { keywords: ["salary", "wage", "paycheck", "bonus", "commission", "freelance", "contract", "income", "dividend", "interest", "refund", "reimburse", "cashback"], category: "Income", type: "income" },
  // Transfer
  { keywords: ["transfer", "deposit", "withdrawal", "atm"], category: "Transfer", type: "expense" },
  // Gift
  { keywords: ["gift", "donation", "charity", "present"], category: "Gift", type: "expense" },
];

export function autoCategorize(description: string): { category: string; type: "income" | "expense" } {
  const lowerDesc = description.toLowerCase();
  
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (lowerDesc.includes(keyword)) {
        return { category: rule.category, type: rule.type };
      }
    }
  }
  
  // Default category
  return { category: "Other", type: "expense" };
}

export const ALL_CATEGORIES = [
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
  "Other",
];
