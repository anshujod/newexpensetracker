import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency value with $ symbol and 2 decimal places
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(value);
}

/**
 * Format percentage value with % symbol
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Get appropriate Tailwind CSS classes for category badges based on color
 */
export function getCategoryBadgeClasses(color: string): string {
  // Base classes for all badges
  const baseClasses = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium";
  
  // Determine background and text colors based on the provided color
  // These are approximations - we convert hex colors to the closest Tailwind color classes
  const colorMapping: Record<string, string> = {
    "#3b82f6": "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300", // blue
    "#22c55e": "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300", // green
    "#ef4444": "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300", // red
    "#f59e0b": "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300", // yellow
    "#9333ea": "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300", // purple
    "#ec4899": "bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300", // pink
    "#14b8a6": "bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300", // teal
    "#6366f1": "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300", // indigo
    "#8b5cf6": "bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300", // violet
    "#f97316": "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300", // orange
    "#64748b": "bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-300", // slate (default)
  };
  
  // Find exact match or default to slate
  return `${baseClasses} ${colorMapping[color] || colorMapping["#64748b"]}`;
}

/**
 * Calculate the percentage change between two numbers
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Get a color based on percentage (for budgets, etc.)
 * Red for high percentages, yellow for medium, green for low
 */
export function getColorByPercentage(percentage: number): string {
  if (percentage >= 90) return "bg-red-500";
  if (percentage >= 75) return "bg-yellow-500";
  return "bg-green-500";
}

/**
 * Truncate text with ellipsis after specified length
 */
export function truncateText(text: string, maxLength: number = 30): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Check if two dates are the same month and year
 */
export function isSameMonthAndYear(date1: Date, date2: Date): boolean {
  return (
    date1.getMonth() === date2.getMonth() && 
    date1.getFullYear() === date2.getFullYear()
  );
}
