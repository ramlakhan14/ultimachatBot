import React, { useState, useEffect } from 'react';
import './DatePicker.css';

const DatePicker = ({ getSelectTime, currentMonthSelected, meetings = [] }) => {
  const [currentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [currentDay, setCurrentDay] = useState(currentDate.getDate());
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());

  // Get the number of days in the current month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get the day of the week the month starts on (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Adjust day of week to start from Monday (0 = Monday, 6 = Sunday)
  const adjustDayOfWeek = (day) => {
    return day === 0 ? 6 : day - 1;
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
      currentMonthSelected(`${currentYear - 1}-12`); // December of previous year
    } else {
      setCurrentMonth(currentMonth - 1);
      // Add leading zero for months 1-9
      const monthToPass = String(currentMonth).padStart(2, '0');
      currentMonthSelected(`${currentYear}-${monthToPass}`);
    }
    setSelectedDate(null);
  };

  // Navigate to next month
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
      currentMonthSelected(`${currentYear + 1}-01`); // January of next year
    } else {
      setCurrentMonth(currentMonth + 1);
      // Add leading zero for months 1-9
      const monthToPass = String(currentMonth + 2).padStart(2, '0');
      currentMonthSelected(`${currentYear}-${monthToPass}`);
    }
    setSelectedDate(null);
  };

  // Handle date click
  const handleDateClick = (day) => {
    setSelectedDate(day);
    const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    getSelectTime(`${formattedDate} ${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`); // Send the selected date to the parent
  };

  // Generate month name
  const getMonthName = (month, currentYear) => {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    // currentMonthSelected(`${currentYear}-${month}`);
    return monthNames[month];
  };

  // Check if there's a meeting on a specific date
  // console.log(meetings, 'meetings');

  const hasMeeting = (day) => {
    const date = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // return meetings.some(meeting => {
    //   const meetingDate = new Date(meeting.startTime).toISOString().split('T')[0];
    //   return meetingDate === date;
    // });
    return meetings?.some(item => item?.date === date && item?.dot === true);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstDayOfMonth = adjustDayOfWeek(getFirstDayOfMonth(currentYear, currentMonth));

    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isCurrentDay = day === currentDay &&
        currentMonth === new Date().getMonth() &&
        currentYear === new Date().getFullYear();
      const meetingOnDay = hasMeeting(day);

      days.push(
        <div
          key={day}
          className={`calendar-day ${isCurrentDay ? 'current' : ''} ${selectedDate === day ? 'selected' : ''}`}
          onClick={() => handleDateClick(day)}
        >
          <div className="day-content">
            <span>{day}</span>
            {meetingOnDay && <div className="meeting-indicator"></div>}
          </div>
        </div>
      );
    }

    return days;
  };

  // useEffect(() => {
  //   const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate || currentDay).padStart(2, '0')}`;
  //   // if (meetings?.length > 0) {
  //   //   getSelectTime(`${formattedDate} ${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);
  //   // }
  // }, []);

  return (
    <div className="date-picker">
      <div className="calendar-header">
        <div className="month-navigation">
          <div className="current-month">{getMonthName(currentMonth, currentYear)} {currentYear}</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={goToPreviousMonth} className="nav-button">
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6.65685 1.23707L1 6.89392L6.65685 12.5508" stroke="#6C757D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button onClick={goToNextMonth} className="nav-button">
              <svg width="8" height="14" viewBox="0 0 8 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.34315 1.23707L7 6.89392L1.34315 12.5508" stroke="#6C757D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="weekdays">
          <div>Mo</div>
          <div>Tu</div>
          <div>We</div>
          <div>Th</div>
          <div>Fr</div>
          <div>Sa</div>
          <div>Su</div>
        </div>
      </div>
      <div className="calendar-grid">
        {generateCalendarDays()}
      </div>
    </div>
  );
};

export default DatePicker;