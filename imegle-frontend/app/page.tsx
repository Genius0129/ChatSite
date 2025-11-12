'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import ChatInterface from '@/components/ChatInterface'
import Dashboard from '@/components/Dashboard'
import InterestsSelector from '@/components/InterestsSelector'

export default function Home() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [showDashboard, setShowDashboard] = useState(true)
  const [showInterests, setShowInterests] = useState(false)
  const [inChat, setInChat] = useState(false)
  const [interests, setInterests] = useState<string[]>([])
  const [stats, setStats] = useState({ onlineUsers: 0, waitingUsers: 0, activeChats: 0 })

  useEffect(() => {
    // Load interests from localStorage
    const savedInterests = localStorage.getItem('imegle_interests')
    if (savedInterests) {
      setInterests(JSON.parse(savedInterests))
    }

    // Initialize socket connection
    // Auto-detect server URL based on current hostname and protocol
    const getServerUrl = () => {
      if (typeof window !== 'undefined') {
        // PRIORITY 1: Use environment variable (set in Netlify)
        if (process.env.NEXT_PUBLIC_SERVER_URL) {
          console.log('🔗 Using NEXT_PUBLIC_SERVER_URL:', process.env.NEXT_PUBLIC_SERVER_URL)
          return process.env.NEXT_PUBLIC_SERVER_URL
        }
        
        // PRIORITY 2: Only use localhost fallback for local development
        const hostname = window.location.hostname
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
          const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:'
          console.log('🔗 Using localhost fallback:', `${protocol}//localhost:3002`)
          return `${protocol}//localhost:3002`
        }
        
        // PRIORITY 3: For deployed sites (Netlify, etc.), require env variable
        console.error('❌ NEXT_PUBLIC_SERVER_URL not set!')
        console.error('   Current hostname:', hostname)
        console.error('   Please set NEXT_PUBLIC_SERVER_URL in Netlify environment variables')
        // Don't show alert in production - just log error
        // Return empty string to prevent invalid URL construction
        return ''
      }
      return 'http://localhost:3002'
    }
    const serverUrl = getServerUrl()
    console.log('🚀 Connecting to server:', serverUrl)
    console.log('ddddddddddddddddddddd')

    
    // Don't attempt connection if server URL is invalid
    if (!serverUrl || serverUrl === '') {
      console.error('❌ Cannot connect: Server URL is not configured')
      setIsConnected(false)
      return
    }
    
    const newSocket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10, // More attempts for better reliability
      timeout: 20000,
      forceNew: false,
    })

    newSocket.on('connect', () => {
      console.log('✅ Connected to server')
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server')
      setIsConnected(false)
    })

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setIsConnected(false)
    })

    newSocket.on('stats-update', (data) => {
      setStats(data)
    })

    setSocket(newSocket)

    // Fetch initial stats (only if serverUrl is valid)
    if (serverUrl && serverUrl !== '') {
      fetch(`${serverUrl}/api/stats`)
        .then(res => res.json())
        .then(data => setStats(data))
        .catch(err => console.error('Failed to fetch stats:', err))
    }

    return () => {
      newSocket.close()
    }
  }, [])

  const handleStartChat = () => {
    if (!socket || !isConnected) {
      alert('Not connected to server. Please wait...')
      return
    }
    setShowDashboard(false)
    setShowInterests(false)
    setInChat(true)
    socket.emit('find-match', { interests })
  }

  const handleEditInterests = () => {
    setShowDashboard(false)
    setShowInterests(true)
  }

  const handleInterestsComplete = (selectedInterests: string[]) => {
    setInterests(selectedInterests)
    localStorage.setItem('imegle_interests', JSON.stringify(selectedInterests))
    setShowInterests(false)
    setShowDashboard(true)
  }

  const handleBackToDashboard = () => {
    if (socket && inChat) {
      socket.emit('next')
    }
    setInChat(false)
    setShowDashboard(true)
    setShowInterests(false)
  }

  if (showInterests) {
    return (
      <InterestsSelector
        initialInterests={interests}
        onComplete={handleInterestsComplete}
        onBack={() => {
          setShowInterests(false)
          setShowDashboard(true)
        }}
      />
    )
  }

  if (inChat && socket) {
    return (
      <ChatInterface
        socket={socket}
        onBack={handleBackToDashboard}
      />
    )
  }

  return (
    <Dashboard
      socket={socket}
      isConnected={isConnected}
      stats={stats}
      interests={interests}
      onStartChat={handleStartChat}
      onEditInterests={handleEditInterests}
    />
  )
}

