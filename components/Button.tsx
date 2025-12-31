
import React from 'react';
import { SoundManager } from '../utils/audio';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'glass' | 'start' | 'icon';
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon';
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon,
  className = '',
  fullWidth = false,
  onClick,
  ...props 
}) => {
  const baseStyles = "relative font-black rounded-full transition-all flex items-center justify-center gap-2 tracking-wide btn-press select-none overflow-hidden outline-none";
  
  // 2.5D Styles: Gradient Background + Darker Border Bottom for "Thick" look
  const variants = {
    primary: "bg-gradient-to-b from-green-400 to-green-500 text-white border-b-[6px] border-green-700 shadow-[0_4px_10px_rgba(21,128,61,0.4)]",
    secondary: "bg-gradient-to-b from-purple-400 to-purple-500 text-white border-b-[6px] border-purple-700 shadow-[0_4px_10px_rgba(126,34,206,0.4)]",
    accent: "bg-gradient-to-b from-yellow-300 to-yellow-400 text-yellow-900 border-b-[6px] border-yellow-600 shadow-[0_4px_10px_rgba(202,138,4,0.4)]",
    danger: "bg-gradient-to-b from-rose-400 to-rose-500 text-white border-b-[6px] border-rose-700 shadow-[0_4px_10px_rgba(190,18,60,0.4)]",
    glass: "bg-white/20 text-white border-2 border-white/50 backdrop-blur-md shadow-sm border-b-[4px]",
    // Specific styles for START button (Orange pill)
    start: "bg-gradient-to-b from-yellow-400 to-orange-500 text-white border-b-[8px] border-orange-700 shadow-[0_8px_20px_rgba(234,88,12,0.5)] candy-text-sm hover:brightness-110",
    // Small round icon buttons
    icon: "bg-gradient-to-b from-purple-400 to-purple-600 text-white border-b-[4px] border-purple-800 shadow-md",
  };

  const sizes = {
    sm: "px-4 py-1 text-sm rounded-2xl border-b-[4px]",
    md: "px-6 py-2 text-lg",
    lg: "px-8 py-4 text-xl",
    // Removed w-full from xl to allow manual width control
    xl: "px-12 py-5 text-4xl rounded-full tracking-wider", 
    icon: "w-12 h-12 rounded-full p-0 flex items-center justify-center",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    SoundManager.play('click');
    if (onClick) onClick(e);
  };

  return (
    <button 
      className={`
        ${baseStyles} 
        ${variants[variant]} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      onClick={handleClick}
      {...props}
    >
      {/* Shine effect overlay */}
      <div className="absolute top-0 left-0 w-full h-[40%] bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-t-full"></div>
      
      {icon && <span className="relative z-10 filter drop-shadow-sm">{icon}</span>}
      {children && <span className="relative z-10 drop-shadow-sm">{children}</span>}
    </button>
  );
};
