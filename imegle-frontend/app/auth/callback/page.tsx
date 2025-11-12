'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'

function AuthCallbackContent() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    // Get params from URL directly (more reliable than useSearchParams)
    if (typeof window === 'undefined') {
      return
    }

    try {
      const params = new URLSearchParams(window.location.search)
      const token = params.get('token')
      const userStr = params.get('user')
      const error = params.get('error')

      console.log('🚀 Deployment test - Build timestamp:', new Date().toISOString())

      if (error) {
        console.error('OAuth error:', error)
        setStatus('error')
        // Redirect to home after showing error
        setTimeout(() => {
          router.push('/')
        }, 2000)
        return
      }

    if (token && userStr) {
        try {
          // Validate that userStr is valid JSON before storing
          const userData = JSON.parse(userStr)
          
      // Store token and user info
      localStorage.setItem('imegle_token', token)
          localStorage.setItem('imegle_user', JSON.stringify(userData)) // Ensure it's valid JSON
          setStatus('success')

          // Redirect to dashboard immediately
          router.push('/')
        } catch (err) {
          console.error('Error parsing or storing auth data:', err)
          setStatus('error')
          setTimeout(() => {
      router.push('/')
          }, 2000)
        }
    } else {
      // No token, redirect to home
        console.warn('No token or user in callback URL')
        setStatus('error')
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    } catch (err) {
      console.error('Error processing callback:', err)
      setStatus('error')
      setTimeout(() => {
      router.push('/')
      }, 2000)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
      <div className="text-center">
        {status === 'loading' && (
          <>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
        <p className="text-white text-xl">Completing login...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <p className="text-white text-xl">Login successful! Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <p className="text-white text-xl">Login failed. Redirecting...</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  )
}

