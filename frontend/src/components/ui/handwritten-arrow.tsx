import React from 'react'

interface HandwrittenArrowProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
}

export const HandwrittenArrow: React.FC<HandwrittenArrowProps> = ({ 
  size = 24, 
  color = 'currentColor', 
  ...props 
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 50 50"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M8 42C8 42 15 41 22 34C29 27 41 8 41 8M41 8C41 8 34 9 28 8.5M41 8C41 8 42 13.5 43 20"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
