import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertTransactionSchema, insertCategorySchema, insertBudgetSchema } from "@shared/schema";
import { z } from "zod";

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

  const httpServer = createServer(app);
  return httpServer;
}
