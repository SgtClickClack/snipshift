import * as React from "react"
import { DayPicker, DayPickerProps } from "react-day-picker"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = DayPickerProps & {
  bookedDays?: Date[]
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  bookedDays = [],
  ...props
}: CalendarProps) {
  // Helper function to normalize dates for comparison (ignore time)
  const normalizeDate = (date: Date): Date => {
    const normalized = new Date(date)
    normalized.setHours(0, 0, 0, 0)
    return normalized
  }

  // Helper function to check if a date is booked
  const isBooked = (date: Date): boolean => {
    if (!bookedDays || bookedDays.length === 0) return false
    const normalizedDate = normalizeDate(date)
    return bookedDays.some(bookedDate => {
      const normalizedBooked = normalizeDate(bookedDate)
      return normalizedDate.getTime() === normalizedBooked.getTime()
    })
  }

  // Custom day component to show booked indicator
  const Day = (props: any) => {
    const { date } = props
    const booked = isBooked(date)
    
    return (
      <button
        {...props}
        className={cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 md:h-9 md:w-9 p-0 font-normal aria-selected:opacity-100 text-xs md:text-sm rounded-md relative flex flex-col items-center justify-center",
          props.className
        )}
      >
        <span>{date.getDate()}</span>
        {booked && (
          <div className="absolute bottom-1 h-1.5 w-1.5 rounded-full bg-primary" />
        )}
      </button>
    )
  }

  return (
    <div className="overflow-x-auto w-full">
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-2 md:p-3 rounded-md", className)}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-2 md:space-y-4 min-w-[280px]",
          caption: "flex justify-center pt-1 relative items-center px-1",
          caption_label: "text-xs md:text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-10 w-10 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-0 md:left-1",
          nav_button_next: "absolute right-0 md:right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "grid grid-cols-7 w-full gap-0",
          head_cell:
            "text-muted-foreground font-normal text-[0.8rem] flex items-center justify-center w-9 h-9",
          row: "flex w-full mt-1 md:mt-2",
          cell: "h-8 w-8 md:h-9 md:w-9 text-center text-xs md:text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: "h-8 w-8 md:h-9 md:w-9 p-0 font-normal aria-selected:opacity-100 text-xs md:text-sm rounded-md",
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground font-semibold border border-primary/20",
          day_outside:
            "day-outside text-muted-foreground/50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        components={{
          IconLeft: () => <ChevronLeft className="h-5 w-5" />,
          IconRight: () => <ChevronRight className="h-5 w-5" />,
          Day: Day,
        }}
        modifiers={{
          booked: bookedDays,
        }}
        modifierClassNames={{
          booked: "relative",
        }}
        {...props}
      />
    </div>
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
