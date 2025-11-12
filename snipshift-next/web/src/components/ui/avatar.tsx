import React from 'react';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className = '', ...props }, ref) => {
    return <div ref={ref} className={className} {...props} />;
  }
);

Avatar.displayName = 'Avatar';

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
}

export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className = '', ...props }, ref) => {
    return <img ref={ref} className={className} {...props} />;
  }
);

AvatarImage.displayName = 'AvatarImage';

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {}

export const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className = '', ...props }, ref) => {
    return <div ref={ref} className={className} {...props} />;
  }
);

AvatarFallback.displayName = 'AvatarFallback';

