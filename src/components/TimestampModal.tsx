import { useState } from "react";
import Slider from "rc-slider";
import "rc-slider/assets/index.css";

export const TimestampModal: React.FC<{
  onConfirm: (start: number, end: number) => void;
  onClose: () => void;
  videoDuration: number;
}> = ({ onConfirm, onClose, videoDuration }) => {
  const [range, setRange] = useState<[number, number]>([0, 0]);
  
  const handleConfirm = () => {
    const [start, end] = range;
    if (end > start) {
      onConfirm(start, end);
      onClose();
    } else {
      alert("End time must be greater than start time");
    }
  };
  const formatTimestamp = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-4 rounded-lg flex flex-col items-center w-[500px]">
        <h2 className="text-lg font-bold mb-4">Set Timestamps:</h2>

        {/* Dual-handle slider */}
        <Slider
          range
          min={0}
          max={videoDuration}
          step={0.1}
          value={range}
          onChange={(newRange) => setRange(newRange as [number, number])}
          trackStyle={[{ backgroundColor: "blue" }]}
          handleStyle={[
            { backgroundColor: "blue", borderColor: "blue" },
            { backgroundColor: "blue", borderColor: "blue" },
          ]}
        />

        <div className="flex justify-between w-full mt-2">
          <span>Start: {formatTimestamp(range[0])}</span>
          <span>End: {formatTimestamp(range[1])}</span>
        </div>

        <div className="mt-6 flex justify-between w-full">
          <button
            onClick={handleConfirm}
            className="bg-blue-500 text-white px-4 py-2 rounded mr-2"
          >
            Confirm
          </button>

          <button
            onClick={onClose}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
