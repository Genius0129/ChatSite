'use client'

import { useState, useEffect } from 'react'
import { HiUserCircle } from 'react-icons/hi2'
import { HiLogout } from 'react-icons/hi'
import axios from 'axios'
import GoogleLogin from './GoogleLogin'
import SubscriptionPlans from './SubscriptionPlans'

interface User {
  id: string
  email: string
  name: string
  picture?: string
  plan: 'free' | 'premium' | 'pro'
  subscriptionExpiry?: number
}

interface UserProfileProps {
  onLogin: (token: string, user: User) => void
  onLogout: () => void
}

export default function UserProfile({ onLogin, onLogout }: UserProfileProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [showPlans, setShowPlans] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing token
    const savedToken = localStorage.getItem('imegle_token')
    const savedUser = localStorage.getItem('imegle_user')

    if (savedToken && savedUser) {
      try {
        // Try to parse user data
        const userData = JSON.parse(savedUser)
        setToken(savedToken)
        setUser(userData)
        // Verify token is still valid
        verifyToken(savedToken)
      } catch (err) {
        // Invalid JSON - clear corrupted data
        console.error('Invalid user data in localStorage, clearing:', err)
        localStorage.removeItem('imegle_token')
        localStorage.removeItem('imegle_user')
        setLoading(false)
      }
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const verifyToken = async (authToken: string) => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      })
      setUser(response.data)
      setToken(authToken)
    } catch (error) {
      // Token invalid, clear storage
      localStorage.removeItem('imegle_token')
      localStorage.removeItem('imegle_user')
      setUser(null)
      setToken(null)
    } finally {
      setLoading(false)
    }
  }

  const handleLoginSuccess = (authToken: string, userData: User) => {
    setToken(authToken)
    setUser(userData)
    localStorage.setItem('imegle_token', authToken)
    localStorage.setItem('imegle_user', JSON.stringify(userData))
    onLogin(authToken, userData)
  }

  const handleLogout = () => {
    localStorage.removeItem('imegle_token')
    localStorage.removeItem('imegle_user')
    setToken(null)
    setUser(null)
    onLogout()
  }

  const handleSubscribeSuccess = async () => {
    // Refresh user data
    if (token) {
      await verifyToken(token)
    }
    setShowPlans(false)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-300">
        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    )
  }

  if (showPlans && token) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
        <div className="min-h-screen py-8">
          <div className="flex justify-end pr-8 mb-4">
            <button
              onClick={() => setShowPlans(false)}
              className="text-white hover:text-gray-300 text-2xl"
            >
              ×
            </button>
          </div>
          <SubscriptionPlans
            token={token}
            currentPlan={user?.plan || 'free'}
            onSubscribe={handleSubscribeSuccess}
          />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center gap-4">
        <GoogleLogin onLoginSuccess={handleLoginSuccess} />
      </div>
    )
  }

  const isPremium = user.plan !== 'free'
  const daysLeft = user.subscriptionExpiry
    ? Math.ceil((user.subscriptionExpiry - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-3 bg-white/10 backdrop-blur-lg rounded-lg px-4 py-2 border border-white/20">
        {user.picture ? (
          <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-full" />
        ) : (
          <HiUserCircle className="text-white text-2xl" />
        )}
        <div className="text-sm">
          <div className="text-white font-medium">{user.name}</div>
          <div className="flex items-center gap-2 text-xs">
            {isPremium ? (
              <>
                <span className="text-yellow-400">👑</span>
                <span className="text-yellow-400">{user.plan.toUpperCase()}</span>
                {daysLeft > 0 && <span className="text-gray-400">({daysLeft}d left)</span>}
              </>
            ) : (
              <span className="text-gray-400">Free Plan</span>
            )}
          </div>
        </div>
      </div>

      {!isPremium && (
        <button
          onClick={() => setShowPlans(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition text-sm font-semibold"
        >
          Upgrade
        </button>
      )}

      <button
        onClick={handleLogout}
        className="p-2 text-gray-300 hover:text-white transition"
        title="Logout"
      >
        <HiLogout size={20} />
      </button>
    </div>
  )
}

