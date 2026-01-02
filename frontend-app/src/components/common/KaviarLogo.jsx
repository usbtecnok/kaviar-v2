import React from 'react';
import { Box } from '@mui/material';

const KaviarLogo = ({ 
  variant = 'full', 
  size = 'medium',
  color = 'inherit',
  ...props 
}) => {
  const getSizeStyles = () => {
    const sizes = {
      small: { width: variant === 'full' ? 120 : 24, height: variant === 'full' ? 36 : 24 },
      medium: { width: variant === 'full' ? 160 : 32, height: variant === 'full' ? 48 : 32 },
      large: { width: variant === 'full' ? 200 : 48, height: variant === 'full' ? 60 : 48 }
    };
    return sizes[size] || sizes.medium;
  };

  const sizeStyles = getSizeStyles();

  // SVG simplificado para garantir renderização
  const LogoSvg = variant === 'full' ? (
    <svg width={sizeStyles.width} height={sizeStyles.height} viewBox="0 0 200 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="40" height="40" rx="8" fill="#1976d2"/>
      <path d="M20 20 L30 30 L40 20 M30 30 L40 40" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <text x="60" y="35" fontFamily="Inter, sans-serif" fontSize="24" fontWeight="600" fill="#1976d2">
        KAVIAR
      </text>
      <text x="60" y="48" fontFamily="Inter, sans-serif" fontSize="10" fill="#666" opacity="0.8">
        Corridas Comunitárias
      </text>
    </svg>
  ) : (
    <svg width={sizeStyles.width} height={sizeStyles.height} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="40" height="40" rx="8" fill="#1976d2"/>
      <path d="M10 10 L20 20 L30 10 M20 20 L30 30" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );

  return (
    <Box
      component="div"
      sx={{
        display: 'inline-block',
        ...props.sx
      }}
      {...props}
    >
      {LogoSvg}
    </Box>
  );
};

export default KaviarLogo;
