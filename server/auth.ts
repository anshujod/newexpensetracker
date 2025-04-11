import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema, Category } from "@shared/schema";
import { z } from "zod";
import { db } from "./db";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

// Helper function to copy default categories for a new user
async function copyDefaultCategoriesForNewUser(userId: number): Promise<void> {
  try {
    // Find the system user (created in DatabaseStorage seedDefaultCategories)
    const systemUser = await storage.getUserByUsername("system_default");
    
    if (!systemUser) {
      console.error("System user not found for default categories");
      return;
    }
    
    // Get all default categories from system user
    const defaultCategories = await storage.getCategories(systemUser.id);
    
    if (defaultCategories.length === 0) {
      console.error("No default categories found");
      return;
    }
    
    // Create copies of these categories for the new user
    const categoriesToCreate = defaultCategories.map(category => ({
      name: category.name,
      icon: category.icon,
      color: category.color,
      type: category.type,
      userId: userId
    }));
    
    // Insert all categories for the new user
    for (const category of categoriesToCreate) {
      await storage.createCategory(category);
    }
    
    console.log(`Created ${categoriesToCreate.length} default categories for user ${userId}`);
  } catch (error) {
    console.error("Error copying default categories:", error);
  }
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "expense-tracker-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint with validation
  app.post("/api/register", async (req, res, next) => {
    try {
      // Extend the schema with additional validation
      const registerSchema = insertUserSchema.extend({
        password: z.string().min(8, "Password must be at least 8 characters long"),
        email: z.string().email("Invalid email address"),
      });
      
      // Validate input data
      const userData = registerSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(userData.password);
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Create default categories for the new user
      await copyDefaultCategoriesForNewUser(user.id);
      
      // Auto-login after registration
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid registration data", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: SelectUser | false, info: { message?: string }) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid username or password" });
      }
      req.login(user, (err: any) => {
        if (err) return next(err);
        
        if (user) {
          // Return user without password
          const { password, ...userWithoutPassword } = user as SelectUser;
          res.status(200).json(userWithoutPassword);
        }
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err: any) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });
}
