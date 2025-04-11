import { useEffect, useRef } from 'react';
import { useTheme } from '@/hooks/use-theme';
import { Chart, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { format, isAfter, isBefore, subMonths } from 'date-fns';

Chart.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface MonthlyData {
  month: number;
  year: number;
  income: number;
  expenses: number;
}

interface IncomeExpenseChartProps {
  monthlyData: MonthlyData[];
}

export default function IncomeExpenseChart({ monthlyData }: IncomeExpenseChartProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const { theme } = useTheme();
  
  // Process monthly data
  const processChartData = () => {
    if (!monthlyData.length) {
      return {
        labels: [],
        incomeData: [],
        expenseData: []
      };
    }
    
    // Sort by date (ascending)
    const sortedData = [...monthlyData].sort((a, b) => {
      const dateA = new Date(a.year, a.month);
      const dateB = new Date(b.year, b.month);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Take only the last 6 months
    const recentData = sortedData.slice(-6);
    
    const labels = recentData.map(data => 
      format(new Date(data.year, data.month), 'MMM')
    );
    
    const incomeData = recentData.map(data => data.income);
    const expenseData = recentData.map(data => data.expenses);
    
    return { labels, incomeData, expenseData };
  };
  
  // Prepare data for chart
  const { labels, incomeData, expenseData } = processChartData();
  
  // Create or update chart
  useEffect(() => {
    if (!chartRef.current || !labels.length) return;
    
    // Destroy previous chart if it exists
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }
    
    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;
    
    // Chart text color based on theme
    const textColor = theme === 'dark' ? '#e2e8f0' : '#475569';
    const gridColor = theme === 'dark' ? 'rgba(226, 232, 240, 0.1)' : 'rgba(226, 232, 240, 0.5)';
    
    // Create new chart
    chartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Income',
            data: incomeData,
            backgroundColor: '#22c55e',
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.5
          },
          {
            label: 'Expenses',
            data: expenseData,
            backgroundColor: '#ef4444',
            borderRadius: 4,
            barPercentage: 0.6,
            categoryPercentage: 0.5
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: textColor,
              usePointStyle: true,
              padding: 20
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const value = context.raw as number;
                return `${context.dataset.label}: $${value.toFixed(2)}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: textColor
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: gridColor
            },
            ticks: {
              color: textColor,
              callback: function(value) {
                if (value === 0) return '$0';
                if (value >= 1000) return `$${value / 1000}k`;
                return `$${value}`;
              }
            }
          }
        }
      }
    });
    
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [labels, incomeData, expenseData, theme]);
  
  if (!monthlyData.length) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-muted-foreground text-sm">No data to display</p>
      </div>
    );
  }
  
  return (
    <div className="h-full">
      <div className="chart-container h-full">
        <canvas ref={chartRef}></canvas>
      </div>
    </div>
  );
}
