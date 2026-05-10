"use client";

import * as React from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string;            // YYYY-MM-DD
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  defaultMonth?: Date;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  defaultMonth,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selected = value ? parseISO(value) : undefined;

  function handleSelect(date: Date | undefined) {
    if (date) {
      onChange?.(format(date, "yyyy-MM-dd"));
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors",
          "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground",
          className
        )}
      >
        <span className="font-mono">
          {selected
            ? format(selected, "EEE, dd MMM yyyy")
            : placeholder}
        </span>
        <CalendarIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={defaultMonth ?? selected}
          captionLayout="label"
          autoFocus
        />
      </PopoverContent>
    </Popover>
  );
}
