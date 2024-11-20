import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button'
import { Clock } from 'lucide-react';
import { TimeRangeSlider } from './TimeRangeSlider';

interface TimestampModalProps {
  onConfirm: (start: number, end: number) => void;
  onClose: () => void;
  videoDuration: number;
}

export const TimestampModal = ({ onConfirm, onClose, videoDuration }: TimestampModalProps) => {
  const [range, setRange] = useState([0, videoDuration]);

  useEffect(() => {
    setRange([0, videoDuration]);
  }, [videoDuration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md  bg-white w-[90%]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Select Video Segment
          </DialogTitle>
        </DialogHeader>
        <div className="py-6">
          <div className="space-y-8">
            <div className="px-2">
              <TimeRangeSlider
                min={0}
                max={videoDuration}
                step={1}
                value={range}
                onValueChange={setRange}
              />
            </div>
            <div className="flex justify-between items-center">
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium">Start</span>
                <span className="text-sm text-muted-foreground">{formatTime(range[0])}</span>
              </div>
              <div className="h-px flex-1 mx-4 bg-border" />
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium">End</span>
                <span className="text-sm text-muted-foreground">{formatTime(range[1])}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => {
            onConfirm(range[0], range[1])
            onClose()
           }}>
            Transcribe Segment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};