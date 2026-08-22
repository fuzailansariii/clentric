"use client";
import {
  dateToFormValue,
  formatDate,
  formValueToDate,
} from "@/lib/format-date";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { cn } from "@/lib/utils";
import { useState } from "react";

type DeadlinePickerProps = {
  value: string | undefined;
  onChange: (value: string) => void;
  error?: string;
};

export function DeadlinePicker({
  onChange,
  value,
  error,
}: DeadlinePickerProps) {
  const selectedDate = formValueToDate(value);
  const [month, setMonth] = useState<Date | undefined>(selectedDate);

  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-muted-foreground font-sans text-[13px] font-medium">
        Deadline
      </label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-invalid={!!error}
            className={cn(
              "border-border bg-input/20 flex h-10 w-full items-center justify-between rounded-lg border px-3 text-sm font-medium",
              "focus-visible:border-ring focus-visible:ring-ring/20 focus-visible:ring-2 focus-visible:outline-none",
              !selectedDate && "text-muted-foreground",
            )}
          >
            {selectedDate ? formatDate(selectedDate) : "Pick a date"}
            <CalendarIcon className="h-4 w-4 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            month={month ?? selectedDate ?? new Date()}
            onMonthChange={setMonth}
            onSelect={(date) => onChange(dateToFormValue(date))}
            disabled={(date) =>
              date < new Date(new Date().setHours(0, 0, 0, 0))
            }
            autoFocus
            classNames={{
              month_grid: "border-collapse",
              week: "flex gap-1",
              weekdays: "flex gap-1",
            }}
          />
        </PopoverContent>
      </Popover>
      {error && <span className="text-danger-600 text-xs">{error}</span>}
    </div>
  );
}
