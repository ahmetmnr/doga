'use client';

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  isFinal?: boolean;
}

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
  currentTranscript?: string;
  isUserSpeaking?: boolean;
}

export default function TranscriptPanel({ entries, currentTranscript, isUserSpeaking }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, currentTranscript]);
  
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl h-64 flex flex-col">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Konuşma Kaydı</h3>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 pr-2">
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
              entry.speaker === 'user' 
                ? 'bg-primary text-white' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              <p className="text-sm font-medium mb-1">
                {entry.speaker === 'user' ? 'Siz' : 'DOĞA'}
              </p>
              <p className={`text-sm ${entry.isFinal === false ? 'opacity-70' : ''}`}>
                {entry.text}
              </p>
            </div>
          </motion.div>
        ))}
        
        {/* Current transcript preview */}
        {currentTranscript && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex ${isUserSpeaking ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] rounded-lg px-4 py-2 opacity-50 ${
              isUserSpeaking 
                ? 'bg-primary/50 text-white' 
                : 'bg-gray-100 text-gray-600'
            }`}>
              <p className="text-sm italic">{currentTranscript}...</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
