import { useState } from "react";
import { Transaction, Category } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Pencil, Trash2, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import TransactionForm from "./transaction-form";
import { getCategoryBadgeClasses } from "@/lib/utils";

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  fullPage?: boolean;
  isLoading: boolean;
}

export default function TransactionList({ 
  transactions, 
  categories, 
  fullPage = false,
  isLoading 
}: TransactionListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();
  
  const itemsPerPage = 5;
  
  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/transactions/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Transaction deleted",
        description: "The transaction has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/summary"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete transaction: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Filter transactions
  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || transaction.categoryId.toString() === categoryFilter;
    return matchesSearch && matchesCategory;
  });
  
  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  
  // Find category by ID
  const getCategoryById = (id: number) => {
    return categories.find(category => category.id === id);
  };
  
  // Format transaction date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy");
  };
  
  // Handle transaction deletion
  const handleDeleteTransaction = (id: number) => {
    if (window.confirm("Are you sure you want to delete this transaction?")) {
      deleteTransactionMutation.mutate(id);
    }
  };
  
  // Handle pagination
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(totalPages, page)));
  };
  
  return (
    <>
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search transactions..."
                className="pl-8 pr-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <Select
              value={categoryFilter}
              onValueChange={setCategoryFilter}
            >
              <SelectTrigger className="text-sm bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md py-1.5 px-3 w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id.toString()}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : paginatedTransactions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="pb-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</th>
                    <th className="pb-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category</th>
                    <th className="pb-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount</th>
                    <th className="pb-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((transaction) => {
                    const category = getCategoryById(transaction.categoryId);
                    const isIncome = transaction.type === "income";
                    
                    return (
                      <tr 
                        key={transaction.id} 
                        className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                      >
                        <td className="py-3 text-sm">{formatDate(transaction.date)}</td>
                        <td className="py-3 text-sm">{transaction.description}</td>
                        <td className="py-3 text-sm">
                          {category && (
                            <span className={getCategoryBadgeClasses(category.color)}>
                              <i className={category.icon}></i>
                              {category.name}
                            </span>
                          )}
                        </td>
                        <td className={`py-3 text-sm text-right ${isIncome ? "text-success-500" : "text-danger-500"}`}>
                          {isIncome ? "+" : "-"}${transaction.amount.toFixed(2)}
                        </td>
                        <td className="py-3 text-sm text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setEditingTransaction(transaction)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-primary-500"
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleDeleteTransaction(transaction.id)}
                              className="h-8 w-8 p-0 text-slate-500 hover:text-danger-500"
                              disabled={deleteTransactionMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 dark:text-slate-400">No transactions found</p>
            </div>
          )}
          
          {/* Pagination */}
          {filteredTransactions.length > 0 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Showing {Math.min(filteredTransactions.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredTransactions.length, currentPage * itemsPerPage)} of {filteredTransactions.length} transactions
              </div>
              
              <div className="flex items-center gap-1">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Previous page</span>
                  <i className="ri-arrow-left-s-line"></i>
                </Button>
                
                {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
                  // Logic to display current page and adjacent ones
                  let pageNum = currentPage;
                  if (i === 0 && currentPage > 1) pageNum = currentPage - 1;
                  else if (i === 1) pageNum = currentPage;
                  else if (i === 2 && currentPage < totalPages) pageNum = currentPage + 1;
                  else return null;
                  
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="icon"
                      onClick={() => goToPage(pageNum)}
                      className="h-8 w-8 p-0"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                >
                  <span className="sr-only">Next page</span>
                  <i className="ri-arrow-right-s-line"></i>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <TransactionForm
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          categories={categories}
          editTransaction={editingTransaction}
        />
      )}
    </>
  );
}
