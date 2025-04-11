import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { Budget, Category, Transaction, InsertBudget } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, PlusCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const budgetFormSchema = z.object({
  categoryId: z.coerce.number().min(1, "Please select a category"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  period: z.string().min(1, "Please select a period"),
  startDate: z.string().min(1, "Please select a start date"),
  endDate: z.string().min(1, "Please select an end date"),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export default function Budgets() {
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const { toast } = useToast();
  
  // Fetch budgets, categories, and transactions
  const { data: budgets, isLoading: isLoadingBudgets } = useQuery<Budget[]>({
    queryKey: ["/api/budgets"],
  });
  
  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
  });
  
  // Budget form
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      categoryId: 0,
      amount: 0,
      period: "monthly",
      startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      endDate: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    },
  });
  
  // Handle period change to update date range
  const watchPeriod = form.watch("period");
  
  const updateDateRange = (period: string) => {
    const now = new Date();
    let start = startOfMonth(now);
    let end = endOfMonth(now);
    
    if (period === "yearly") {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    } else if (period === "quarterly") {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = endOfMonth(addMonths(start, 2));
    }
    
    form.setValue("startDate", format(start, "yyyy-MM-dd"));
    form.setValue("endDate", format(end, "yyyy-MM-dd"));
  };
  
  // Create budget mutation
  const createBudgetMutation = useMutation({
    mutationFn: async (data: BudgetFormValues) => {
      const res = await apiRequest("POST", "/api/budgets", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Budget created",
        description: "Your budget has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
      setIsAddBudgetOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create budget",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete budget mutation
  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/budgets/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Budget deleted",
        description: "Your budget has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete budget",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Calculate budget progress
  const calculateBudgetProgress = (budget: Budget) => {
    if (!transactions) return { spent: 0, available: budget.amount, percentage: 0 };
    
    const start = new Date(budget.startDate);
    const end = new Date(budget.endDate);
    
    const budgetTransactions = transactions.filter(transaction => {
      const date = new Date(transaction.date);
      return (
        transaction.type === 'expense' && 
        transaction.categoryId === budget.categoryId &&
        date >= start &&
        date <= end
      );
    });
    
    const spent = budgetTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const available = Math.max(0, budget.amount - spent);
    const percentage = Math.min(100, (spent / budget.amount) * 100);
    
    return { spent, available, percentage };
  };
  
  // Get budget status
  const getBudgetStatus = (percentage: number) => {
    if (percentage >= 100) return "danger";
    if (percentage >= 80) return "warning";
    return "success";
  };
  
  // Handle form submission
  const onSubmit = (data: BudgetFormValues) => {
    createBudgetMutation.mutate(data);
  };
  
  // Filtered expense categories
  const expenseCategories = categories?.filter(category => category.type === 'expense') || [];
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-6">
        {/* Page Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Budgets</h1>
            <p className="text-slate-500 dark:text-slate-400">Set and manage your spending limits</p>
          </div>
          
          <Button 
            onClick={() => setIsAddBudgetOpen(true)}
            className="px-4 py-2 bg-primary text-white rounded-md flex items-center gap-1"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Add Budget</span>
          </Button>
        </header>
        
        {/* Budgets List */}
        {isLoadingBudgets || isLoadingCategories || isLoadingTransactions ? (
          <div className="grid grid-cols-1 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full" />
            ))}
          </div>
        ) : budgets && budgets.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {budgets.map(budget => {
              const category = categories?.find(c => c.id === budget.categoryId);
              const progress = calculateBudgetProgress(budget);
              const status = getBudgetStatus(progress.percentage);
              
              return (
                <Card key={budget.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between mb-4">
                      <div className="flex items-center gap-2 mb-2 md:mb-0">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category?.color }} />
                        <h3 className="text-lg font-semibold">{category?.name}</h3>
                        <span className="text-sm text-muted-foreground">
                          ({format(new Date(budget.startDate), "MMM d")} - {format(new Date(budget.endDate), "MMM d, yyyy")})
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">${progress.spent.toFixed(2)} / ${budget.amount.toFixed(2)}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive/80"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this budget?')) {
                              deleteBudgetMutation.mutate(budget.id);
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    
                    <Progress 
                      value={progress.percentage} 
                      className={`h-2 ${
                        status === "danger" ? "bg-red-100 dark:bg-red-900/30" : 
                        status === "warning" ? "bg-yellow-100 dark:bg-yellow-900/30" : 
                        "bg-green-100 dark:bg-green-900/30"
                      }`} 
                    />
                    
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-muted-foreground">{progress.percentage.toFixed(0)}% used</span>
                      <span className={`${progress.available > 0 ? "text-green-600" : "text-red-600"}`}>
                        ${progress.available.toFixed(2)} {progress.available > 0 ? "left" : "over budget"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No budgets found</AlertTitle>
            <AlertDescription>
              You haven't created any budgets yet. Click the "Add Budget" button to get started.
            </AlertDescription>
          </Alert>
        )}
      </main>
      
      {/* Add Budget Dialog */}
      <Dialog open={isAddBudgetOpen} onOpenChange={setIsAddBudgetOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Budget</DialogTitle>
            <DialogDescription>
              Set a spending limit for a specific category.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {expenseCategories.map(category => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
                              {category.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="0.01" 
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Budget Period</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        updateDateRange(value);
                      }} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a period" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsAddBudgetOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createBudgetMutation.isPending}>
                  {createBudgetMutation.isPending ? "Creating..." : "Create Budget"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
