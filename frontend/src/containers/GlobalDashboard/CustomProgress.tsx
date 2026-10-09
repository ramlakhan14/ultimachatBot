import React, { useState, useEffect } from "react";
import "./progress.css";

export default function CustomProgressBar({ loading }: any) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: any;

    if (loading) {
      setProgress(0);

      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev < 90) return prev + 1.5; // slow smooth fill
          return prev; // stop at 90%
        });
      }, 800);
    } else {
      // When API finishes → instantly go to 100%
      setProgress(100);

      setTimeout(() => {
        setProgress(0);
      }, 2000);
    }

    return () => clearInterval(interval);
  }, [loading]);

  return (
    <div className="progress-container">
      <div
        className="progress-fill"
        style={{ width: `${progress}%` }}
      ></div>

      <div
        className="red-dot"
        style={{ left: `${progress}%` }}
      ></div>
    </div>
  );
}
