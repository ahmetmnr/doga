'use client';

import React from 'react';
import { Question } from '@/types/quiz';

interface QuestionPanelProps {
  question: Question | null;
  questionNumber: number;
  totalQuestions: number;
}

export default function QuestionPanel({ question, questionNumber, totalQuestions }: QuestionPanelProps) {
  if (!question) {
    return (
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl">
        <div className="text-center text-gray-500">
          <p>Yarışma başlamak için hazır...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl animate-slide-up">
      {/* Question header */}
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm font-medium text-gray-500">
          Soru {questionNumber} / {totalQuestions}
        </span>
        <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
          {question.points} Puan
        </span>
      </div>
      
      {/* Question text */}
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        {question.question}
      </h2>
      
      {/* Options for MCQ */}
      {question.type === 'mcq' && question.options && (
        <div className="space-y-3">
          {question.options.map((option, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-primary/30 transition-colors animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <p className="text-lg">{option}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Open question indicator */}
      {question.type === 'open' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-blue-700 font-medium">
            💭 Açık uçlu soru - Cevabınızı sesli olarak söyleyin
          </p>
        </div>
      )}
    </div>
  );
}
