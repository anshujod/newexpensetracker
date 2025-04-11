import { useEffect, useRef } from 'react';
import { Transaction, Category } from '@shared/schema';
import { useTheme } from '@/hooks/use-theme';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';
import { Skeleton } from './skeleton';

Chart.register(ArcElement, Tooltip, Legend);

interface ExpenseChartProps {
  transactions: Transaction[];
  categories: Category[];
}

export default function ExpenseChart({ transactions, categories }: ExpenseChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { theme } = useTheme();
  
  // Process transactions data
  const processCategoryData = () => {
    if (!transactions.length || !categories.length) {
      return {
        categoryNames: [],
        categoryAmounts: [],
        categoryColors: [],
        totalExpense: 0
      };
    }
    
    // Group transactions by category
    const categoryTotals: Record<number, number> = {};
    transactions.forEach(transaction => {
      const currentAmount = categoryTotals[transaction.categoryId] || 0;
      categoryTotals[transaction.categoryId] = currentAmount + transaction.amount;
    });
    
    // Prepare data for chart
    const categoryData = Object.entries(categoryTotals).map(([categoryId, amount]) => {
      const category = categories.find(c => c.id === Number(categoryId));
      return {
        id: Number(categoryId),
        name: category?.name || 'Unknown',
        color: category?.color || '#ccc',
        amount
      };
    }).sort((a, b) => b.amount - a.amount);
    
    // Extract arrays for chart
    const categoryNames = categoryData.map(c => c.name);
    const categoryAmounts = categoryData.map(c => c.amount);
    const categoryColors = categoryData.map(c => c.color);
    const totalExpense = categoryAmounts.reduce((sum, amount) => sum + amount, 0);
    
    return { categoryNames, categoryAmounts, categoryColors, totalExpense };
  };
  
  // Prepare data for rendering
  const { categoryNames, categoryAmounts, categoryColors, totalExpense } = processCategoryData();
  
  // Create or update chart
  useEffect(() => {
    if (!chartRef.current || !categoryNames.length) return;
    
    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Chart text color based on theme
    const textColor = theme === 'dark' ? '#e2e8f0' : '#475569';
    
    // Create new chart
    chartInstance.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: categoryNames,
        datasets: [
          {
            data: categoryAmounts,
            backgroundColor: categoryColors,
            borderColor: theme === 'dark' ? '#1e293b' : '#ffffff',
            borderWidth: 2,
            hoverOffset: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.parsed;
                const percentage = ((value / totalExpense) * 100).toFixed(1);
                return `${context.label}: $${value.toFixed(2)} (${percentage}%)`;
              }
            }
          }
        },
        cutout: '70%'
      }
    });
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [categoryNames, categoryAmounts, categoryColors, totalExpense, theme]);
  
  if (!transactions.length || !categories.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No data to display</p>
      </div>
    );
  }
  
  return (
    <div className="h-60">
      <div className="chart-container h-full">
        <canvas ref={chartRef}></canvas>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-4">
        {categoryNames.slice(0, 4).map((name, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: categoryColors[index] }}></div>
            <div className="text-sm truncate">{name}</div>
            <div className="text-sm font-medium ml-auto">
              {((categoryAmounts[index] / totalExpense) * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
