import { motion } from 'framer-motion';
import { ReactNode } from 'react';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.35, 
      ease: [0.25, 0.1, 0.25, 1] // Custom easing curve for quality feel
    } 
  },
};

export function StaggerContainer({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string 
}) {
  return (
    <motion.div 
      variants={container} 
      initial="hidden" 
      animate="show" 
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string 
}) {
  return (
    <motion.div variants={item} className={className}>
      {children}
    </motion.div>
  );
}
