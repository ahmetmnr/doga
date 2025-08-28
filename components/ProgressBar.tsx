'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface ProgressBarProps {
  currentQuestion: number;
  totalQuestions: number;
  answers: { correct: boolean }[];
  currentScore: number;
  totalPossibleScore: number;
}

export default function ProgressBar({ 
  currentQuestion, 
  totalQuestions, 
  answers, 
  currentScore,
  totalPossibleScore 
}: ProgressBarProps) {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-700">İlerleme</h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">{currentScore}</p>
          <p className="text-sm text-gray-500">/ {totalPossibleScore} puan</p>
        </div>
      </div>
      
      {/* Question progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Sorular</span>
          <span>{answers.length} / {totalQuestions}</span>
        </div>
        
        {/* Progress segments */}
        <div className="flex gap-1">
          {Array.from({ length: totalQuestions }).map((_, index) => {
            const isAnswered = index < answers.length;
            const isCorrect = answers[index]?.correct;
            const isCurrent = index === currentQuestion - 1;
            
            return (
              <motion.div
                key={index}
                className={`flex-1 h-8 rounded-lg flex items-center justify-center transition-all ${
                  isCurrent 
                    ? 'bg-blue-500 ring-2 ring-blue-300' 
                    : isAnswered 
                      ? isCorrect 
                        ? 'bg-green-500' 
                        : 'bg-red-500'
                      : 'bg-gray-200'
                }`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                {isAnswered && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    {isCorrect ? (
                      <Check className="w-4 h-4 text-white" />
                    ) : (
                      <X className="w-4 h-4 text-white" />
                    )}
                  </motion.div>
                )}
                {isCurrent && !isAnswered && (
                  <motion.div
                    className="w-2 h-2 bg-white rounded-full"
                    animate={{ scale: [1, 1.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                )}
              </motion.div>
            );
          })}
        </div>
        
        {/* Score breakdown */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-green-600">
              ✓ Doğru: {answers.filter(a => a.correct).length}
            </span>
            <span className="text-red-600">
              ✗ Yanlış: {answers.filter(a => !a.correct).length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
