'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';
import { LeaderboardEntry } from '@/types/quiz';

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);
  
  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const getIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Award className="w-5 h-5 text-orange-600" />;
      default:
        return <span className="text-gray-500 font-bold">{rank}</span>;
    }
  };
  
  return (
    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 shadow-xl text-white">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <Trophy className="w-6 h-6" />
          Liderlik Tablosu
        </h3>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-white/70">
          <p>Henüz skor kaydı yok</p>
          <p className="text-sm mt-2">İlk olan siz olun!</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
          {entries.map((entry, index) => (
            <motion.div
              key={`${entry.name}-${index}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-center justify-between p-3 rounded-lg ${
                entry.rank <= 3 
                  ? 'bg-white/20 backdrop-blur-sm' 
                  : 'bg-white/10'
              } hover:bg-white/25 transition-colors`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 flex justify-center">
                  {getIcon(entry.rank)}
                </div>
                <div>
                  <p className="font-semibold">{entry.name}</p>
                  <p className="text-xs text-white/60">
                    {new Date(entry.date).toLocaleDateString('tr-TR')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{entry.score}</p>
                <p className="text-xs text-white/60">puan</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
