import React from 'react';
import { motion } from 'motion/react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rect' }) => {
  const baseClasses = "bg-zinc-100 relative overflow-hidden";
  const variantClasses = {
    rect: "rounded-sm",
    circle: "rounded-full",
    text: "rounded-md h-4 w-full"
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.5,
          ease: "linear",
        }}
      />
    </div>
  );
};

export const ProductSkeleton = () => (
  <div className="flex flex-col gap-4">
    <Skeleton className="aspect-[3/4] w-full" />
    <Skeleton className="w-3/4 h-3" variant="text" />
    <Skeleton className="w-1/2 h-3" variant="text" />
  </div>
);

export const CategorySkeleton = () => (
    <div className="flex flex-col gap-4">
      <Skeleton className="aspect-square w-full rounded-full" />
      <Skeleton className="w-1/2 h-3 mx-auto" variant="text" />
    </div>
);
