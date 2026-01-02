import { Box, Fade, Slide, Grow } from "@mui/material";
import { forwardRef } from "react";

// Transição suave para entrada de cards
export const FadeInCard = forwardRef(({ children, delay = 0, ...props }, ref) => (
  <Fade in timeout={{ enter: 600 }} style={{ transitionDelay: `${delay}ms` }} {...props} ref={ref}>
    <Box>{children}</Box>
  </Fade>
));

// Transição para mudança de estado
export const SlideTransition = forwardRef(({ children, direction = "up", ...props }, ref) => (
  <Slide direction={direction} in timeout={400} {...props} ref={ref}>
    <Box>{children}</Box>
  </Slide>
));

// Crescimento suave para elementos importantes
export const GrowTransition = forwardRef(({ children, delay = 0, ...props }, ref) => (
  <Grow in timeout={500} style={{ transitionDelay: `${delay}ms` }} {...props} ref={ref}>
    <Box>{children}</Box>
  </Grow>
));

// Container com animação staggered para listas
export const StaggeredContainer = ({ children, staggerDelay = 100 }) => {
  return (
    <Box>
      {children.map((child, index) => (
        <FadeInCard key={index} delay={index * staggerDelay}>
          {child}
        </FadeInCard>
      ))}
    </Box>
  );
};

// Estilos de hover premium para botões
export const premiumButtonStyles = {
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
  },
  '&:active': {
    transform: 'translateY(0)',
    transition: 'all 0.1s cubic-bezier(0.4, 0, 0.2, 1)',
  }
};

// Estilos de hover para cards
export const premiumCardStyles = {
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
  }
};

// Animação de sucesso (check)
export const SuccessAnimation = ({ show, children }) => (
  <Grow in={show} timeout={600}>
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      '& .success-icon': {
        animation: show ? 'successPulse 0.6s ease-out' : 'none',
      },
      '@keyframes successPulse': {
        '0%': { transform: 'scale(0)', opacity: 0 },
        '50%': { transform: 'scale(1.2)', opacity: 1 },
        '100%': { transform: 'scale(1)', opacity: 1 }
      }
    }}>
      {children}
    </Box>
  </Grow>
);
