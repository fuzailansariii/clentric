import { cn } from "@/lib/utils";
import { SearchIcon } from "lucide-react";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  className?: string;
};

export function SearchInput({
  value,
  onChange,
  placeholder,
  className,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-border bg-paper-50 dark:bg-muted focus:ring-ring h-8 w-full rounded-md border pr-3 pl-8 text-sm outline-none focus:ring-1"
      />
    </div>
  );
}
