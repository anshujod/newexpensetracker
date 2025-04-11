// Transaction types
export const TRANSACTION_TYPES = {
  INCOME: "income",
  EXPENSE: "expense",
};

// Period types for budgets
export const BUDGET_PERIODS = {
  MONTHLY: "monthly",
  QUARTERLY: "quarterly",
  YEARLY: "yearly",
};

// Default colors for categories
export const CATEGORY_COLORS = {
  INCOME: {
    SALARY: "#22c55e",
    INVESTMENT: "#6366f1",
    GIFTS: "#ec4899",
    OTHER: "#64748b",
  },
  EXPENSE: {
    HOUSING: "#9333ea",
    FOOD: "#3b82f6",
    TRANSPORTATION: "#10b981",
    UTILITIES: "#f59e0b",
    ENTERTAINMENT: "#ef4444",
    SHOPPING: "#ec4899",
    HEALTH: "#14b8a6",
    PERSONAL: "#8b5cf6",
    EDUCATION: "#f97316",
  },
};

// Items per page for pagination
export const ITEMS_PER_PAGE = 5;

// Chart colors
export const CHART_COLORS = {
  INCOME: "#22c55e",
  EXPENSE: "#ef4444",
  BLUE: "#3b82f6",
  PURPLE: "#8b5cf6",
  TEAL: "#14b8a6",
  ORANGE: "#f59e0b",
  PINK: "#ec4899",
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: "MMM dd, yyyy",
  API: "yyyy-MM-dd",
  MONTH_YEAR: "MMMM yyyy",
};
