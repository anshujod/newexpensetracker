import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import ExpenseChart from "@/components/ui/expense-chart";
import IncomeExpenseChart from "@/components/ui/income-expense-chart";
import { Transaction, Category } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

export default function Reports() {
  const [period, setPeriod] = useState("6");
  const [activeTab, setActiveTab] = useState("expenses");
  
  // Fetch transactions and categories
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Fetch summary statistics
  const { data: summaryData, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["/api/summary"],
  });
  
  // Filter transactions based on period
  const filteredTransactions = transactions?.filter(transaction => {
    const transactionDate = new Date(transaction.date);
    const now = new Date();
    const monthsAgo = subMonths(now, parseInt(period));
    return transactionDate >= monthsAgo;
  });
  
  // Group transactions by month
  const transactionsByMonth = filteredTransactions?.reduce<Record<string, Transaction[]>>((acc, transaction) => {
    const date = new Date(transaction.date);
    const monthKey = format(date, 'yyyy-MM');
    
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    
    acc[monthKey].push(transaction);
    return acc;
  }, {});
  
  // Calculate monthly totals
  const monthlyTotals = transactionsByMonth ? Object.entries(transactionsByMonth).map(([monthKey, monthTransactions]) => {
    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year, month - 1);
    
    return {
      month: format(date, 'MMM yyyy'),
      income,
      expenses,
      balance: income - expenses
    };
  }).sort((a, b) => {
    // Sort by date (ascending)
    return new Date(a.month).getTime() - new Date(b.month).getTime();
  }) : [];
  
  // Calculate category totals
  const categoryTotals = filteredTransactions?.reduce<Record<number, number>>((acc, transaction) => {
    if (transaction.type === (activeTab === 'expenses' ? 'expense' : 'income')) {
      acc[transaction.categoryId] = (acc[transaction.categoryId] || 0) + transaction.amount;
    }
    return acc;
  }, {});
  
  // Get category names
  const categoryDetails = categoryTotals && categories?.reduce<Record<number, { name: string, color: string, amount: number, percentage: number }>>((acc, category) => {
    if (categoryTotals[category.id]) {
      acc[category.id] = {
        name: category.name,
        color: category.color,
        amount: categoryTotals[category.id],
        percentage: 0 // Calculate after getting total
      };
    }
    return acc;
  }, {});
  
  // Calculate percentages
  if (categoryDetails) {
    const total = Object.values(categoryDetails).reduce((sum, { amount }) => sum + amount, 0);
    Object.values(categoryDetails).forEach(category => {
      category.percentage = (category.amount / total) * 100;
    });
  }
  
  const showingFrom = format(subMonths(new Date(), parseInt(period)), 'MMMM yyyy');
  const showingTo = format(new Date(), 'MMMM yyyy');
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-6">
        {/* Page Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Reports</h1>
            <p className="text-slate-500 dark:text-slate-400">Analyze your financial data</p>
          </div>
          
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        </header>
        
        {/* Summary Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground mb-4">
              Showing data from {showingFrom} to {showingTo}
            </div>
            
            {isLoadingTransactions ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-muted-foreground mb-1">Total Income</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${monthlyTotals?.reduce((sum, month) => sum + month.income, 0).toFixed(2)}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-muted-foreground mb-1">Total Expenses</div>
                  <div className="text-2xl font-bold text-red-600">
                    ${monthlyTotals?.reduce((sum, month) => sum + month.expenses, 0).toFixed(2)}
                  </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-muted-foreground mb-1">Net Savings</div>
                  <div className="text-2xl font-bold text-blue-600">
                    ${monthlyTotals?.reduce((sum, month) => sum + month.balance, 0).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Monthly Trend</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              {isLoadingSummary ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <IncomeExpenseChart monthlyData={summaryData?.monthlyData.slice(0, parseInt(period)).reverse() || []} />
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-0">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Category Analysis</CardTitle>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList>
                    <TabsTrigger value="expenses">Expenses</TabsTrigger>
                    <TabsTrigger value="income">Income</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="h-80">
              {isLoadingTransactions || isLoadingCategories ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ExpenseChart 
                  transactions={filteredTransactions?.filter(t => t.type === (activeTab === 'expenses' ? 'expense' : 'income')) || []} 
                  categories={categories || []} 
                />
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Monthly Data Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Income</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Expenses</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Savings Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {monthlyTotals?.map((monthData, index) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{monthData.month}</td>
                        <td className="px-4 py-3 text-sm text-right text-green-600">${monthData.income.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-red-600">${monthData.expenses.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">${monthData.balance.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          {monthData.income > 0 ? ((monthData.balance / monthData.income) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
