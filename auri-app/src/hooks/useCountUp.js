import { useState, useEffect } from 'react';

/**
 * Hook para animar números de 0 a target.
 * Utiliza una función de easing 'ease-out cubic'.
 */
export const useCountUp = (target, duration = 800) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let frameId;
    const start = Date.now();
    const tick = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCurrent(Math.round(target * eased));
      
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    };
    
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return current;
};
