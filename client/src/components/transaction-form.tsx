import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Category, Transaction } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

// Define form validation schema
const transactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  date: z.string().min(1, "Date is required"),
  categoryId: z.coerce.number().min(1, "Category is required"),
  notes: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  editTransaction?: Transaction;
}

export default function TransactionForm({
  isOpen, 
  onClose, 
  categories,
  editTransaction
}: TransactionFormProps) {
  const { toast } = useToast();
  const [transactionType, setTransactionType] = useState<"income" | "expense">(
    editTransaction?.type || "expense"
  );
  
  // Filtered categories based on transaction type
  const filteredCategories = categories.filter(
    (category) => category.type === transactionType
  );
  
  // Set up form with default values
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: editTransaction?.type || "expense",
      description: editTransaction?.description || "",
      amount: editTransaction?.amount || 0,
      date: editTransaction?.date 
        ? format(new Date(editTransaction.date), "yyyy-MM-dd") 
        : format(new Date(), "yyyy-MM-dd"),
      categoryId: editTransaction?.categoryId || 0,
      notes: editTransaction?.notes || "",
    },
  });
  
  // Update form when transaction type changes
  useEffect(() => {
    form.setValue("type", transactionType);
    
    // Reset categoryId if current category doesn't match new type
    const currentCategoryId = form.getValues("categoryId");
    const categoryExists = filteredCategories.some(cat => cat.id === currentCategoryId);
    
    if (currentCategoryId && !categoryExists) {
      form.setValue("categoryId", 0);
    }
  }, [transactionType, filteredCategories, form]);
  
  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormValues) => {
      const res = await apiRequest("POST", "/api/transactions", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transaction has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/summary"] });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create transaction: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async (data: TransactionFormValues & { id: number }) => {
      const { id, ...updateData } = data;
      const res = await apiRequest("PUT", `/api/transactions/${id}`, updateData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Transaction has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/summary"] });
      form.reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update transaction: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Form submission handler
  const onSubmit = (data: TransactionFormValues) => {
    if (editTransaction) {
      updateTransactionMutation.mutate({ ...data, id: editTransaction.id });
    } else {
      createTransactionMutation.mutate(data);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editTransaction ? "Edit" : "Add"} Transaction</DialogTitle>
          <DialogDescription>
            {editTransaction 
              ? "Update the details of your transaction" 
              : "Enter the details of your transaction below"}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Transaction Type</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={transactionType === "income" ? "default" : "outline"}
                  className={transactionType === "income" ? "bg-success-500 hover:bg-success-600" : ""}
                  onClick={() => setTransactionType("income")}
                >
                  Income
                </Button>
                <Button
                  type="button"
                  variant={transactionType === "expense" ? "default" : "outline"}
                  className={transactionType === "expense" ? "bg-danger-500 hover:bg-danger-600" : ""}
                  onClick={() => setTransactionType("expense")}
                >
                  Expense
                </Button>
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g., Grocery Shopping, Monthly Salary" />
                  </FormControl>
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
                        {...field}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
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
                        {filteredCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            <div className="flex items-center gap-2">
                              <i className={`${category.icon} text-xs`}></i>
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Add any additional details about this transaction"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6 gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={createTransactionMutation.isPending || updateTransactionMutation.isPending}
              >
                {(createTransactionMutation.isPending || updateTransactionMutation.isPending)
                  ? "Saving..."
                  : editTransaction
                    ? "Update Transaction"
                    : "Save Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
