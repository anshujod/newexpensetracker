import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import SummaryStats from "@/components/summary-stats";
import TransactionList from "@/components/transaction-list";
import BudgetProgress from "@/components/budget-progress";
import ExpenseChart from "@/components/ui/expense-chart";
import IncomeExpenseChart from "@/components/ui/income-expense-chart";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import TransactionForm from "@/components/transaction-form";
import { Calendar } from "lucide-react";
import DatePicker from "@/components/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Transaction, Category, Budget } from "@shared/schema";

export default function Dashboard() {
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  
  // Fetch transactions, categories, and budgets
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  const { data: budgets, isLoading: isLoadingBudgets } = useQuery<Budget[]>({
    queryKey: ["/api/budgets"],
  });
  
  // Fetch summary statistics
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["/api/summary"],
  });
  
  // Filter transactions for the current month
  const filteredTransactions = transactions?.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    return (
      transactionDate.getMonth() === selectedMonth.getMonth() &&
      transactionDate.getFullYear() === selectedMonth.getFullYear()
    );
  });
  
  // Format month for display
  const formattedMonth = selectedMonth.toLocaleDateString('en-US', { 
    month: 'long', 
    year: 'numeric' 
  });
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-6">
        {/* Page Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-slate-500 dark:text-slate-400">Track your finances at a glance</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={() => setIsAddTransactionOpen(true)}
              className="px-4 py-2 bg-primary text-white rounded-md flex items-center gap-1"
            >
              <span className="sr-only sm:not-sr-only">Add Transaction</span>
              <span className="sm:hidden">+</span>
            </Button>
            
            <div className="relative">
              <Button
                variant="outline"
                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex items-center gap-1 text-slate-700 dark:text-slate-300"
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
              >
                <Calendar className="h-4 w-4" />
                <span>{formattedMonth}</span>
              </Button>
              
              {isDatePickerOpen && (
                <DatePicker
                  date={selectedMonth}
                  setDate={setSelectedMonth}
                  onClose={() => setIsDatePickerOpen(false)}
                />
              )}
            </div>
          </div>
        </header>
        
        {/* Summary Stats */}
        {isLoadingSummary ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <SummaryStats data={summaryData} />
        )}
        
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Expense Breakdown</h3>
            </div>
            
            {isLoadingTransactions || isLoadingCategories ? (
              <Skeleton className="h-60 w-full" />
            ) : (
              <ExpenseChart 
                transactions={filteredTransactions || []} 
                categories={categories || []} 
              />
            )}
          </div>
          
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Income vs Expenses</h3>
            </div>
            
            {isLoadingSummary ? (
              <Skeleton className="h-60 w-full" />
            ) : (
              <IncomeExpenseChart monthlyData={summaryData?.monthlyData || []} />
            )}
          </div>
        </div>
        
        {/* Recent Transactions */}
        <TransactionList 
          transactions={filteredTransactions || []} 
          categories={categories || []}
          isLoading={isLoadingTransactions || isLoadingCategories}
        />
        
        {/* Budget Progress */}
        <BudgetProgress 
          budgets={budgets || []} 
          transactions={filteredTransactions || []} 
          categories={categories || []}
          isLoading={isLoadingBudgets || isLoadingCategories || isLoadingTransactions}
        />
        
        {/* Transaction Form Modal */}
        <TransactionForm 
          isOpen={isAddTransactionOpen} 
          onClose={() => setIsAddTransactionOpen(false)}
          categories={categories || []}
        />
      </main>
    </div>
  );
}
