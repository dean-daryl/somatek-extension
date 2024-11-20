import { Bot } from 'lucide-react';

export const Header = () => {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-2">
        <Bot className="w-8 h-8 text-gradient-to-r from-purple-900/90 to-blue-900/90" />
        <h1 className="text-xl font-semibold bg-gradient-to-r from-purple-900/90 to-blue-900/90 bg-clip-text text-transparent">
          SomaTek AI
        </h1>
      </div>
    </div>
  );
};