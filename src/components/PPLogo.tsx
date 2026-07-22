import React from 'react';

interface PPLogoProps {
  className?: string;
  fillColor?: string;
}

export const PPLogo: React.FC<PPLogoProps> = ({ 
  className = "w-12 h-12", 
  fillColor = "#0d1b91" 
}) => {
  return (
    <svg 
      viewBox="0 0 500 420" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* 1. Top Left Triangle */}
      <polygon 
        points="242,20 242,126 172,126" 
        fill={fillColor} 
      />
      {/* 2. Top Right Triangle */}
      <polygon 
        points="258,20 258,126 328,126" 
        fill={fillColor} 
      />
      {/* 3. Middle Left Trapezoid */}
      <polygon 
        points="166,140 242,140 242,256 102,256" 
        fill={fillColor} 
      />
      {/* 4. Middle Right Trapezoid */}
      <polygon 
        points="258,140 334,140 398,256 258,256" 
        fill={fillColor} 
      />
      {/* 5. Bottom Left Parallelogram */}
      <polygon 
        points="94,272 182,272 122,400 18,400" 
        fill={fillColor} 
      />
      {/* 6. Bottom Middle Quadrilateral */}
      <polygon 
        points="258,272 326,272 364,400 258,400" 
        fill={fillColor} 
      />
      {/* 7. Bottom Right Small Parallelogram */}
      <polygon 
        points="378,332 438,332 472,400 412,400" 
        fill={fillColor} 
      />
    </svg>
  );
};
