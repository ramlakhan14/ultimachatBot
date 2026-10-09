// import React from 'react';
// import { format, formatDistanceToNow, intervalToDuration } from 'date-fns';

// const formatDateToRelativeTime = (date: string): string => {
//   const now = new Date();
//   const duration = intervalToDuration({ start: new Date(date), end: now });

//   if (duration.weeks && duration.weeks > 0) {
//     return `${duration.weeks}w ago`;
//   } else if (duration.days && duration.days > 0) {
//     return `${duration.days}d ago`;
//   } else if (duration.hours && duration.hours > 0) {
//     return `${duration.hours}h ago`;
//   } else if (duration.minutes && duration.minutes > 0) {
//     return `${duration.minutes}m ago`;
//   } else if (duration.seconds && duration.seconds > 0) {
//     return `${duration.seconds}s ago`;
//   } else {
//     return 'just now';
//   }
// };

// interface MyComponentProps {
//   date: string;
// }

// const MyComponent: React.FC<MyComponentProps> = ({ date }) => {

//   console.log(date,
//     // format(date, "dd/MM/yyyy"),
//     "date");

//   const relativeTime = formatDateToRelativeTime(date);

//   return (
//     <div style={{ color: "#6C757D" }}>
//       {relativeTime}
//     </div>
//   );
// };

import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

interface MyComponentProps {
  date: string;
}

const MyComponent: React.FC<MyComponentProps> = ({ date }) => {
  // Parse the input date string into a Date object
  const parsedDate = parseISO(date);

  // Validate the date
  if (!isValid(parsedDate)) {
    // console.error("Invalid date:", date);
    return <div style={{ color: "#6C757D" }}>Invalid date</div>;
  }

  // Format the date for debugging
  // console.log("Original date string:", date, "Formatted date:", format(parsedDate, "dd/MM/yyyy"));

  // Get the relative time string
  const relativeTime = formatDistanceToNow(parsedDate, { addSuffix: true });

  return (
    <div style={{ color: "#6C757D" }}>
      {relativeTime}
    </div>
  );
};

export default MyComponent;