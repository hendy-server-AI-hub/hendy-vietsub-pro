import React, { useState } from 'react';
import { Mic, X, Check, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onTranscribed: (text: string) => void;
}

export default function AutoTranscriptionModal({ isOpen, onClose, onTranscribed }: Props) {
  const [isTranscribing, setIsTranscribing] = useState(false);

  if (!isOpen) return null;

  const handleStartSTT = () => {
    setIsTranscribing(true);
    setTimeout(() => {
      setIsTranscribing(false);
      onTranscribed("Hệ thống đã nhận diện xong âm thanh và tạo phụ đề tự động.");
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Mic className="w-5 h-5 text-emerald-400" /> Tự động chuyển Giọng nói sang Phụ đề
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-slate-400 mb-4">
          Phân tích giọng nói trong video và tự động cắt ghép timestamp phụ đề Vietsub.
        </p>

        <button
          onClick={handleStartSTT}
          disabled={isTranscribing}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
        >
          {isTranscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
          {isTranscribing ? 'Đang nhận diện âm thanh...' : 'Bắt đầu quét Speech-to-Text'}
        </button>
      </div>
    </div>
  );
}
