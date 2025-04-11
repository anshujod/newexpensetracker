import { useQuery, useMutation } from "@tanstack/react-query";
import { Sidebar } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun, User, LogOut } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Category } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  icon: z.string().min(1, "Icon is required"),
  color: z.string().min(1, "Color is required"),
  type: z.string().min(1, "Type is required"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

export default function Settings() {
  const { user, logoutMutation } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  
  // Fetch categories
  const { data: categories, isLoading: isLoadingCategories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });
  
  // Category form
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      icon: "ri-folder-line",
      color: "#3b82f6",
      type: "expense",
    },
  });
  
  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const res = await apiRequest("POST", "/api/categories", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Category created",
        description: "Your category has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      setIsAddCategoryOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create category",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/categories/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Category deleted",
        description: "Your category has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete category",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const onSubmit = (data: CategoryFormValues) => {
    createCategoryMutation.mutate(data);
  };
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  // Filter out default categories (userId = 0)
  const userCategories = categories?.filter(category => category.userId !== 0) || [];
  
  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar />
      
      <main className="flex-1 p-4 md:p-6">
        {/* Page Header */}
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400">Manage your account and preferences</p>
        </header>
        
        {/* Account Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
            <CardDescription>Manage your account settings and information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">Username</Label>
                <div className="font-medium">{user?.username}</div>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <div className="font-medium">{user?.email}</div>
              </div>
              {user?.firstName && (
                <div>
                  <Label className="text-sm text-muted-foreground">First Name</Label>
                  <div className="font-medium">{user.firstName}</div>
                </div>
              )}
              {user?.lastName && (
                <div>
                  <Label className="text-sm text-muted-foreground">Last Name</Label>
                  <div className="font-medium">{user.lastName}</div>
                </div>
              )}
            </div>
            
            <Separator />
            
            <Button 
              variant="destructive" 
              className="flex items-center gap-2"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4" />
              {logoutMutation.isPending ? "Logging out..." : "Log out"}
            </Button>
          </CardContent>
        </Card>
        
        {/* Appearance Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the appearance of the application</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <Label htmlFor="theme-toggle">Dark Mode</Label>
              </div>
              <Switch 
                id="theme-toggle" 
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Category Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Custom Categories</CardTitle>
              <CardDescription>Manage your transaction categories</CardDescription>
            </div>
            <Button onClick={() => setIsAddCategoryOpen(true)}>Add Category</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {userCategories.length === 0 ? (
                <p className="text-muted-foreground text-sm">You haven't created any custom categories yet.</p>
              ) : (
                userCategories.map(category => (
                  <div key={category.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: category.color }} />
                      <div className="font-medium">{category.name}</div>
                      <div className="text-xs text-muted-foreground">{category.type}</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive/80"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this category?')) {
                          deleteCategoryMutation.mutate(category.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>
      
      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create Custom Category</DialogTitle>
            <DialogDescription>
              Add a new category for your transactions.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Category name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <div className="flex gap-4">
                      <Button
                        type="button"
                        variant={field.value === "expense" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => field.onChange("expense")}
                      >
                        Expense
                      </Button>
                      <Button
                        type="button"
                        variant={field.value === "income" ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => field.onChange("income")}
                      >
                        Income
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <FormControl>
                      <Input placeholder="Icon class (e.g., ri-home-line)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Color</FormLabel>
                    <div className="flex gap-2 items-center">
                      <Input
                        type="color"
                        className="w-10 h-10 p-1"
                        {...field}
                      />
                      <Input
                        type="text"
                        placeholder="#000000"
                        className="flex-1"
                        {...field}
                      />
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={() => setIsAddCategoryOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createCategoryMutation.isPending}>
                  {createCategoryMutation.isPending ? "Creating..." : "Create Category"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
