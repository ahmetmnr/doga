'use client';

import React, { useState } from 'react';
import UserRegistrationForm from '@/components/UserRegistrationForm';
import QuizInterface from '@/components/QuizInterface';

interface UserInfo {
  name: string;
  email: string;
  phone: string;
  optIn: boolean;
}

export default function HomePage() {
  const [currentView, setCurrentView] = useState<'registration' | 'quiz'>('registration');
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  
  const handleRegistrationSubmit = (userData: UserInfo) => {
    console.log('📋 User registered:', userData);
    setUserInfo(userData);
    setCurrentView('quiz');
  };
  
  const handleExitQuiz = () => {
    console.log('🚪 Exiting quiz');
    setCurrentView('registration');
    setUserInfo(null);
  };
  
  if (currentView === 'registration') {
    return <UserRegistrationForm onSubmit={handleRegistrationSubmit} />;
  }
  
  if (currentView === 'quiz' && userInfo) {
    return <QuizInterface userInfo={userInfo} onExit={handleExitQuiz} />;
  }
  
  return null;
}