import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { TRANSACTION_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Category, RecurringTransaction } from "@shared/schema";

// Form validation schema
const recurringTransactionFormSchema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive(),
  description: z.string().min(1, "Description is required"),
  categoryId: z.coerce.number(),
  startDate: z.date(),
  endDate: z.date().nullable().optional(),
  frequency: z.enum(["daily", "weekly", "monthly", "yearly"]),
  dayOfWeek: z.coerce.number().min(0).max(6).nullable().optional(),
  dayOfMonth: z.coerce.number().min(1).max(31).nullable().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

type RecurringTransactionFormValues = z.infer<typeof recurringTransactionFormSchema>;

interface RecurringTransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  editRecurringTransaction?: RecurringTransaction;
}

export default function RecurringTransactionForm({
  isOpen,
  onClose,
  categories,
  editRecurringTransaction,
}: RecurringTransactionFormProps) {
  const [frequency, setFrequency] = useState<string>(
    editRecurringTransaction?.frequency || "monthly"
  );
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Initialize the form with default values or values from the transaction being edited
  const form = useForm<RecurringTransactionFormValues>({
    resolver: zodResolver(recurringTransactionFormSchema),
    defaultValues: editRecurringTransaction
      ? {
          ...editRecurringTransaction,
          startDate: new Date(editRecurringTransaction.startDate),
          endDate: editRecurringTransaction.endDate
            ? new Date(editRecurringTransaction.endDate)
            : null,
          amount: editRecurringTransaction.amount,
        }
      : {
          type: "expense",
          amount: 0,
          description: "",
          categoryId: categories.find(c => c.type === "expense")?.id || 0,
          startDate: new Date(),
          endDate: null,
          frequency: "monthly",
          dayOfMonth: new Date().getDate(),
          dayOfWeek: null,
          notes: "",
          isActive: true,
        },
  });
  
  // Mutation for creating a new recurring transaction
  const createMutation = useMutation({
    mutationFn: async (data: RecurringTransactionFormValues) => {
      const formattedData = {
        ...data,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : null,
      };
      const res = await apiRequest("POST", "/api/recurring-transactions", formattedData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-transactions"] });
      toast({
        title: "Success!",
        description: "Recurring transaction created successfully",
      });
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create recurring transaction: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  // Mutation for updating an existing recurring transaction
  const updateMutation = useMutation({
    mutationFn: async (data: RecurringTransactionFormValues) => {
      const formattedData = {
        ...data,
        startDate: format(data.startDate, "yyyy-MM-dd"),
        endDate: data.endDate ? format(data.endDate, "yyyy-MM-dd") : null,
      };
      const res = await apiRequest(
        "PUT", 
        `/api/recurring-transactions/${editRecurringTransaction?.id}`,
        formattedData
      );
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-transactions"] });
      toast({
        title: "Success!",
        description: "Recurring transaction updated successfully",
      });
      onClose();
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to update recurring transaction: ${error.message}`,
        variant: "destructive",
      });
    },
  });
  
  const onSubmit = (data: RecurringTransactionFormValues) => {
    // If frequency is weekly, make sure dayOfWeek is defined
    if (data.frequency === "weekly" && (data.dayOfWeek === null || data.dayOfWeek === undefined)) {
      data.dayOfWeek = data.startDate.getDay();
    }
    
    // If frequency is monthly, make sure dayOfMonth is defined
    if (data.frequency === "monthly" && (data.dayOfMonth === null || data.dayOfMonth === undefined)) {
      data.dayOfMonth = data.startDate.getDate();
    }
    
    if (editRecurringTransaction) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };
  
  // Filter categories by transaction type
  const filteredCategories = categories.filter(
    (category) => category.type === form.watch("type")
  );
  
  // Handle frequency change
  const handleFrequencyChange = (value: string) => {
    setFrequency(value);
    form.setValue("frequency", value as any);
    
    // Reset frequency-specific fields
    if (value !== "weekly") {
      form.setValue("dayOfWeek", null);
    }
    
    if (value !== "monthly") {
      form.setValue("dayOfMonth", null);
    }
    
    // Set defaults based on startDate
    const startDate = form.getValues("startDate");
    if (value === "weekly") {
      form.setValue("dayOfWeek", startDate.getDay());
    }
    
    if (value === "monthly") {
      form.setValue("dayOfMonth", startDate.getDate());
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editRecurringTransaction
              ? "Edit Recurring Transaction"
              : "Create Recurring Transaction"}
          </DialogTitle>
          <Button
            variant="ghost"
            className="absolute top-2 right-2 h-8 w-8 p-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Transaction Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Type</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Reset category when type changes
                      const firstCategory = categories.find(
                        (c) => c.type === value
                      );
                      if (firstCategory) {
                        form.setValue("categoryId", firstCategory.id);
                      }
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transaction type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(TRANSACTION_TYPES).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-2">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        className="pl-7"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id.toString()}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Date */}
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Start Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          // Update frequency-specific fields
                          if (frequency === "weekly") {
                            form.setValue("dayOfWeek", date?.getDay() || 0);
                          }
                          if (frequency === "monthly") {
                            form.setValue("dayOfMonth", date?.getDate() || 1);
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* End Date (Optional) */}
            <FormField
              control={form.control}
              name="endDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>End Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>No end date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="p-2">
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-left font-normal"
                          onClick={() => field.onChange(null)}
                        >
                          No end date
                        </Button>
                      </div>
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        initialFocus
                        disabled={(date) => {
                          const startDate = form.getValues("startDate");
                          return date < startDate;
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    If set, recurring transactions will stop after this date
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Frequency */}
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequency</FormLabel>
                  <Select
                    onValueChange={handleFrequencyChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Day of Week (for weekly frequency) */}
            {frequency === "weekly" && (
              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Week</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString() || "0"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day of week" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Day of Month (for monthly frequency) */}
            {frequency === "monthly" && (
              <FormField
                control={form.control}
                name="dayOfMonth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Month</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value?.toString() || "1"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select day of month" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {Array.from({ length: 31 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      If the day doesn't exist in a month (e.g., 31st in February), 
                      the transaction will be processed on the last day of that month.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Active Status */}
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4"
                    />
                  </FormControl>
                  <FormLabel className="text-sm">Active</FormLabel>
                  <FormDescription className="pl-2">
                    If checked, this recurring transaction will be processed automatically
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes here..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={onClose}
                className="mt-2"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="mt-2"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  "Saving..."
                ) : editRecurringTransaction ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}