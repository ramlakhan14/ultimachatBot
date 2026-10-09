import React, { createContext, useState, ReactNode } from 'react';

// Define an interface for the logged in data
interface CalendarLoggedInData {
  // Add specific properties you expect to have
  name?: string;
  email?: string;
  // ... other properties
  [key: string]: any; // For other dynamic properties
}

// Update the context type
interface CalendarContextType {
  calendarLoggedinData: CalendarLoggedInData;
  setCalendarLoggedinData: React.Dispatch<React.SetStateAction<CalendarLoggedInData>>;
}

// Create context with initial null value
const CalendarContext = createContext<CalendarContextType | null>(null);

// Create a custom hook for using the context
export const useCalendarContext = () => {
  const context = React.useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendarContext must be used within a CalendarProvider');
  }
  return context;
};

// Provider component
export const CalendarProvider = ({ children }: { children: ReactNode }) => {
  const [calendarLoggedinData, setCalendarLoggedinData] = useState<CalendarLoggedInData>({});

  return (
    <CalendarContext.Provider value={{ calendarLoggedinData, setCalendarLoggedinData }}>
      {children}
    </CalendarContext.Provider>
  );
};

export default CalendarContext;