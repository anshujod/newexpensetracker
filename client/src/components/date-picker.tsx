import { useState, useEffect, useRef } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { 
  addMonths, 
  subMonths,
  format,
  startOfMonth,
  endOfMonth,
  isToday
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DatePickerProps {
  date: Date;
  setDate: (date: Date) => void;
  onClose: () => void;
}

export default function DatePicker({ date, setDate, onClose }: DatePickerProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(date);
  const [currentMonth, setCurrentMonth] = useState<Date>(date);
  const datePickerRef = useRef<HTMLDivElement>(null);
  
  // Close date picker when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(prevMonth => subMonths(prevMonth, 1));
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(prevMonth => addMonths(prevMonth, 1));
  };
  
  // Change month and close picker
  const handleMonthSelect = (date: Date) => {
    setSelectedDate(date);
    setDate(date);
    onClose();
  };
  
  // Quick select buttons for common periods
  const quickSelect = [
    { 
      label: "This Month",
      action: () => handleMonthSelect(startOfMonth(new Date()))
    },
    { 
      label: "Previous Month",
      action: () => handleMonthSelect(startOfMonth(subMonths(new Date(), 1)))
    },
    { 
      label: "Next Month",
      action: () => handleMonthSelect(startOfMonth(addMonths(new Date(), 1)))
    }
  ];
  
  return (
    <Card 
      ref={datePickerRef}
      className="absolute right-0 top-10 z-50 w-auto p-3 shadow-lg"
    >
      <div className="mb-2 flex justify-between items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPreviousMonth}
          className="h-7 w-7"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous month</span>
        </Button>
        
        <div className="text-sm font-medium">
          {format(currentMonth, "MMMM yyyy")}
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={goToNextMonth}
          className="h-7 w-7"
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next month</span>
        </Button>
      </div>
      
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={(date) => date && handleMonthSelect(startOfMonth(date))}
        month={currentMonth}
        onMonthChange={setCurrentMonth}
        className="border-none p-0"
        disabled={(date) => date > endOfMonth(addMonths(new Date(), 12))}
      />
      
      <div className="mt-2 flex flex-wrap gap-1">
        {quickSelect.map((item, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={item.action}
            className="text-xs"
          >
            {item.label}
          </Button>
        ))}
      </div>
    </Card>
  );
}
