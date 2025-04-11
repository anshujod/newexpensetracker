import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertTransactionSchema, 
  insertCategorySchema, 
  insertBudgetSchema,
  insertRecurringTransactionSchema
} from "@shared/schema";
import { z } from "zod";
import { format } from 'date-fns';

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);
  
  // Get all user transactions
  app.get("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const userId = req.user!.id;
    const transactions = await storage.getTransactions(userId);
    res.json(transactions);
  });
  
  // Get transaction by ID
  app.get("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const transactionId = parseInt(req.params.id);
    if (isNaN(transactionId)) return res.status(400).json({ message: "Invalid transaction ID" });
    
    const transaction = await storage.getTransactionById(transactionId);
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    
    // Check if transaction belongs to requesting user
    if (transaction.userId !== req.user!.id) 
      return res.status(403).json({ message: "Access denied" });
    
    res.json(transaction);
  });
  
  // Create new transaction
  app.post("/api/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const transactionData = insertTransactionSchema.parse({
        ...req.body,
        userId
      });
      
      // Validate that category exists and belongs to user
      const category = await storage.getCategoryById(transactionData.categoryId);
      if (!category) return res.status(400).json({ message: "Invalid category" });
      if (category.userId !== userId && category.userId !== 0) 
        return res.status(403).json({ message: "Access denied to this category" });
      
      const newTransaction = await storage.createTransaction(transactionData);
      res.status(201).json(newTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });
  
  // Update transaction
  app.put("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const transactionId = parseInt(req.params.id);
    if (isNaN(transactionId)) return res.status(400).json({ message: "Invalid transaction ID" });
    
    const transaction = await storage.getTransactionById(transactionId);
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    
    // Check if transaction belongs to requesting user
    if (transaction.userId !== req.user!.id) 
      return res.status(403).json({ message: "Access denied" });
    
    try {
      // Parse and validate update data
      const updateFields = req.body;
      
      // If categoryId is provided, check if valid
      if (updateFields.categoryId) {
        const category = await storage.getCategoryById(updateFields.categoryId);
        if (!category) return res.status(400).json({ message: "Invalid category" });
        if (category.userId !== req.user!.id && category.userId !== 0) 
          return res.status(403).json({ message: "Access denied to this category" });
      }
      
      const updatedTransaction = await storage.updateTransaction(transactionId, updateFields);
      res.json(updatedTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid transaction data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update transaction" });
    }
  });
  
  // Delete transaction
  app.delete("/api/transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const transactionId = parseInt(req.params.id);
    if (isNaN(transactionId)) return res.status(400).json({ message: "Invalid transaction ID" });
    
    const transaction = await storage.getTransactionById(transactionId);
    if (!transaction) return res.status(404).json({ message: "Transaction not found" });
    
    // Check if transaction belongs to requesting user
    if (transaction.userId !== req.user!.id) 
      return res.status(403).json({ message: "Access denied" });
    
    const success = await storage.deleteTransaction(transactionId);
    if (success) {
      res.status(204).send();
    } else {
      res.status(500).json({ message: "Failed to delete transaction" });
    }
  });
  
  // Categories
  
  // Get all user categories
  app.get("/api/categories", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const userId = req.user!.id;
    const userCategories = await storage.getCategories(userId);
    
    // Also get default categories (userId = 0)
    const defaultCategories = await storage.getCategories(0);
    
    // Combine user's categories with default categories
    const categories = [...userCategories, ...defaultCategories];
    res.json(categories);
  });
  
  // Create new category
  app.post("/api/categories", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const categoryData = insertCategorySchema.parse({
        ...req.body,
        userId
      });
      
      const newCategory = await storage.createCategory(categoryData);
      res.status(201).json(newCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create category" });
    }
  });
  
  // Update category
  app.put("/api/categories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const categoryId = parseInt(req.params.id);
    if (isNaN(categoryId)) return res.status(400).json({ message: "Invalid category ID" });
    
    const category = await storage.getCategoryById(categoryId);
    if (!category) return res.status(404).json({ message: "Category not found" });
    
    // Check if category belongs to requesting user
    if (category.userId !== req.user!.id) 
      return res.status(403).json({ message: "Access denied" });
    
    try {
      const updateFields = req.body;
      const updatedCategory = await storage.updateCategory(categoryId, updateFields);
      res.json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid category data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update category" });
    }
  });
  
  // Delete category
  app.delete("/api/categories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const categoryId = parseInt(req.params.id);
    if (isNaN(categoryId)) return res.status(400).json({ message: "Invalid category ID" });
    
    const category = await storage.getCategoryById(categoryId);
    if (!category) return res.status(404).json({ message: "Category not found" });
    
    // Check if category belongs to requesting user
    if (category.userId !== req.user!.id) 
      return res.status(403).json({ message: "Access denied" });
    
    const success = await storage.deleteCategory(categoryId);
    if (success) {
      res.status(204).send();
    } else {
      res.status(500).json({ message: "Failed to delete category" });
    }
  });
  
  // Budgets
  
  // Get all user budgets
  app.get("/api/budgets", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const userId = req.user!.id;
    const budgets = await storage.getBudgets(userId);
    res.json(budgets);
  });
  
  // Create new budget
  app.post("/api/budgets", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const budgetData = insertBudgetSchema.parse({
        ...req.body,
        userId
      });
      
      // Validate that category exists and belongs to user
      const category = await storage.getCategoryById(budgetData.categoryId);
      if (!category) return res.status(400).json({ message: "Invalid category" });
      if (category.userId !== userId && category.userId !== 0) 
        return res.status(403).json({ message: "Access denied to this category" });
      
      const newBudget = await storage.createBudget(budgetData);
      res.status(201).json(newBudget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid budget data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create budget" });
    }
  });
  
  // Update budget
  app.put("/api/budgets/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const budgetId = parseInt(req.params.id);
    if (isNaN(budgetId)) return res.status(400).json({ message: "Invalid budget ID" });
    
    const budget = await storage.getBudgetById(budgetId);
    if (!budget) return res.status(404).json({ message: "Budget not found" });
    
    // Check if budget belongs to requesting user
    if (budget.userId !== req.user!.id) 
      return res.status(403).json({ message: "Access denied" });
    
    try {
      const updateFields = req.body;
      
      // If categoryId is provided, check if valid
      if (updateFields.categoryId) {
        const category = await storage.getCategoryById(updateFields.categoryId);
        if (!category) return res.status(400).json({ message: "Invalid category" });
        if (category.userId !== req.user!.id && category.userId !== 0) 
          return res.status(403).json({ message: "Access denied to this category" });
      }
      
      const updatedBudget = await storage.updateBudget(budgetId, updateFields);
      res.json(updatedBudget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid budget data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update budget" });
    }
  });
  
  // Delete budget
  app.delete("/api/budgets/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const budgetId = parseInt(req.params.id);
    if (isNaN(budgetId)) return res.status(400).json({ message: "Invalid budget ID" });
    
    const budget = await storage.getBudgetById(budgetId);
    if (!budget) return res.status(404).json({ message: "Budget not found" });
    
    // Check if budget belongs to requesting user
    if (budget.userId !== req.user!.id) 
      return res.status(403).json({ message: "Access denied" });
    
    const success = await storage.deleteBudget(budgetId);
    if (success) {
      res.status(204).send();
    } else {
      res.status(500).json({ message: "Failed to delete budget" });
    }
  });
  
  // Financial summary data
  app.get("/api/summary", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const userId = req.user!.id;
    const transactions = await storage.getTransactions(userId);
    
    // Calculate income, expenses, and balance
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const balance = totalIncome - totalExpenses;
    
    // Group expenses by category
    const expensesByCategory = transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        const categoryId = t.categoryId;
        acc[categoryId] = (acc[categoryId] || 0) + t.amount;
        return acc;
      }, {} as Record<number, number>);
    
    // Group transactions by month
    const monthlyData = transactions.reduce((acc, t) => {
      // Extract month and year from transaction date
      const date = new Date(t.date);
      const month = date.getMonth();
      const year = date.getFullYear();
      const key = `${year}-${month}`;
      
      if (!acc[key]) {
        acc[key] = { 
          month, 
          year, 
          income: 0, 
          expenses: 0 
        };
      }
      
      if (t.type === 'income') {
        acc[key].income += t.amount;
      } else {
        acc[key].expenses += t.amount;
      }
      
      return acc;
    }, {} as Record<string, {month: number, year: number, income: number, expenses: number}>);
    
    res.json({
      totalIncome,
      totalExpenses,
      balance,
      expensesByCategory,
      monthlyData: Object.values(monthlyData).sort((a, b) => {
        // Sort by year and month (descending)
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      })
    });
  });

  // Recurring Transactions
  
  // Get all user recurring transactions
  app.get("/api/recurring-transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const userId = req.user!.id;
    const recurringTransactions = await storage.getRecurringTransactions(userId);
    res.json(recurringTransactions);
  });
  
  // Get recurring transaction by ID
  app.get("/api/recurring-transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const recurringTransactionId = parseInt(req.params.id);
    if (isNaN(recurringTransactionId)) return res.status(400).json({ message: "Invalid recurring transaction ID" });
    
    const recurringTransaction = await storage.getRecurringTransactionById(recurringTransactionId);
    if (!recurringTransaction) return res.status(404).json({ message: "Recurring transaction not found" });
    
    // Check if recurring transaction belongs to requesting user
    if (recurringTransaction.userId !== req.user!.id) 
      return res.status(403).json({ message: "Access denied" });
    
    res.json(recurringTransaction);
  });
  
  // Create new recurring transaction
  app.post("/api/recurring-transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const recurringTransactionData = insertRecurringTransactionSchema.parse({
        ...req.body,
        userId
      });
      
      // Validate that category exists and belongs to user
      const category = await storage.getCategoryById(recurringTransactionData.categoryId);
      if (!category) return res.status(400).json({ message: "Invalid category" });
      if (category.userId !== userId && category.userId !== 0) 
        return res.status(403).json({ message: "Access denied to this category" });
      
      // Set isActive to true by default if not provided
      if (recurringTransactionData.isActive === undefined) {
        recurringTransactionData.isActive = true;
      }
      
      // Validate frequency-specific fields
      switch (recurringTransactionData.frequency) {
        case 'weekly':
          if (recurringTransactionData.dayOfWeek === null || recurringTransactionData.dayOfWeek === undefined) {
            return res.status(400).json({ message: "Day of week is required for weekly recurring transactions" });
          }
          if (recurringTransactionData.dayOfWeek < 0 || recurringTransactionData.dayOfWeek > 6) {
            return res.status(400).json({ message: "Day of week must be between 0 (Sunday) and 6 (Saturday)" });
          }
          break;
        case 'monthly':
          if (recurringTransactionData.dayOfMonth === null || recurringTransactionData.dayOfMonth === undefined) {
            return res.status(400).json({ message: "Day of month is required for monthly recurring transactions" });
          }
          if (recurringTransactionData.dayOfMonth < 1 || recurringTransactionData.dayOfMonth > 31) {
            return res.status(400).json({ message: "Day of month must be between 1 and 31" });
          }
          break;
      }
      
      const newRecurringTransaction = await storage.createRecurringTransaction(recurringTransactionData);
      res.status(201).json(newRecurringTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid recurring transaction data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create recurring transaction" });
    }
  });
  
  // Update recurring transaction
  app.put("/api/recurring-transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const recurringTransactionId = parseInt(req.params.id);
    if (isNaN(recurringTransactionId)) return res.status(400).json({ message: "Invalid recurring transaction ID" });
    
    const recurringTransaction = await storage.getRecurringTransactionById(recurringTransactionId);
    if (!recurringTransaction) return res.status(404).json({ message: "Recurring transaction not found" });
    
    // Check if recurring transaction belongs to requesting user
    if (recurringTransaction.userId !== req.user!.id) 
      return res.status(403).json({ message: "Access denied" });
    
    try {
      // Parse and validate update data
      const updateFields = req.body;
      
      // If categoryId is provided, check if valid
      if (updateFields.categoryId) {
        const category = await storage.getCategoryById(updateFields.categoryId);
        if (!category) return res.status(400).json({ message: "Invalid category" });
        if (category.userId !== req.user!.id && category.userId !== 0) 
          return res.status(403).json({ message: "Access denied to this category" });
      }
      
      // Validate frequency-specific fields if frequency is being updated
      if (updateFields.frequency) {
        switch (updateFields.frequency) {
          case 'weekly':
            if (updateFields.dayOfWeek === null || updateFields.dayOfWeek === undefined) {
              return res.status(400).json({ message: "Day of week is required for weekly recurring transactions" });
            }
            if (updateFields.dayOfWeek < 0 || updateFields.dayOfWeek > 6) {
              return res.status(400).json({ message: "Day of week must be between 0 (Sunday) and 6 (Saturday)" });
            }
            break;
          case 'monthly':
            if (updateFields.dayOfMonth === null || updateFields.dayOfMonth === undefined) {
              return res.status(400).json({ message: "Day of month is required for monthly recurring transactions" });
            }
            if (updateFields.dayOfMonth < 1 || updateFields.dayOfMonth > 31) {
              return res.status(400).json({ message: "Day of month must be between 1 and 31" });
            }
            break;
        }
      }
      
      const updatedRecurringTransaction = await storage.updateRecurringTransaction(recurringTransactionId, updateFields);
      res.json(updatedRecurringTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid recurring transaction data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update recurring transaction" });
    }
  });
  
  // Delete recurring transaction
  app.delete("/api/recurring-transactions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    const recurringTransactionId = parseInt(req.params.id);
    if (isNaN(recurringTransactionId)) return res.status(400).json({ message: "Invalid recurring transaction ID" });
    
    const recurringTransaction = await storage.getRecurringTransactionById(recurringTransactionId);
    if (!recurringTransaction) return res.status(404).json({ message: "Recurring transaction not found" });
    
    // Check if recurring transaction belongs to requesting user
    if (recurringTransaction.userId !== req.user!.id) 
      return res.status(403).json({ message: "Access denied" });
    
    const success = await storage.deleteRecurringTransaction(recurringTransactionId);
    if (success) {
      res.status(204).send();
    } else {
      res.status(500).json({ message: "Failed to delete recurring transaction" });
    }
  });
  
  // Manually trigger processing of recurring transactions (admin feature)
  app.post("/api/recurring-transactions/process", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const numCreated = await storage.processRecurringTransactions();
      res.json({ 
        success: true, 
        transactionsCreated: numCreated,
        message: `Successfully processed recurring transactions (${numCreated} created)`
      });
    } catch (error) {
      console.error("Error processing recurring transactions:", error);
      res.status(500).json({ 
        success: false, 
        message: "Failed to process recurring transactions" 
      });
    }
  });

  // Export functionalities
  
  // Helper function to generate CSV data
  function generateCSV(data: any[], headers: string[]): string {
    // Create CSV header
    let csv = headers.join(',') + '\n';
    
    // Add rows
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Handle values with commas by wrapping in quotes
        if (value && typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value !== undefined && value !== null ? value : '';
      });
      csv += values.join(',') + '\n';
    });
    
    return csv;
  }

  // Helper to set CSV response headers
  function setCsvResponseHeaders(res: Response, filename: string): void {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  }

  // Export transactions as CSV
  app.get("/api/export/transactions", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const transactions = await storage.getTransactions(userId);
      
      // Get category information for each transaction
      const transactionsWithCategories = await Promise.all(
        transactions.map(async transaction => {
          const category = await storage.getCategoryById(transaction.categoryId);
          return {
            id: transaction.id,
            date: format(new Date(transaction.date), 'yyyy-MM-dd'),
            type: transaction.type,
            amount: transaction.amount,
            description: transaction.description,
            category: category?.name || 'Unknown',
            notes: transaction.notes || ''
          };
        })
      );
      
      const headers = ['id', 'date', 'type', 'amount', 'description', 'category', 'notes'];
      const csv = generateCSV(transactionsWithCategories, headers);
      
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      setCsvResponseHeaders(res, `transactions_${currentDate}.csv`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting transactions:", error);
      res.status(500).json({ message: "Failed to export transactions" });
    }
  });

  // Export monthly report as CSV
  app.get("/api/export/monthly-report", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const transactions = await storage.getTransactions(userId);
      
      // Group by month and category
      const monthlyReport: any[] = [];
      const monthlyData: Record<string, {
        month: string,
        year: number,
        categories: Record<number, { 
          income: number, 
          expense: number, 
          name: string 
        }>
      }> = {};
      
      // Get all categories
      const allCategories = await storage.getCategories(userId);
      const systemUser = await storage.getUserByUsername("system_default");
      let defaultCategories: any[] = [];
      if (systemUser) {
        defaultCategories = await storage.getCategories(systemUser.id);
      }
      const categories = [...allCategories, ...defaultCategories];
      
      // Process transactions
      for (const transaction of transactions) {
        const date = new Date(transaction.date);
        const monthYear = format(date, 'yyyy-MM');
        const monthName = format(date, 'MMMM yyyy');
        
        if (!monthlyData[monthYear]) {
          monthlyData[monthYear] = {
            month: monthName,
            year: date.getFullYear(),
            categories: {}
          };
        }
        
        const categoryId = transaction.categoryId;
        if (!monthlyData[monthYear].categories[categoryId]) {
          const category = categories.find(c => c.id === categoryId);
          monthlyData[monthYear].categories[categoryId] = {
            income: 0,
            expense: 0,
            name: category?.name || 'Unknown'
          };
        }
        
        if (transaction.type === 'income') {
          monthlyData[monthYear].categories[categoryId].income += transaction.amount;
        } else {
          monthlyData[monthYear].categories[categoryId].expense += transaction.amount;
        }
      }
      
      // Format into rows for CSV
      Object.entries(monthlyData).forEach(([monthYear, data]) => {
        Object.entries(data.categories).forEach(([categoryId, catData]) => {
          monthlyReport.push({
            month: data.month,
            year: data.year,
            category: catData.name,
            income: catData.income,
            expense: catData.expense,
            net: catData.income - catData.expense
          });
        });
      });
      
      const headers = ['month', 'year', 'category', 'income', 'expense', 'net'];
      const csv = generateCSV(monthlyReport, headers);
      
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      setCsvResponseHeaders(res, `monthly_report_${currentDate}.csv`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting monthly report:", error);
      res.status(500).json({ message: "Failed to export monthly report" });
    }
  });

  // Export yearly report as CSV
  app.get("/api/export/yearly-report", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    
    try {
      const userId = req.user!.id;
      const transactions = await storage.getTransactions(userId);
      
      // Group by year
      const yearlyData: Record<number, {
        income: number,
        expense: number,
        categories: Record<number, { 
          income: number, 
          expense: number,
          name: string 
        }>
      }> = {};
      
      // Get all categories
      const allCategories = await storage.getCategories(userId);
      const systemUser = await storage.getUserByUsername("system_default");
      let defaultCategories: any[] = [];
      if (systemUser) {
        defaultCategories = await storage.getCategories(systemUser.id);
      }
      const categories = [...allCategories, ...defaultCategories];
      
      // Process transactions
      for (const transaction of transactions) {
        const date = new Date(transaction.date);
        const year = date.getFullYear();
        
        if (!yearlyData[year]) {
          yearlyData[year] = {
            income: 0,
            expense: 0,
            categories: {}
          };
        }
        
        const categoryId = transaction.categoryId;
        if (!yearlyData[year].categories[categoryId]) {
          const category = categories.find(c => c.id === categoryId);
          yearlyData[year].categories[categoryId] = {
            income: 0,
            expense: 0,
            name: category?.name || 'Unknown'
          };
        }
        
        if (transaction.type === 'income') {
          yearlyData[year].income += transaction.amount;
          yearlyData[year].categories[categoryId].income += transaction.amount;
        } else {
          yearlyData[year].expense += transaction.amount;
          yearlyData[year].categories[categoryId].expense += transaction.amount;
        }
      }
      
      // Format into rows for CSV - yearly summary first
      const yearlyReport: any[] = [];
      
      Object.entries(yearlyData).forEach(([year, data]) => {
        yearlyReport.push({
          year: parseInt(year),
          category: 'TOTAL',
          income: data.income,
          expense: data.expense,
          savings: data.income - data.expense,
          savingsRate: data.income > 0 ? ((data.income - data.expense) / data.income * 100).toFixed(2) + '%' : '0%'
        });
        
        // Then category breakdown for each year
        Object.entries(data.categories).forEach(([categoryId, catData]) => {
          yearlyReport.push({
            year: parseInt(year),
            category: catData.name,
            income: catData.income,
            expense: catData.expense,
            net: catData.income - catData.expense,
            percentOfTotal: data.expense > 0 && catData.expense > 0 
              ? ((catData.expense / data.expense) * 100).toFixed(2) + '%' 
              : '0%'
          });
        });
      });
      
      const headers = ['year', 'category', 'income', 'expense', 'savings', 'savingsRate', 'net', 'percentOfTotal'];
      const csv = generateCSV(yearlyReport, headers);
      
      const currentDate = format(new Date(), 'yyyy-MM-dd');
      setCsvResponseHeaders(res, `yearly_report_${currentDate}.csv`);
      res.send(csv);
    } catch (error) {
      console.error("Error exporting yearly report:", error);
      res.status(500).json({ message: "Failed to export yearly report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
