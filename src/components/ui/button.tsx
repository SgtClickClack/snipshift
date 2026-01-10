import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase tracking-wide",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        success:
          "bg-success text-success-foreground hover:bg-success/90 shadow-sm",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        chrome: "bg-gradient-to-br from-chrome-light via-chrome-medium to-chrome-light border-2 border-steel-300 text-steel-900 font-semibold hover:-translate-y-0.5 shadow-sm",
        accent: "bg-gradient-to-br from-red-accent to-red-accent-dark text-white font-semibold hover:-translate-y-0.5 shadow-md border border-steel-800 hover:shadow-lg",
        charcoal: "bg-gradient-to-b from-steel-800 to-steel-900 border-2 border-steel-700 text-white font-semibold hover:from-steel-700 hover:to-steel-800 hover:-translate-y-0.5 shadow-lg",
        steel: "bg-gradient-to-b from-steel-400 to-steel-500 border border-steel-600 text-white hover:from-steel-300 hover:to-steel-400 hover:-translate-y-0.5 shadow-md",
      },
      size: {
        default: "h-11 px-4 py-2",
        sm: "h-10 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
