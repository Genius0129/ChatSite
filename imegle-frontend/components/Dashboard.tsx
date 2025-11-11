'use client'

import { useEffect, useState } from 'react'
import { Socket } from 'socket.io-client'
import { HiVideoCamera, HiChatBubbleLeftRight, HiCursorArrowRays, HiLockClosed } from 'react-icons/hi2'
import UserProfile from './UserProfile'

interface DashboardProps {
  socket: Socket | null
  isConnected: boolean
  stats: { onlineUsers: number; waitingUsers: number; activeChats: number }
  interests: string[]
  onStartChat: () => void
  onEditInterests: () => void
}

export default function Dashboard({
  socket,
  isConnected,
  stats,
  interests,
  onStartChat,
  onEditInterests,
}: DashboardProps) {
  useEffect(() => {
    if (socket) {
      socket.on('stats-update', (data) => {
        // Stats updated via parent component
      })
    }
  }, [socket])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Animated background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="text-center flex-1">
            <h1 className="text-6xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400">
              imegle.io
            </h1>
            <p className="text-xl text-gray-300 mb-6">
              Connect with strangers around the world
            </p>
            
            {/* Connection Status */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
              <span className="text-sm text-gray-400">
                {isConnected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
          
          {/* User Profile */}
          <div className="mt-4">
            <UserProfile onLogin={() => {}} onLogout={() => {}} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-3xl font-bold text-white mb-2">{stats.onlineUsers}</div>
            <div className="text-gray-300">Online Users</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-3xl font-bold text-white mb-2">{stats.waitingUsers}</div>
            <div className="text-gray-300">Waiting</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-3xl font-bold text-white mb-2">{stats.activeChats}</div>
            <div className="text-gray-300">Active Chats</div>
          </div>
        </div>

        {/* Main Action Button */}
        <div className="text-center mb-12">
          {interests.length > 0 ? (
            <button
              onClick={onStartChat}
              disabled={!isConnected}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-xl font-semibold rounded-full hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl"
            >
              Start Chatting
            </button>
          ) : (
            <button
              onClick={onEditInterests}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xl font-semibold rounded-full hover:from-blue-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-2xl"
            >
              Select Interests & Start
            </button>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <div
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all cursor-pointer transform hover:scale-105"
            onClick={onEditInterests}
          >
            <div className="text-4xl mb-4 text-purple-400">
              <HiCursorArrowRays />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Interest Matching</h3>
            <p className="text-gray-300 text-sm mb-2">Connect with people who share your passions</p>
            <div className="text-xs text-purple-300">Click to {interests.length === 0 ? 'select interests' : 'edit interests'}</div>
          </div>

          <div
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all cursor-pointer transform hover:scale-105"
            onClick={() => interests.length > 0 ? onStartChat() : onEditInterests()}
          >
            <div className="text-4xl mb-4 text-blue-400">
              <HiVideoCamera />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Video Chat</h3>
            <p className="text-gray-300 text-sm mb-2">Face-to-face conversations with strangers</p>
            <div className="text-xs text-blue-300">Click to {interests.length === 0 ? 'get started' : 'start video chat'}</div>
          </div>

          <div
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all cursor-pointer transform hover:scale-105"
            onClick={() => interests.length > 0 ? onStartChat() : onEditInterests()}
          >
            <div className="text-4xl mb-4 text-pink-400">
              <HiChatBubbleLeftRight />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Text Messaging</h3>
            <p className="text-gray-300 text-sm mb-2">Chat in real-time with instant messages</p>
            <div className="text-xs text-pink-300">Click to {interests.length === 0 ? 'get started' : 'start chatting'}</div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="text-4xl mb-4 text-green-400">
              <HiLockClosed />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Safe & Secure</h3>
            <p className="text-gray-300 text-sm">Report inappropriate behavior anytime</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}

