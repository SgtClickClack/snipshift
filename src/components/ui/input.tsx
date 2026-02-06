import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          // Fix 3: Yellow Autofill - Prevent Chrome's autofill yellow background in dark mode
          "[&:-webkit-autofill]:bg-transparent [&:-webkit-autofill]:shadow-[0_0_0_1000px_hsl(var(--background))_inset] [&:-webkit-autofill]:text-foreground [&:-webkit-autofill:hover]:bg-transparent [&:-webkit-autofill:hover]:shadow-[0_0_0_1000px_hsl(var(--background))_inset] [&:-webkit-autofill:focus]:bg-transparent [&:-webkit-autofill:focus]:shadow-[0_0_0_1000px_hsl(var(--background))_inset]",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
