'use client'

import { CalendarIcon, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import {
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
  addMonths,
} from 'date-fns'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { type DateRange } from 'react-day-picker'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const presets = [
  { label: 'Today', getValue: () => ({ from: new Date(), to: new Date() }) },
  {
    label: 'Yesterday',
    getValue: () => {
      const yesterday = subDays(new Date(), 1)
      return { from: yesterday, to: yesterday }
    },
  },
  {
    label: 'Last 7 days',
    getValue: () => ({ from: subDays(new Date(), 6), to: new Date() }),
  },
  {
    label: 'Last 14 days',
    getValue: () => ({ from: subDays(new Date(), 13), to: new Date() }),
  },
  {
    label: 'Last 30 days',
    getValue: () => ({ from: subDays(new Date(), 29), to: new Date() }),
  },
  {
    label: 'This Week',
    getValue: () => ({ from: startOfWeek(new Date()), to: endOfWeek(new Date()) }),
  },
  {
    label: 'Last Week',
    getValue: () => {
      const lastWeek = subWeeks(new Date(), 1)
      return { from: startOfWeek(lastWeek), to: endOfWeek(lastWeek) }
    },
  },
  {
    label: 'This Month',
    getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    label: 'Last Month',
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1)
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
    },
  },
]

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Date input component that splits into month/day/year boxes
function DateInput({ date, onChange }: { date: Date | undefined; onChange: (date: Date) => void }) {
  const monthRef = useRef<HTMLInputElement>(null)
  const dayRef = useRef<HTMLInputElement>(null)
  const yearRef = useRef<HTMLInputElement>(null)

  const month = date ? String(date.getMonth() + 1).padStart(1, '0') : ''
  const day = date ? String(date.getDate()).padStart(1, '0') : ''
  const year = date ? String(date.getFullYear()) : ''

  const updateDate = (m: string, d: string, y: string) => {
    const monthNum = parseInt(m) || 1
    const dayNum = parseInt(d) || 1
    const yearNum = parseInt(y) || new Date().getFullYear()
    const newDate = new Date(yearNum, monthNum - 1, dayNum)
    if (!isNaN(newDate.getTime())) {
      onChange(newDate)
    }
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2)
    if (val.length === 2) {
      dayRef.current?.focus()
    }
    updateDate(val, day, year)
  }

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 2)
    if (val.length === 2) {
      yearRef.current?.focus()
    }
    updateDate(month, val, year)
  }

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4)
    updateDate(month, day, val)
  }

  return (
    <div className="adm:flex adm:items-center adm:gap-0 adm:border adm:border-[var(--adm-border)] adm:rounded adm:overflow-hidden adm:bg-[var(--adm-surface-hover)]">
      <input
        ref={monthRef}
        type="text"
        value={month}
        placeholder="M"
        onChange={handleMonthChange}
        className="adm:w-8 adm:h-7 adm:bg-transparent adm:text-center adm:text-sm adm:text-[var(--adm-text)] adm:outline-none adm:border-0 adm:placeholder:text-[var(--adm-muted)]"
      />
      <span className="adm:text-[var(--adm-muted)] adm:select-none">/</span>
      <input
        ref={dayRef}
        type="text"
        value={day}
        placeholder="D"
        onChange={handleDayChange}
        className="adm:w-8 adm:h-7 adm:bg-transparent adm:text-center adm:text-sm adm:text-[var(--adm-text)] adm:outline-none adm:border-0 adm:placeholder:text-[var(--adm-muted)]"
      />
      <span className="adm:text-[var(--adm-muted)] adm:select-none">/</span>
      <input
        ref={yearRef}
        type="text"
        value={year}
        placeholder="YYYY"
        onChange={handleYearChange}
        className="adm:w-14 adm:h-7 adm:bg-transparent adm:text-center adm:text-sm adm:text-[var(--adm-text)] adm:outline-none adm:border-0 adm:placeholder:text-[var(--adm-muted)]"
      />
    </div>
  )
}

export function AdminDatePicker({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isOpen, setIsOpen] = useState(false)
  const [tempDate, setTempDate] = useState<DateRange | undefined>()
  const [displayMonth, setDisplayMonth] = useState<Date>(new Date())
  const [compareMode, setCompareMode] = useState(false)
  const [_compareDate, _setCompareDate] = useState<DateRange | undefined>()
  const [showPresets, setShowPresets] = useState(false)

  useEffect(() => {
    const fromParam = searchParams.get('from')
    const toParam = searchParams.get('to')

    if (fromParam) {
      const fromDate = new Date(fromParam)
      const toDate = toParam ? new Date(toParam) : fromDate
      setTempDate({ from: fromDate, to: toDate })
      setDisplayMonth(fromDate)
    } else {
      const now = new Date()
      setTempDate({ from: startOfMonth(now), to: endOfMonth(now) })
    }
  }, [searchParams])

  const applyDateRange = () => {
    if (!tempDate?.from) return

    const params = new URLSearchParams(searchParams)
    params.set('from', format(tempDate.from, 'yyyy-MM-dd'))
    params.set('to', format(tempDate.to || tempDate.from, 'yyyy-MM-dd'))

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    setIsOpen(false)
    setShowPresets(false)
  }

  const selectPreset = (preset: (typeof presets)[0]) => {
    const range = preset.getValue()
    setTempDate(range)
    setDisplayMonth(range.from)
    setShowPresets(false)
  }

  const selectMonth = (monthIndex: number) => {
    const year = displayMonth.getFullYear()
    const newDate = new Date(year, monthIndex, 1)
    setDisplayMonth(newDate)
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setDisplayMonth((prev) => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1))
      return newDate
    })
  }

  const handleFromDateChange = (date: Date) => {
    setTempDate((prev) => ({ from: date, to: prev?.to ?? date }))
    setDisplayMonth(date)
  }

  const handleToDateChange = (date: Date) => {
    setTempDate((prev) => ({ from: prev?.from ?? date, to: date }))
  }

  const currentMonth = displayMonth.getMonth()
  const nextMonth = addMonths(displayMonth, 1)

  const formatDisplayDate = (date: Date | undefined) => {
    if (!date) return ''
    return format(date, 'MMM d, yyyy')
  }

  return (
    <div className={cn('adm:flex adm:items-center adm:gap-2', className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              'adm:h-10 adm:justify-start adm:gap-2 adm:rounded-full adm:border adm:border-[var(--adm-border)] adm:bg-[var(--adm-surface)] adm:px-4 adm:text-left adm:text-sm adm:font-medium adm:text-[var(--adm-text)] adm:transition-all adm:hover:bg-[var(--adm-surface-hover)] adm:hover:border-[var(--adm-border-strong)]',
              !tempDate?.from && 'adm:text-[var(--adm-muted)]',
            )}
          >
            <CalendarIcon className="adm:h-4 adm:w-4 adm:text-[var(--adm-accent)]" />
            {tempDate?.from ? (
              <span className="adm:text-[var(--adm-text)]">
                {formatDisplayDate(tempDate.from)} -{' '}
                {formatDisplayDate(tempDate.to || tempDate.from)}
              </span>
            ) : (
              <span>Select date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="adm:w-[720px] adm:rounded-xl adm:border adm:border-[var(--adm-border)] adm:bg-[var(--adm-bg)] adm:p-0 adm:shadow-2xl adm:overflow-hidden"
          style={{ backgroundColor: 'oklch(0.1 0.018 261)' }}
          align="end"
          sideOffset={8}
        >
          {/* Header with Compare Toggle and Date Inputs */}
          <div className="adm:flex adm:items-center adm:justify-between adm:px-4 adm:py-3 adm:border-b adm:border-[var(--adm-border)]">
            <div className="adm:flex adm:items-center adm:gap-4">
              {/* Compare Toggle */}
              <div className="adm:flex adm:items-center adm:gap-2">
                <button
                  onClick={() => setCompareMode(!compareMode)}
                  className={cn(
                    'adm:relative adm:w-11 adm:h-6 adm:rounded-full adm:transition-colors',
                    compareMode
                      ? 'adm:bg-[var(--adm-accent)]'
                      : 'adm:bg-[var(--adm-surface-hover)] adm:border adm:border-[var(--adm-border)]',
                  )}
                  aria-pressed={compareMode}
                >
                  <span
                    className={cn(
                      'adm:absolute adm:top-0.5 adm:left-0.5 adm:w-5 adm:h-5 adm:rounded-full adm:bg-white adm:transition-transform adm:shadow-sm',
                      compareMode ? 'adm:translate-x-5' : 'adm:translate-x-0',
                    )}
                  />
                </button>
                <span
                  className={cn(
                    'adm:text-sm adm:transition-colors',
                    compareMode
                      ? 'adm:text-[var(--adm-accent)] adm:font-medium'
                      : 'adm:text-[var(--adm-text)]',
                  )}
                >
                  Compare
                </span>
              </div>

              {/* Date Inputs */}
              <div className="adm:flex adm:items-center adm:gap-2">
                <DateInput date={tempDate?.from} onChange={handleFromDateChange} />
                <span className="adm:text-[var(--adm-muted)]">-</span>
                <DateInput date={tempDate?.to} onChange={handleToDateChange} />
              </div>
            </div>

            {/* Today Dropdown */}
            <div className="adm:relative">
              <button
                onClick={() => setShowPresets(!showPresets)}
                className="adm:flex adm:items-center adm:gap-2 adm:px-3 adm:py-1.5 adm:rounded adm:bg-[var(--adm-surface-hover)] adm:border adm:border-[var(--adm-border)] adm:text-sm adm:text-[var(--adm-text)] adm:hover:bg-[var(--adm-border-strong)] adm:transition-all"
              >
                <Check className="adm:h-4 adm:w-4" />
                <span>Today</span>
              </button>
            </div>
          </div>

          {/* Main Content: Two Calendars + Presets */}
          <div className="adm:flex">
            {/* Two Month Calendars */}
            <div className="adm:flex adm:flex-1">
              {/* First Month */}
              <div className="adm:flex-1 adm:p-4 adm:border-r adm:border-[var(--adm-border)]">
                {/* Month Header */}
                <div className="adm:flex adm:items-center adm:justify-between adm:mb-4">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="adm:h-7 adm:w-7 adm:flex adm:items-center adm:justify-center adm:rounded adm:bg-[var(--adm-surface-hover)] adm:text-[var(--adm-muted)] adm:hover:text-[var(--adm-text)] adm:hover:bg-[var(--adm-border-strong)] adm:transition-all"
                  >
                    <ChevronLeft className="adm:h-4 adm:w-4" />
                  </button>
                  <span className="adm:text-sm adm:font-semibold adm:text-[var(--adm-text)]">
                    {format(displayMonth, 'MMMM yyyy')}
                  </span>
                  <div className="adm:w-7" />
                </div>

                <Calendar
                  mode="range"
                  month={displayMonth}
                  onMonthChange={setDisplayMonth}
                  selected={tempDate}
                  onSelect={setTempDate}
                  numberOfMonths={1}
                  showOutsideDays={true}
                  className="adm:bg-transparent"
                  classNames={{
                    root: 'adm:select-none',
                    months: 'adm:flex adm:flex-col',
                    month: 'adm:flex adm:flex-col adm:gap-2',
                    caption: 'adm:hidden',
                    nav: 'adm:hidden',
                    table: 'adm:w-full',
                    weekdays: 'adm:flex adm:justify-between adm:mb-1',
                    weekday:
                      'adm:w-9 adm:text-center adm:text-[10px] adm:font-semibold adm:text-[var(--adm-muted)] adm:uppercase adm:tracking-wider',
                    week: 'adm:flex adm:justify-between',
                    day: 'adm:h-9 adm:w-9 adm:text-sm adm:text-white/80 adm:hover:text-white adm:transition-colors',
                    day_button: cn(
                      'adm:size-full adm:rounded-md adm:flex adm:items-center adm:justify-center',
                      'adm:text-sm adm:font-normal',
                    ),
                    selected: 'adm:bg-white adm:text-black',
                    range_start: 'adm:bg-white adm:text-black adm:rounded-l-md',
                    range_end: 'adm:bg-white adm:text-black adm:rounded-r-md',
                    range_middle: 'adm:bg-white/20 adm:text-white',
                    today: 'adm:text-white adm:font-semibold adm:border adm:border-white/40',
                    outside: 'adm:text-white/20',
                    disabled: 'adm:text-white/10 adm:cursor-not-allowed',
                    hidden: 'adm:invisible',
                  }}
                />
              </div>

              {/* Second Month */}
              <div className="adm:flex-1 adm:p-4 adm:border-r adm:border-[var(--adm-border)]">
                {/* Month Header */}
                <div className="adm:flex adm:items-center adm:justify-between adm:mb-4">
                  <div className="adm:w-7" />
                  <span className="adm:text-sm adm:font-semibold adm:text-[var(--adm-text)]">
                    {format(nextMonth, 'MMMM yyyy')}
                  </span>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="adm:h-7 adm:w-7 adm:flex adm:items-center adm:justify-center adm:rounded adm:bg-[var(--adm-surface-hover)] adm:text-[var(--adm-muted)] adm:hover:text-[var(--adm-text)] adm:hover:bg-[var(--adm-border-strong)] adm:transition-all"
                  >
                    <ChevronRight className="adm:h-4 adm:w-4" />
                  </button>
                </div>

                <Calendar
                  mode="range"
                  month={nextMonth}
                  onMonthChange={(m) => setDisplayMonth(subMonths(m, 1))}
                  selected={tempDate}
                  onSelect={setTempDate}
                  numberOfMonths={1}
                  showOutsideDays={true}
                  className="adm:bg-transparent"
                  classNames={{
                    root: 'adm:select-none',
                    months: 'adm:flex adm:flex-col',
                    month: 'adm:flex adm:flex-col adm:gap-2',
                    caption: 'adm:hidden',
                    nav: 'adm:hidden',
                    table: 'adm:w-full',
                    weekdays: 'adm:flex adm:justify-between adm:mb-1',
                    weekday:
                      'adm:w-9 adm:text-center adm:text-[10px] adm:font-semibold adm:text-[var(--adm-muted)] adm:uppercase adm:tracking-wider',
                    week: 'adm:flex adm:justify-between',
                    day: 'adm:h-9 adm:w-9 adm:text-sm adm:text-white/80 adm:hover:text-white adm:transition-colors',
                    day_button: cn(
                      'adm:size-full adm:rounded-md adm:flex adm:items-center adm:justify-center',
                      'adm:text-sm adm:font-normal',
                    ),
                    selected: 'adm:bg-white adm:text-black',
                    range_start: 'adm:bg-white adm:text-black adm:rounded-l-md',
                    range_end: 'adm:bg-white adm:text-black adm:rounded-r-md',
                    range_middle: 'adm:bg-white/20 adm:text-white',
                    today: 'adm:text-white adm:font-semibold adm:border adm:border-white/40',
                    outside: 'adm:text-white/20',
                    disabled: 'adm:text-white/10 adm:cursor-not-allowed',
                    hidden: 'adm:invisible',
                  }}
                />
              </div>
            </div>

            {/* Presets Sidebar */}
            <div className="adm:w-[140px] adm:p-3 adm:bg-[var(--adm-surface)] adm:flex adm:flex-col adm:gap-1">
              <div className="adm:text-[10px] adm:font-semibold adm:text-[var(--adm-muted)] adm:uppercase adm:tracking-wider adm:px-3 adm:py-1">
                Quick Select
              </div>
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => selectPreset(preset)}
                  className={cn(
                    'adm:w-full adm:text-left adm:px-3 adm:py-2 adm:rounded adm:text-sm',
                    'adm:text-[var(--adm-text)] adm:hover:bg-[var(--adm-surface-hover)]',
                    'adm:transition-all',
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Month Selector */}
          <div className="adm:px-4 adm:py-3 adm:border-t adm:border-[var(--adm-border)] adm:bg-[var(--adm-surface)]">
            <div className="adm:flex adm:items-center adm:gap-1">
              {months.map((month, index) => (
                <button
                  key={month}
                  onClick={() => selectMonth(index)}
                  className={cn(
                    'adm:px-3 adm:py-1.5 adm:rounded adm:text-xs adm:font-medium',
                    'adm:transition-all',
                    currentMonth === index
                      ? 'adm:bg-white/10 adm:text-white'
                      : 'adm:text-[var(--adm-muted)] adm:hover:text-white adm:hover:bg-white/5',
                  )}
                >
                  {month}
                </button>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="adm:flex adm:items-center adm:justify-end adm:gap-2 adm:px-4 adm:py-3 adm:border-t adm:border-[var(--adm-border)] adm:bg-[var(--adm-surface)]">
            <button
              onClick={() => {
                setIsOpen(false)
                setShowPresets(false)
              }}
              className="adm:px-4 adm:py-2 adm:rounded adm:text-sm adm:font-medium adm:text-[var(--adm-text)] adm:bg-[var(--adm-surface-hover)] adm:border adm:border-[var(--adm-border)] adm:hover:bg-[var(--adm-border-strong)] adm:transition-all"
            >
              Cancel
            </button>
            <button
              onClick={applyDateRange}
              disabled={!tempDate?.from}
              className={cn(
                'adm:px-4 adm:py-2 adm:rounded adm:text-sm adm:font-medium',
                'adm:bg-[var(--adm-accent)] adm:text-[var(--adm-bg)]',
                'adm:hover:opacity-90 adm:transition-all',
                !tempDate?.from && 'adm:opacity-50 adm:cursor-not-allowed',
              )}
            >
              Update
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
