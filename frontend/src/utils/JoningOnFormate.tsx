import React from 'react';
import { format } from 'date-fns';

const formatDateToCustomFormat = (date: string): string => {
  const formattedDate = format(new Date(date), 'dd/MM/yyyy, hh:mm a');
  return formattedDate;
};

interface MyComponentProps {
  date: string;
}

const JoningOnFormate: React.FC<MyComponentProps> = ({ date }) => {
  const formattedDate = formatDateToCustomFormat(date);

  return (
    <div>
      {formattedDate}
    </div>
  );
};

export default JoningOnFormate;
