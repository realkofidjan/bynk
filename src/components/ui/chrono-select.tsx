"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select"
import { format } from "date-fns"

export interface ChronoSelectProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  yearRange?: [number, number]
  /** Dates that are fully blocked and cannot be selected */
  disabledDates?: Date[]
  /** Allow scheduling within 4 days notice (useful for admin/backend orders) */
  disableAdvanceNotice?: boolean
  /** Allow selecting Sundays */
  allowSundays?: boolean
  /** Allow selecting past dates */
  allowPastDates?: boolean
}

export function ChronoSelect({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  yearRange = [2026, 2035],
  disabledDates = [],
  disableAdvanceNotice = false,
  allowSundays = false,
  allowPastDates = false,
}: ChronoSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Date | undefined>(value)
  const [month, setMonth] = React.useState<Date>(selected ?? new Date())

  React.useEffect(() => {
    setSelected(value)
    if (value) {
      setMonth(value)
    }
  }, [value])

  // years array
  const years = React.useMemo(() => {
    const [start, end] = yearRange
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [yearRange])

  // Build the disabled matchers for react-day-picker
  const disabledMatchers = React.useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const minNoticeDate = new Date(today)
    minNoticeDate.setDate(today.getDate() + 4)

    const matchers: Array<Date | { dayOfWeek: number[] } | { before: Date }> = [
      ...disabledDates,
    ]

    // Block Sundays if not allowed
    if (!allowSundays) {
      matchers.push({ dayOfWeek: [0] })
    }

    // Enforce notice or past dates
    if (!allowPastDates) {
      if (disableAdvanceNotice) {
        matchers.push({ before: today })
      } else {
        matchers.push({ before: minNoticeDate })
      }
    }

    return matchers
  }, [disabledDates, allowSundays, allowPastDates, disableAdvanceNotice])

  const handleSelect = (date: Date | undefined) => {
    setSelected(date)
    setOpen(false)
    onChange?.(date)
  }

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year)
    const newDate = new Date(month)
    newDate.setFullYear(newYear)
    setMonth(newDate)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-mono text-[11px] h-10 border-foreground/20 bg-foreground/[0.03] hover:bg-foreground/[0.05] focus:bg-background rounded-none hover:text-foreground text-foreground transition-colors",
            !selected && "text-foreground/30",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-foreground/70 shrink-0" />
          <span className="truncate">{selected ? format(selected, "PPP") : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2 space-y-2 w-auto border-foreground/20 bg-background shadow-2xl rounded-none z-[300]">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-mono font-medium text-foreground">
            {format(month, "MMMM")}
          </span>
          <Select
            defaultValue={String(month.getFullYear())}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="h-7 w-[90px] text-xs font-mono rounded-none border-foreground/20 bg-background">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent className="max-h-48 border-foreground/20 bg-background rounded-none z-[350]">
              {years.map((year) => (
                <SelectItem key={year} value={String(year)} className="text-xs font-mono rounded-none">
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sunday tooltip hint */}
        <p className="text-[9px] font-mono text-foreground/30 px-1 tracking-wide">
          Sundays are unavailable for booking
        </p>

        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          disabled={disabledMatchers}
          className="rounded-none border border-foreground/15"
        />
      </PopoverContent>
    </Popover>
  )
}

