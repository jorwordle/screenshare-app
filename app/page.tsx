'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Monitor, Users, Shield, Zap } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const createRoom = () => {
    if (!userName.trim()) {
      alert('Please enter your name');
      return;
    }
    const newRoomCode = uuidv4().split('-')[0].toUpperCase();
    router.push(`/room/${newRoomCode}?name=${encodeURIComponent(userName)}`);
  };

  const joinRoom = () => {
    if (!userName.trim() || !roomCode.trim()) {
      alert('Please enter your name and room code');
      return;
    }
    router.push(`/room/${roomCode.toUpperCase()}?name=${encodeURIComponent(userName)}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 dark:text-white mb-4">
            ScreenShare Pro
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            P2P Screen Sharing & Real-time Chat
          </p>
        </header>

        <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Name
              </label>
              <input
                id="name"
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Enter your name"
                maxLength={30}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">Choose an option</span>
              </div>
            </div>

            {!isCreating ? (
              <div className="space-y-4">
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Create New Room
                </button>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="Enter room code"
                    maxLength={10}
                  />
                  <button
                    onClick={joinRoom}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                  >
                    Join Existing Room
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  onClick={createRoom}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Start New Room
                </button>
                <button
                  onClick={() => setIsCreating(false)}
                  className="w-full bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                >
                  Back
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Monitor className="w-8 h-8 text-blue-600 dark:text-blue-300" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-white">1080p/60FPS</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">High quality screen sharing</p>
          </div>
          
          <div className="text-center">
            <div className="bg-green-100 dark:bg-green-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-8 h-8 text-green-600 dark:text-green-300" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-white">P2P Connection</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Direct peer-to-peer</p>
          </div>
          
          <div className="text-center">
            <div className="bg-purple-100 dark:bg-purple-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Shield className="w-8 h-8 text-purple-600 dark:text-purple-300" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Secure</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">End-to-end encrypted</p>
          </div>
          
          <div className="text-center">
            <div className="bg-orange-100 dark:bg-orange-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="w-8 h-8 text-orange-600 dark:text-orange-300" />
            </div>
            <h3 className="font-semibold text-gray-800 dark:text-white">Low Latency</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Real-time communication</p>
          </div>
        </div>
      </div>
    </div>
  );
}