'use client';

import React from 'react';

interface AvatarProps {
  isListening: boolean;
  isSpeaking: boolean;
}

export default function Avatar({ isListening, isSpeaking }: AvatarProps) {
  const bars = Array.from({ length: 5 });
  
  return (
    <div className="relative flex items-center justify-center">
      {/* Background glow effect */}
      <div className={`absolute w-40 h-40 rounded-full bg-primary/20 blur-xl transition-all duration-1000 ${isSpeaking ? 'opacity-60 scale-110' : 'opacity-30'}`} />
      
      {/* Avatar circle */}
      <div className={`relative z-10 w-32 h-32 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-xl transition-all duration-300 ${isSpeaking || isListening ? 'avatar-glow scale-105' : ''}`}>
        {/* Sound wave visualization */}
        <div className="flex items-center gap-1">
          {bars.map((_, index) => (
            <div
              key={index}
              className={`w-1 bg-white rounded-full transition-all duration-300 ${
                isSpeaking ? 'h-6 opacity-100' : 
                isListening ? 'h-4 opacity-80' : 
                'h-1 opacity-50'
              }`}
              style={{ 
                animationDelay: `${index * 0.1}s`,
                animation: (isSpeaking || isListening) ? 'pulse 1s ease-in-out infinite' : 'none'
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Status text */}
      <div className="absolute -bottom-8 text-center">
        <p className="text-sm font-medium text-gray-600 transition-colors duration-300">
          {isSpeaking ? 'DOĞA konuşuyor...' : isListening ? 'Dinliyorum...' : 'Hazır'}
        </p>
      </div>
    </div>
  );
}
