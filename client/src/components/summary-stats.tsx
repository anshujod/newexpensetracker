import { ArrowUpCircle, ArrowDownCircle, Wallet } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface SummaryData {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  monthlyData: {
    month: number;
    year: number;
    income: number;
    expenses: number;
  }[];
}

interface SummaryStatsProps {
  data: SummaryData;
}

export default function SummaryStats({ data }: SummaryStatsProps) {
  if (!data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }
  
  // Calculate percent changes from previous period if available
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };
  
  // Get previous month data if available
  const currentMonth = data.monthlyData[0] || { income: 0, expenses: 0 };
  const previousMonth = data.monthlyData[1] || { income: 0, expenses: 0 };
  
  // Calculate percentage changes
  const incomeChange = calculateChange(currentMonth.income, previousMonth.income);
  const expenseChange = calculateChange(currentMonth.expenses, previousMonth.expenses);
  const balanceChange = calculateChange(data.balance, (previousMonth.income - previousMonth.expenses));
  
  // Format changes with ± signs
  const formatChange = (change: number) => {
    return `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
  };
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Income Stat */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Income</h3>
          <div className="bg-success-50 dark:bg-success-500/10 p-1 rounded">
            <ArrowUpCircle className="text-success-500 h-5 w-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-semibold">${data.totalIncome.toFixed(2)}</p>
          <span className={`text-xs ${incomeChange >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
            {formatChange(incomeChange)}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Compared to last month</p>
      </div>
      
      {/* Expenses Stat */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Expenses</h3>
          <div className="bg-danger-50 dark:bg-danger-500/10 p-1 rounded">
            <ArrowDownCircle className="text-danger-500 h-5 w-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-semibold">${data.totalExpenses.toFixed(2)}</p>
          <span className={`text-xs ${expenseChange <= 0 ? 'text-success-500' : 'text-danger-500'}`}>
            {formatChange(expenseChange)}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Compared to last month</p>
      </div>
      
      {/* Balance Stat */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium">Balance</h3>
          <div className="bg-primary-50 dark:bg-primary-500/10 p-1 rounded">
            <Wallet className="text-primary-500 h-5 w-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-semibold">${data.balance.toFixed(2)}</p>
          <span className={`text-xs ${balanceChange >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
            {formatChange(balanceChange)}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Compared to last month</p>
      </div>
    </div>
  );
}
