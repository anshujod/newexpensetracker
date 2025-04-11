import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import RecurringTransactionList from "@/components/recurring-transaction-list";
import { Category, RecurringTransaction } from "@shared/schema";

export default function RecurringTransactionsPage() {
  // Fetch recurring transactions
  const {
    data: recurringTransactions = [],
    isLoading: isLoadingTransactions,
    error: transactionsError,
  } = useQuery<RecurringTransaction[]>({
    queryKey: ["/api/recurring-transactions"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch categories
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    error: categoriesError,
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Handle loading state
  const isLoading = isLoadingTransactions || isLoadingCategories;

  // Handle errors
  const error = transactionsError || categoriesError;
  if (error) {
    return (
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-10">
          <h1 className="text-2xl font-bold text-red-500">Error</h1>
          <p className="mt-2 text-gray-600">
            Failed to load data: {error.message}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container max-w-5xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading recurring transactions...</span>
          </div>
        ) : (
          <RecurringTransactionList
            recurringTransactions={recurringTransactions}
            categories={categories}
            isLoading={isLoading}
            fullPage={true}
          />
        )}
      </div>
    </>
  );
}