import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange?: (value: number) => void;
  label: string;
  readOnly?: boolean;
};

export function StarRating({ value, onChange, label, readOnly = false }: Props) {
  return (
    <div role={readOnly ? undefined : "radiogroup"} aria-label={label} className="flex gap-1 sm:gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            role={readOnly ? undefined : "radio"}
            aria-checked={readOnly ? undefined : active && star === value}
            aria-label={`${star} star${star > 1 ? "s" : ""} for ${label}`}
            onClick={() => onChange?.(star)}
            className={cn(
              "rounded-md p-0.5 sm:p-1 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              !readOnly && "hover:scale-110 cursor-pointer",
            )}
          >
            <Star
              className={cn(
                "size-6 sm:size-7 transition-colors",
                active ? "fill-star text-star" : "text-muted-foreground/40",
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
