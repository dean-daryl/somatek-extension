import { useEffect, useState } from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '../lib/util';

interface TimeRangeSliderProps {
  min: number;
  max: number;
  value: number[];
  onValueChange: (value: number[]) => void;
  step?: number;
  className?: string;
}

export function TimeRangeSlider({
  min,
  max,
  step = 1,
  value,
  onValueChange,
  className,
}: TimeRangeSliderProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <SliderPrimitive.Root
      min={min}
      max={max}
      step={step}
      value={localValue}
      onValueChange={(newValue) => {
        setLocalValue(newValue);
        onValueChange(newValue);
      }}
      className={cn(
        'relative flex w-full touch-none select-none items-center',
        className
      )}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow rounded-full bg-gray-300">
  <SliderPrimitive.Range className="absolute h-full rounded-full bg-purple-300" />
    </SliderPrimitive.Track>
<SliderPrimitive.Thumb
  className="block h-5 w-5 rounded-full border-2 border-purple-bg-purple-300 bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-bg-purple-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
/>
<SliderPrimitive.Thumb
  className="block h-5 w-5 rounded-full border-2 border-purple-bg-purple-300 bg-white ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-bg-purple-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
/>
    </SliderPrimitive.Root>
  );
}