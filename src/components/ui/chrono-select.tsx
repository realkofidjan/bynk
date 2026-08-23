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
import {
  type AvailabilityMap,
  type SlotAvailability,
  SLOT_LABELS,
} from "@/lib/booking-types"

export interface ChronoSelectProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  yearRange?: [number, number]
  /** Dates that are fully blocked and cannot be selected */
  disabledDates?: Date[]
  /** Whether to show time slot selector after date pick */
  showSlots?: boolean
  /** Full availability data for slot-level info */
  availabilityMap?: AvailabilityMap
  /** Currently selected slot */
  selectedSlot?: string
  /** Callback when a slot is selected */
  onSlotChange?: (slot: string) => void
  /** If true, this is a full-day category — skip slot picker */
  isFullDay?: boolean
}

export function ChronoSelect({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  yearRange = [2026, 2035],
  disabledDates = [],
  showSlots = false,
  availabilityMap = {},
  selectedSlot,
  onSlotChange,
  isFullDay = false,
}: ChronoSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Date | undefined>(value)
  const [month, setMonth] = React.useState<Date>(selected ?? new Date())

  React.useEffect(() => {
    setSelected(value)
  }, [value])

  // years array
  const years = React.useMemo(() => {
    const [start, end] = yearRange
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }, [yearRange])

  // Build the disabled matchers for react-day-picker
  const disabledMatchers = React.useMemo(() => {
    const matchers: Array<Date | { dayOfWeek: number[] } | { before: Date }> = [
      // All Sundays
      { dayOfWeek: [0] },
      // Past dates
      { before: new Date() },
      // Fully blocked dates
      ...disabledDates,
    ]
    return matchers
  }, [disabledDates])

  const handleSelect = (date: Date | undefined) => {
    setSelected(date)
    // If not showing slots, close immediately
    if (!showSlots || isFullDay) {
      setOpen(false)
    }
    onChange?.(date)
  }

  const handleYearChange = (year: string) => {
    const newYear = parseInt(year)
    const newDate = new Date(month)
    newDate.setFullYear(newYear)
    setMonth(newDate)
  }

  // Get slot availability for the currently selected date
  const selectedDateKey = selected
    ? `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`
    : null

  const selectedDayAvailability = selectedDateKey
    ? availabilityMap[selectedDateKey]
    : null

  const getSlotStatus = (slot: 'morning' | 'afternoon'): SlotAvailability => {
    if (!selectedDayAvailability) return 'available'
    return selectedDayAvailability.slots[slot] || 'available'
  }

  const handleSlotSelect = (slot: string) => {
    onSlotChange?.(slot)
    setOpen(false)
  }

  // Build display text
  let displayText = placeholder
  if (selected) {
    displayText = format(selected, "PPP")
    if (showSlots && selectedSlot && !isFullDay) {
      displayText += ` · ${SLOT_LABELS[selectedSlot as keyof typeof SLOT_LABELS] || selectedSlot}`
    } else if (isFullDay) {
      displayText += ` · Full Day`
    }
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
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-2 space-y-2 w-auto border-foreground/20 bg-background shadow-xl rounded-none z-[80]">
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
            <SelectContent className="max-h-48 border-foreground/20 bg-background rounded-none z-[90]">
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

        {/* Slot Picker — shown after date is selected (non-full-day categories) */}
        {showSlots && selected && !isFullDay && (
          <div className="space-y-1.5 pt-1 border-t border-foreground/10">
            <p className="text-[9px] font-mono text-foreground/50 uppercase tracking-[0.2em] px-1">
              Select a time slot
            </p>
            <div className="flex gap-1.5">
              {(['morning', 'afternoon'] as const).map((slot) => {
                const status = getSlotStatus(slot)
                const isBooked = status === 'booked'
                const isSelected = selectedSlot === slot

                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={isBooked}
                    onClick={() => handleSlotSelect(slot)}
                    className={cn(
                      "flex-1 py-2 px-3 text-[10px] font-mono tracking-wide border transition-all duration-200 rounded-none cursor-pointer",
                      isBooked &&
                        "bg-foreground/[0.03] text-foreground/20 border-foreground/[0.06] cursor-not-allowed line-through",
                      !isBooked && !isSelected &&
                        "bg-background text-foreground/70 border-foreground/15 hover:bg-foreground/[0.05] hover:border-foreground/25",
                      isSelected &&
                        "bg-foreground text-background border-foreground shadow-sm",
                    )}
                  >
                    {SLOT_LABELS[slot]}
                    {isBooked && (
                      <span className="block text-[8px] mt-0.5 opacity-50 no-underline" style={{ textDecoration: 'none' }}>
                        Booked
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Full-day indicator */}
        {showSlots && selected && isFullDay && (
          <div className="pt-1 border-t border-foreground/10">
            <div className="py-2 px-3 bg-foreground/[0.04] border border-foreground/15 text-center">
              <p className="text-[10px] font-mono text-foreground/70 tracking-wide">
                Full Day Session
              </p>
              <p className="text-[9px] font-mono text-foreground/40 mt-0.5">
                8 AM – End of event
              </p>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
