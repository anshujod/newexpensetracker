import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import TransactionList from "@/components/transaction-list";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import TransactionForm from "@/components/transaction-form";
import { Transaction, Category } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Transactions() {
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  
  // Fetch transactions and categories
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-6">
        {/* Page Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Transactions</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage and view your transaction history</p>
          </div>
          
          <Button 
            onClick={() => setIsAddTransactionOpen(true)}
            className="px-4 py-2 bg-primary text-white rounded-md flex items-center gap-1"
          >
            <span className="sr-only sm:not-sr-only">Add Transaction</span>
            <span className="sm:hidden">+</span>
          </Button>
        </header>
        
        {/* Transactions List */}
        {isLoadingTransactions || isLoadingCategories ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <TransactionList 
            transactions={transactions || []} 
            categories={categories || []} 
            fullPage={true}
            isLoading={false}
          />
        )}
        
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
