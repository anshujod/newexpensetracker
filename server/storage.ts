import { users, type User, type InsertUser, categories, type Category, type InsertCategory, transactions, type Transaction, type InsertTransaction, budgets, type Budget, type InsertBudget, recurringTransactions, type RecurringTransaction, type InsertRecurringTransaction } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import { Store } from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import { pool } from "./db";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Category methods
  getCategories(userId: number): Promise<Category[]>;
  getCategoryById(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  // Transaction methods
  getTransactions(userId: number): Promise<Transaction[]>;
  getTransactionById(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  deleteTransaction(id: number): Promise<boolean>;
  
  // Budget methods
  getBudgets(userId: number): Promise<Budget[]>;
  getBudgetById(id: number): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, budget: Partial<InsertBudget>): Promise<Budget | undefined>;
  deleteBudget(id: number): Promise<boolean>;
  
  // Recurring Transaction methods
  getRecurringTransactions(userId: number): Promise<RecurringTransaction[]>;
  getRecurringTransactionById(id: number): Promise<RecurringTransaction | undefined>;
  createRecurringTransaction(recurringTransaction: InsertRecurringTransaction): Promise<RecurringTransaction>;
  updateRecurringTransaction(id: number, recurringTransaction: Partial<InsertRecurringTransaction>): Promise<RecurringTransaction | undefined>;
  deleteRecurringTransaction(id: number): Promise<boolean>;
  processRecurringTransactions(): Promise<number>; // Returns number of transactions created
  
  // Session store
  sessionStore: Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private transactions: Map<number, Transaction>;
  private budgets: Map<number, Budget>;
  private recurringTransactions: Map<number, RecurringTransaction>;
  private currentUserId: number;
  private currentCategoryId: number;
  private currentTransactionId: number;
  private currentBudgetId: number;
  private currentRecurringTransactionId: number;
  sessionStore: Store;

  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.transactions = new Map();
    this.budgets = new Map();
    this.recurringTransactions = new Map();
    this.currentUserId = 1;
    this.currentCategoryId = 1;
    this.currentTransactionId = 1;
    this.currentBudgetId = 1;
    this.currentRecurringTransactionId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Add some default categories when initialized
    this.seedDefaultCategories();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const createdAt = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt, 
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null
    };
    this.users.set(id, user);
    return user;
  }

  // Category methods
  async getCategories(userId: number): Promise<Category[]> {
    return Array.from(this.categories.values()).filter(
      (category) => category.userId === userId
    );
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }

  async updateCategory(id: number, categoryUpdate: Partial<InsertCategory>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;
    
    const updatedCategory = { ...category, ...categoryUpdate };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    return this.categories.delete(id);
  }

  // Transaction methods
  async getTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(transaction => transaction.userId === userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getTransactionById(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    const createdAt = new Date();
    
    // If date is a Date object, convert it to string
    let dateStr = transaction.date;
    if (typeof transaction.date === 'object' && transaction.date) {
      try {
        const dateObj = transaction.date as Date;
        if (typeof dateObj.toISOString === 'function') {
          dateStr = dateObj.toISOString().split('T')[0];
        }
      } catch (error) {
        console.error("Error converting date:", error);
      }
    }
    
    const newTransaction: Transaction = { 
      ...transaction, 
      id, 
      createdAt,
      date: dateStr,
      notes: transaction.notes || null
    };
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }

  async updateTransaction(id: number, transactionUpdate: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    
    const updatedTransaction = { ...transaction, ...transactionUpdate };
    this.transactions.set(id, updatedTransaction);
    return updatedTransaction;
  }

  async deleteTransaction(id: number): Promise<boolean> {
    return this.transactions.delete(id);
  }

  // Budget methods
  async getBudgets(userId: number): Promise<Budget[]> {
    return Array.from(this.budgets.values()).filter(
      (budget) => budget.userId === userId
    );
  }

  async getBudgetById(id: number): Promise<Budget | undefined> {
    return this.budgets.get(id);
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const id = this.currentBudgetId++;
    const createdAt = new Date();
    const newBudget: Budget = { ...budget, id, createdAt };
    this.budgets.set(id, newBudget);
    return newBudget;
  }

  async updateBudget(id: number, budgetUpdate: Partial<InsertBudget>): Promise<Budget | undefined> {
    const budget = this.budgets.get(id);
    if (!budget) return undefined;
    
    const updatedBudget = { ...budget, ...budgetUpdate };
    this.budgets.set(id, updatedBudget);
    return updatedBudget;
  }

  async deleteBudget(id: number): Promise<boolean> {
    return this.budgets.delete(id);
  }

  // Recurring Transaction methods
  async getRecurringTransactions(userId: number): Promise<RecurringTransaction[]> {
    return Array.from(this.recurringTransactions.values()).filter(
      (recurringTransaction) => recurringTransaction.userId === userId
    );
  }

  async getRecurringTransactionById(id: number): Promise<RecurringTransaction | undefined> {
    return this.recurringTransactions.get(id);
  }

  async createRecurringTransaction(recurringTransaction: InsertRecurringTransaction): Promise<RecurringTransaction> {
    const id = this.currentRecurringTransactionId++;
    const createdAt = new Date();
    const newRecurringTransaction: RecurringTransaction = { 
      ...recurringTransaction, 
      id, 
      createdAt,
      lastProcessedDate: null,
      notes: recurringTransaction.notes || null,
      endDate: recurringTransaction.endDate || null,
      dayOfMonth: recurringTransaction.dayOfMonth || null,
      dayOfWeek: recurringTransaction.dayOfWeek || null,
      isActive: recurringTransaction.isActive !== undefined ? recurringTransaction.isActive : true
    };
    this.recurringTransactions.set(id, newRecurringTransaction);
    return newRecurringTransaction;
  }

  async updateRecurringTransaction(id: number, recurringTransactionUpdate: Partial<InsertRecurringTransaction>): Promise<RecurringTransaction | undefined> {
    const recurringTransaction = this.recurringTransactions.get(id);
    if (!recurringTransaction) return undefined;
    
    const updatedRecurringTransaction = { ...recurringTransaction, ...recurringTransactionUpdate };
    this.recurringTransactions.set(id, updatedRecurringTransaction);
    return updatedRecurringTransaction;
  }

  async deleteRecurringTransaction(id: number): Promise<boolean> {
    return this.recurringTransactions.delete(id);
  }

  async processRecurringTransactions(): Promise<number> {
    // This is a simplified version for the memory implementation
    // In a real implementation, we would handle all frequencies properly
    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize to start of day for date comparisons
    let transactionsCreated = 0;
    
    const allRecurringTransactions = Array.from(this.recurringTransactions.values())
      .filter(rt => rt.isActive);
      
    for (const rt of allRecurringTransactions) {
      // Skip if already processed today
      if (rt.lastProcessedDate && 
          new Date(rt.lastProcessedDate).toDateString() === today.toDateString()) {
        continue;
      }
      
      // Skip if end date is in the past
      if (rt.endDate && new Date(rt.endDate) < today) {
        continue;
      }
      
      // Skip if start date is in the future
      if (new Date(rt.startDate) > today) {
        continue;
      }
      
      // Check if we should process this recurring transaction today
      let shouldProcess = false;
      switch (rt.frequency) {
        case 'daily':
          shouldProcess = true;
          break;
        case 'weekly':
          if (rt.dayOfWeek !== null && rt.dayOfWeek === today.getDay()) {
            shouldProcess = true;
          }
          break;
        case 'monthly':
          if (rt.dayOfMonth !== null && rt.dayOfMonth === today.getDate()) {
            shouldProcess = true;
          }
          break;
        case 'yearly':
          const startDate = new Date(rt.startDate);
          if (startDate.getDate() === today.getDate() && 
              startDate.getMonth() === today.getMonth()) {
            shouldProcess = true;
          }
          break;
      }
      
      if (shouldProcess) {
        // Format the date as 'YYYY-MM-DD' for storage
        const formattedDate = today.toISOString().split('T')[0];
        
        // Create a new transaction based on the recurring transaction
        const transaction: InsertTransaction = {
          userId: rt.userId,
          type: rt.type,
          amount: rt.amount,
          description: rt.description,
          date: formattedDate,
          categoryId: rt.categoryId,
          notes: rt.notes
        };
        
        await this.createTransaction(transaction);
        
        // Update last processed date with formatted date string
        const updatedRt = { ...rt, lastProcessedDate: formattedDate };
        this.recurringTransactions.set(rt.id, updatedRt);
        
        transactionsCreated++;
      }
    }
    
    return transactionsCreated;
  }

  // Helper method to seed default categories
  private seedDefaultCategories() {
    const defaultCategories: InsertCategory[] = [
      { name: 'Housing', icon: 'ri-home-line', color: '#9333ea', type: 'expense', userId: 0 },
      { name: 'Food & Dining', icon: 'ri-restaurant-line', color: '#3b82f6', type: 'expense', userId: 0 },
      { name: 'Transportation', icon: 'ri-car-line', color: '#10b981', type: 'expense', userId: 0 },
      { name: 'Utilities', icon: 'ri-lightbulb-line', color: '#f59e0b', type: 'expense', userId: 0 },
      { name: 'Entertainment', icon: 'ri-movie-line', color: '#ef4444', type: 'expense', userId: 0 },
      { name: 'Shopping', icon: 'ri-shopping-bag-line', color: '#ec4899', type: 'expense', userId: 0 },
      { name: 'Health', icon: 'ri-heart-pulse-line', color: '#14b8a6', type: 'expense', userId: 0 },
      { name: 'Personal', icon: 'ri-user-line', color: '#8b5cf6', type: 'expense', userId: 0 },
      { name: 'Education', icon: 'ri-book-line', color: '#f97316', type: 'expense', userId: 0 },
      { name: 'Salary', icon: 'ri-briefcase-line', color: '#22c55e', type: 'income', userId: 0 },
      { name: 'Investment', icon: 'ri-line-chart-line', color: '#6366f1', type: 'income', userId: 0 },
      { name: 'Gifts', icon: 'ri-gift-line', color: '#ec4899', type: 'income', userId: 0 },
      { name: 'Other Income', icon: 'ri-money-dollar-circle-line', color: '#64748b', type: 'income', userId: 0 }
    ];

    // Add default categories to storage
    defaultCategories.forEach((category) => {
      const id = this.currentCategoryId++;
      this.categories.set(id, { ...category, id });
    });
  }
}

// PostgreSQL implementation
export class DatabaseStorage implements IStorage {
  sessionStore: Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
    
    // Seed default categories if they don't exist
    this.seedDefaultCategories();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values({
      ...insertUser,
      createdAt: new Date(),
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null
    }).returning();
    
    return result[0];
  }

  // Category methods
  async getCategories(userId: number): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.userId, userId));
  }

  async getCategoryById(id: number): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  async updateCategory(id: number, categoryUpdate: Partial<InsertCategory>): Promise<Category | undefined> {
    const result = await db.update(categories)
      .set(categoryUpdate)
      .where(eq(categories.id, id))
      .returning();
    
    return result[0];
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return !!result;
  }

  // Transaction methods
  async getTransactions(userId: number): Promise<Transaction[]> {
    return db.select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
  }

  async getTransactionById(id: number): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.id, id));
    return result[0];
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values({
      ...transaction,
      createdAt: new Date(),
      notes: transaction.notes || null
    }).returning();
    
    return result[0];
  }

  async updateTransaction(id: number, transactionUpdate: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const result = await db.update(transactions)
      .set(transactionUpdate)
      .where(eq(transactions.id, id))
      .returning();
    
    return result[0];
  }

  async deleteTransaction(id: number): Promise<boolean> {
    const result = await db.delete(transactions).where(eq(transactions.id, id));
    return !!result;
  }

  // Budget methods
  async getBudgets(userId: number): Promise<Budget[]> {
    return db.select().from(budgets).where(eq(budgets.userId, userId));
  }

  async getBudgetById(id: number): Promise<Budget | undefined> {
    const result = await db.select().from(budgets).where(eq(budgets.id, id));
    return result[0];
  }

  async createBudget(budget: InsertBudget): Promise<Budget> {
    const result = await db.insert(budgets).values({
      ...budget,
      createdAt: new Date()
    }).returning();
    
    return result[0];
  }

  async updateBudget(id: number, budgetUpdate: Partial<InsertBudget>): Promise<Budget | undefined> {
    const result = await db.update(budgets)
      .set(budgetUpdate)
      .where(eq(budgets.id, id))
      .returning();
    
    return result[0];
  }

  async deleteBudget(id: number): Promise<boolean> {
    const result = await db.delete(budgets).where(eq(budgets.id, id));
    return !!result;
  }

  // Recurring Transaction methods
  async getRecurringTransactions(userId: number): Promise<RecurringTransaction[]> {
    return db.select()
      .from(recurringTransactions)
      .where(eq(recurringTransactions.userId, userId))
      .orderBy(desc(recurringTransactions.createdAt));
  }

  async getRecurringTransactionById(id: number): Promise<RecurringTransaction | undefined> {
    const result = await db.select().from(recurringTransactions).where(eq(recurringTransactions.id, id));
    return result[0];
  }

  async createRecurringTransaction(recurringTx: InsertRecurringTransaction): Promise<RecurringTransaction> {
    const result = await db.insert(recurringTransactions).values({
      ...recurringTx,
      createdAt: new Date(),
      lastProcessedDate: null,
      notes: recurringTx.notes || null,
      endDate: recurringTx.endDate || null,
      dayOfMonth: recurringTx.dayOfMonth || null,
      dayOfWeek: recurringTx.dayOfWeek || null,
      isActive: recurringTx.isActive !== undefined ? recurringTx.isActive : true
    }).returning();
    
    return result[0];
  }

  async updateRecurringTransaction(id: number, recurringTxUpdate: Partial<InsertRecurringTransaction>): Promise<RecurringTransaction | undefined> {
    const result = await db.update(recurringTransactions)
      .set(recurringTxUpdate)
      .where(eq(recurringTransactions.id, id))
      .returning();
    
    return result[0];
  }

  async deleteRecurringTransaction(id: number): Promise<boolean> {
    const result = await db.delete(recurringTransactions).where(eq(recurringTransactions.id, id));
    return !!result;
  }

  async processRecurringTransactions(): Promise<number> {
    // Get all active recurring transactions
    const allRecurringTxs = await db.select()
      .from(recurringTransactions)
      .where(eq(recurringTransactions.isActive, true));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize to start of day for date comparisons
    let transactionsCreated = 0;
    
    for (const rt of allRecurringTxs) {
      try {
        // Skip if already processed today
        if (rt.lastProcessedDate) {
          const lastProcessed = new Date(rt.lastProcessedDate);
          lastProcessed.setHours(0, 0, 0, 0);
          if (lastProcessed.getTime() === today.getTime()) {
            continue;
          }
        }
        
        // Skip if end date is in the past
        if (rt.endDate && new Date(rt.endDate) < today) {
          continue;
        }
        
        // Skip if start date is in the future
        if (new Date(rt.startDate) > today) {
          continue;
        }
        
        // Check if we should process this recurring transaction today
        let shouldProcess = false;
        switch (rt.frequency) {
          case 'daily':
            shouldProcess = true;
            break;
          case 'weekly':
            if (rt.dayOfWeek !== null && rt.dayOfWeek === today.getDay()) {
              shouldProcess = true;
            }
            break;
          case 'monthly':
            if (rt.dayOfMonth !== null && rt.dayOfMonth === today.getDate()) {
              shouldProcess = true;
            }
            break;
          case 'yearly':
            const startDate = new Date(rt.startDate);
            if (startDate.getDate() === today.getDate() && 
                startDate.getMonth() === today.getMonth()) {
              shouldProcess = true;
            }
            break;
        }
        
        if (shouldProcess) {
          // Format the date as 'YYYY-MM-DD' for PostgreSQL
          const formattedDate = today.toISOString().split('T')[0];
          
          // Create a transaction
          const transaction: InsertTransaction = {
            userId: rt.userId,
            type: rt.type,
            amount: rt.amount,
            description: rt.description,
            date: formattedDate,
            categoryId: rt.categoryId,
            notes: rt.notes
          };
          
          await this.createTransaction(transaction);
          
          // Update last processed date - format as 'YYYY-MM-DD' for PostgreSQL
          await db.update(recurringTransactions)
            .set({ lastProcessedDate: formattedDate })
            .where(eq(recurringTransactions.id, rt.id));
          
          transactionsCreated++;
        }
      } catch (error) {
        console.error(`Error processing recurring transaction ${rt.id}:`, error);
      }
    }
    
    return transactionsCreated;
  }
  
  // Helper method to seed default categories (only call this once)
  private async seedDefaultCategories() {
    try {
      // Check if we have a system user (for default categories)
      const systemUsername = "system_default";
      let systemUser = await this.getUserByUsername(systemUsername);
      
      // If system user doesn't exist, create it
      if (!systemUser) {
        // Create a system user for default categories
        systemUser = await this.createUser({
          username: systemUsername,
          password: "system_password_" + Math.random().toString(36).slice(2, 10),
          email: "system@example.com",
          firstName: "System",
          lastName: "User"
        });
        
        console.log("Created system user for default categories");
      }
      
      // Check if default categories exist for this user
      const existingCategories = await db.select().from(categories).where(eq(categories.userId, systemUser.id));
      
      if (existingCategories.length === 0) {
        // Define default categories with system user ID
        const defaultCategories: InsertCategory[] = [
          { name: 'Housing', icon: 'ri-home-line', color: '#9333ea', type: 'expense', userId: systemUser.id },
          { name: 'Food & Dining', icon: 'ri-restaurant-line', color: '#3b82f6', type: 'expense', userId: systemUser.id },
          { name: 'Transportation', icon: 'ri-car-line', color: '#10b981', type: 'expense', userId: systemUser.id },
          { name: 'Utilities', icon: 'ri-lightbulb-line', color: '#f59e0b', type: 'expense', userId: systemUser.id },
          { name: 'Entertainment', icon: 'ri-movie-line', color: '#ef4444', type: 'expense', userId: systemUser.id },
          { name: 'Shopping', icon: 'ri-shopping-bag-line', color: '#ec4899', type: 'expense', userId: systemUser.id },
          { name: 'Health', icon: 'ri-heart-pulse-line', color: '#14b8a6', type: 'expense', userId: systemUser.id },
          { name: 'Personal', icon: 'ri-user-line', color: '#8b5cf6', type: 'expense', userId: systemUser.id },
          { name: 'Education', icon: 'ri-book-line', color: '#f97316', type: 'expense', userId: systemUser.id },
          { name: 'Salary', icon: 'ri-briefcase-line', color: '#22c55e', type: 'income', userId: systemUser.id },
          { name: 'Investment', icon: 'ri-line-chart-line', color: '#6366f1', type: 'income', userId: systemUser.id },
          { name: 'Gifts', icon: 'ri-gift-line', color: '#ec4899', type: 'income', userId: systemUser.id },
          { name: 'Other Income', icon: 'ri-money-dollar-circle-line', color: '#64748b', type: 'income', userId: systemUser.id }
        ];
        
        // Insert default categories
        await db.insert(categories).values(defaultCategories);
        console.log("Added default categories");
      }
    } catch (error) {
      console.error("Error seeding default categories:", error);
    }
  }
}

// Use PostgreSQL for persistent storage
export const storage = new DatabaseStorage();
