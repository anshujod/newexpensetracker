import { Budget, Transaction, Category } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { PlusCircle } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BudgetProgressProps {
  budgets: Budget[];
  transactions: Transaction[];
  categories: Category[];
  isLoading: boolean;
}

// Budget form schema
const budgetFormSchema = z.object({
  categoryId: z.coerce.number().min(1, "Please select a category"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  period: z.string().min(1, "Please select a period"),
  startDate: z.string().min(1, "Please select a start date"),
  endDate: z.string().min(1, "Please select an end date"),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export default function BudgetProgress({ 
  budgets, 
  transactions, 
  categories,
  isLoading 
}: BudgetProgressProps) {
  const [isAddBudgetOpen, setIsAddBudgetOpen] = useState(false);
  const { toast } = useToast();
  
  // Setup form
  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      categoryId: 0,
      amount: 0,
      period: "monthly",
      startDate: format(new Date(), "yyyy-MM-01"),
      endDate: format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0), "yyyy-MM-dd"),
    },
  });
  
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
  
  // Handle period change to update date range
  const updateDateRange = (period: string) => {
    const now = new Date();
    let start, end;
    
    if (period === "monthly") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (period === "quarterly") {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
    } else if (period === "yearly") {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    }
    
    if (start && end) {
      form.setValue("startDate", format(start, "yyyy-MM-dd"));
      form.setValue("endDate", format(end, "yyyy-MM-dd"));
    }
  };
  
  // Calculate budget usage
  const calculateBudgetUsage = (budget: Budget) => {
    // Filter relevant transactions
    const startDate = new Date(budget.startDate);
    const endDate = new Date(budget.endDate);
    
    const relevantTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return (
        transaction.type === "expense" &&
        transaction.categoryId === budget.categoryId &&
        transactionDate >= startDate &&
        transactionDate <= endDate
      );
    });
    
    // Calculate total spent
    const spent = relevantTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const remaining = Math.max(0, budget.amount - spent);
    const percentage = Math.min(100, (spent / budget.amount) * 100);
    
    return {
      spent,
      remaining,
      percentage,
      isOverBudget: spent > budget.amount
    };
  };
  
  // Filter expense categories
  const expenseCategories = categories.filter(category => category.type === "expense");
  
  // Handle form submission
  const onSubmit = (data: BudgetFormValues) => {
    createBudgetMutation.mutate(data);
  };
  
  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget Status</CardTitle>
          <Button 
            onClick={() => setIsAddBudgetOpen(true)}
            className="text-sm text-primary hover:text-primary/80 flex items-center gap-1"
            variant="ghost"
          >
            <PlusCircle className="h-4 w-4" />
            Add Budget
          </Button>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : budgets && budgets.length > 0 ? (
            <div className="space-y-4">
              {budgets.map(budget => {
                const category = categories.find(c => c.id === budget.categoryId);
                const usage = calculateBudgetUsage(budget);
                
                if (!category) return null;
                
                return (
                  <div key={budget.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <i className={`${category.icon} text-[${category.color}]`}></i>
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="text-sm font-medium">${usage.spent.toFixed(2)} / ${budget.amount.toFixed(2)}</div>
                    </div>
                    
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${
                          usage.percentage >= 90 ? "bg-red-500" :
                          usage.percentage >= 75 ? "bg-yellow-500" :
                          "bg-green-500"
                        }`} 
                        style={{ width: `${usage.percentage}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-slate-500 dark:text-slate-400">{usage.percentage.toFixed(0)}% used</span>
                      <span className={usage.isOverBudget ? "text-red-500" : "text-slate-500 dark:text-slate-400"}>
                        {usage.isOverBudget 
                          ? `$${(usage.spent - budget.amount).toFixed(2)} over budget` 
                          : `$${usage.remaining.toFixed(2)} left`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500 dark:text-slate-400 mb-4">You haven't set up any budgets yet</p>
              <Button 
                onClick={() => setIsAddBudgetOpen(true)}
                className="inline-flex items-center gap-1"
              >
                <PlusCircle className="h-4 w-4" />
                Create Your First Budget
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
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
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value ? field.value.toString() : undefined}
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
                      <div className="relative">
                        <span className="absolute left-3 top-2.5">$</span>
                        <Input 
                          type="number" 
                          min="0" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                          className="pl-7"
                        />
                      </div>
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
    </>
  );
}
