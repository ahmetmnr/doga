'use client';

import React, { useState } from 'react';
import { User, Mail, Phone, Check, X } from 'lucide-react';

interface UserInfo {
  name: string;
  email: string;
  phone: string;
  optIn: boolean;
}

interface UserRegistrationFormProps {
  onSubmit: (userInfo: UserInfo) => void;
}

export default function UserRegistrationForm({ onSubmit }: UserRegistrationFormProps) {
  const [formData, setFormData] = useState<UserInfo>({
    name: '',
    email: '',
    phone: '',
    optIn: false
  });
  
  const [errors, setErrors] = useState<Partial<UserInfo>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<UserInfo> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Ad soyad gereklidir';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'E-posta adresi gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir e-posta adresi giriniz';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefon numarası gereklidir';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof UserInfo, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-green-50 flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="text-3xl font-bold text-primary mb-2">
            DOĞA
          </h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Sıfır Atık Sesli Bilgi Yarışması
          </h2>
          <p className="text-gray-600">
            Yarışmaya katılmak için lütfen bilgilerinizi giriniz
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 shadow-xl">
          {/* Name Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Ad Soyad *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.name ? 'border-red-500' : 'border-gray-300 focus:border-primary'
              }`}
              placeholder="Adınızı ve soyadınızı giriniz"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <X className="w-4 h-4 mr-1" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              E-posta Adresi *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.email ? 'border-red-500' : 'border-gray-300 focus:border-primary'
              }`}
              placeholder="ornek@email.com"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <X className="w-4 h-4 mr-1" />
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone Field */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Telefon Numarası *
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                errors.phone ? 'border-red-500' : 'border-gray-300 focus:border-primary'
              }`}
              placeholder="0555 123 45 67"
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <X className="w-4 h-4 mr-1" />
                {errors.phone}
              </p>
            )}
          </div>

          {/* Consent Checkbox */}
          <div className="mb-8">
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative flex items-center">
                <input
                  type="checkbox"
                  checked={formData.optIn}
                  onChange={(e) => handleInputChange('optIn', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  formData.optIn 
                    ? 'bg-primary border-primary text-white' 
                    : 'border-gray-300 hover:border-primary'
                }`}>
                  {formData.optIn && <Check className="w-3 h-3" />}
                </div>
              </div>
              <span className="text-sm text-gray-700 leading-relaxed">
                Sıfır Atık Projesi hakkında SMS ve e-posta ile bilgilendirilmek istiyorum.
                <br />
                <span className="text-xs text-gray-500">
                  (Bu bilgiler sadece yarışma ve bilgilendirme amaçlı kullanılacaktır)
                </span>
              </span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-primary to-secondary text-white font-semibold py-4 px-6 rounded-lg hover:from-secondary hover:to-primary transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            🎤 Yarışmaya Başla
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>🌿 Sıfır Atık için El Ele</p>
          <p className="mt-1">Emine Erdoğan Hanımefendi himayelerinde</p>
        </div>
      </div>
    </div>
  );
}
