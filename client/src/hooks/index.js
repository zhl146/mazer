import { useState, useRef } from "react";

export const usePathError = (errorDuration) => {
  const [error, setError] = useState(false);

  let currentTimer = useRef(null);

  const startErrorState = () => {
    setError(true);

    if (currentTimer && currentTimer.current) {
      clearTimeout(currentTimer.current);
    }

    currentTimer.current = setTimeout(() => setError(false), errorDuration);
  };

  return [error, startErrorState];
};
