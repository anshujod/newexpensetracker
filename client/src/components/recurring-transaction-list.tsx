import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarIcon,
  Edit,
  MoreHorizontal,
  Pause,
  Play,
  Repeat,
  Trash2,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, getCategoryBadgeClasses } from "@/lib/utils";
import { RecurringTransaction, Category } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import RecurringTransactionForm from "./recurring-transaction-form";

interface RecurringTransactionListProps {
  recurringTransactions: RecurringTransaction[];
  categories: Category[];
  fullPage?: boolean;
  isLoading: boolean;
}

export default function RecurringTransactionList({
  recurringTransactions,
  categories,
  fullPage = false,
  isLoading,
}: RecurringTransactionListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<RecurringTransaction | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mutation for deleting a recurring transaction
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/recurring-transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-transactions"] });
      toast({
        title: "Success!",
        description: "Recurring transaction deleted successfully",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete recurring transaction: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation for toggling active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({
      id,
      isActive,
    }: {
      id: number;
      isActive: boolean;
    }) => {
      const res = await apiRequest("PUT", `/api/recurring-transactions/${id}`, {
        isActive,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-transactions"] });
      toast({
        title: "Success!",
        description: "Recurring transaction updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update recurring transaction: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Handle delete action
  const handleDelete = (transaction: RecurringTransaction) => {
    setSelectedTransaction(transaction);
    setIsDeleteDialogOpen(true);
  };

  // Handle edit action
  const handleEdit = (transaction: RecurringTransaction) => {
    setSelectedTransaction(transaction);
    setIsFormOpen(true);
  };

  // Get the readable frequency
  const getFrequencyText = (transaction: RecurringTransaction): string => {
    switch (transaction.frequency) {
      case "daily":
        return "Daily";
      case "weekly":
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return `Weekly on ${days[transaction.dayOfWeek || 0]}`;
      case "monthly":
        return `Monthly on day ${transaction.dayOfMonth}`;
      case "yearly":
        const date = new Date(transaction.startDate);
        return `Yearly on ${format(date, "MMMM d")}`;
      default:
        return transaction.frequency;
    }
  };

  // Function to find the category name for a transaction
  const getCategoryName = (categoryId: number): string => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : "Unknown";
  };

  // Function to get badge variant based on transaction type
  const getBadgeVariant = (type: "income" | "expense"): "default" | "secondary" => {
    return type === "income" ? "default" : "secondary";
  };

  // Function to render transaction list
  const renderTransactions = () => {
    if (isLoading) {
      return Array.from({ length: 3 }).map((_, index) => (
        <Card key={index} className="mb-4">
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-2/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="flex justify-between">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-8 w-24" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-4 w-full" />
          </CardFooter>
        </Card>
      ));
    }

    if (recurringTransactions.length === 0) {
      return (
        <div className="text-center py-8">
          <Repeat className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium">No recurring transactions</h3>
          <p className="text-muted-foreground mb-4">
            Add recurring transactions to automate your finances
          </p>
          <Button onClick={() => setIsFormOpen(true)}>
            Create Recurring Transaction
          </Button>
        </div>
      );
    }

    return recurringTransactions.map((transaction) => (
      <Card
        key={transaction.id}
        className={`mb-4 ${
          !transaction.isActive ? "opacity-70" : ""
        }`}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{transaction.description}</CardTitle>
              <CardDescription>
                {getCategoryName(transaction.categoryId)}
              </CardDescription>
            </div>
            <div className="flex items-center">
              <Badge
                variant={getBadgeVariant(transaction.type)}
                className={
                  transaction.type === "income"
                    ? "bg-green-500 hover:bg-green-600"
                    : "bg-red-500 hover:bg-red-600"
                }
              >
                {transaction.type === "income" ? "Income" : "Expense"}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0 ml-2">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleEdit(transaction)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        id: transaction.id,
                        isActive: !transaction.isActive,
                      })
                    }
                  >
                    {transaction.isActive ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Resume
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => handleDelete(transaction)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="flex justify-between items-center">
            <div className="text-2xl font-bold">
              {formatCurrency(transaction.amount)}
            </div>
            <Badge
              variant="outline"
              className="flex items-center gap-1 font-normal"
            >
              <Repeat className="h-3 w-3" />
              {getFrequencyText(transaction)}
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="pt-1 text-sm text-muted-foreground flex justify-between">
          <div className="flex items-center">
            <CalendarIcon className="h-3 w-3 mr-1" />
            <span>
              Starting: {format(new Date(transaction.startDate), "MMM d, yyyy")}
            </span>
          </div>
          {transaction.endDate && (
            <div className="flex items-center">
              <CalendarIcon className="h-3 w-3 mr-1" />
              <span>
                Until: {format(new Date(transaction.endDate), "MMM d, yyyy")}
              </span>
            </div>
          )}
          {transaction.lastProcessedDate && (
            <div className="flex items-center">
              <CalendarIcon className="h-3 w-3 mr-1" />
              <span>
                Last processed: {format(new Date(transaction.lastProcessedDate), "MMM d, yyyy")}
              </span>
            </div>
          )}
        </CardFooter>
      </Card>
    ));
  };

  return (
    <div className={fullPage ? "" : "mt-4"}>
      {fullPage && (
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-3xl font-bold">Recurring Transactions</h2>
            <p className="text-muted-foreground">
              Manage your repeating income and expenses
            </p>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            Create Recurring Transaction
          </Button>
        </div>
      )}

      <div className="space-y-4">{renderTransactions()}</div>

      {/* Recurring Transaction Form Dialog */}
      {isFormOpen && (
        <RecurringTransactionForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedTransaction(null);
          }}
          categories={categories}
          editRecurringTransaction={selectedTransaction || undefined}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the recurring transaction. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => 
                selectedTransaction && 
                deleteMutation.mutate(selectedTransaction.id)
              }
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}