'use client'

import { useEffect, useState } from 'react'
import { HiExclamationTriangle } from 'react-icons/hi2'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

interface Toast {
  id: string
  message: string
  type: ToastType
}

let toastId = 0
const toastListeners: Array<(toasts: Toast[]) => void> = []
let toasts: Toast[] = []

const notify = (message: string, type: ToastType = 'info') => {
  const id = `toast-${++toastId}`
  const newToast: Toast = { id, message, type }
  toasts = [...toasts, newToast]
  toastListeners.forEach(listener => listener(toasts))
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    removeToast(id)
  }, 5000)
}

const removeToast = (id: string) => {
  toasts = toasts.filter(t => t.id !== id)
  toastListeners.forEach(listener => listener(toasts))
}

export const toast = {
  success: (message: string) => notify(message, 'success'),
  error: (message: string) => notify(message, 'error'),
  warning: (message: string) => notify(message, 'warning'),
  info: (message: string) => notify(message, 'info'),
}

export default function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([])

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setCurrentToasts(newToasts)
    }
    toastListeners.push(listener)
    setCurrentToasts(toasts)
    
    return () => {
      const index = toastListeners.indexOf(listener)
      if (index > -1) {
        toastListeners.splice(index, 1)
      }
    }
  }, [])

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <span className="text-green-400 text-xl">✓</span>
      case 'error':
        return <HiExclamationTriangle className="text-red-400" size={20} />
      case 'warning':
        return <HiExclamationTriangle className="text-yellow-400" size={20} />
      case 'info':
        return <HiExclamationTriangle className="text-blue-400" size={20} />
      default:
        return <HiExclamationTriangle className="text-gray-400" size={20} />
    }
  }

  const getBgColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'bg-green-900/90 border-green-700'
      case 'error':
        return 'bg-red-900/90 border-red-700'
      case 'warning':
        return 'bg-yellow-900/90 border-yellow-700'
      case 'info':
        return 'bg-blue-900/90 border-blue-700'
    }
  }

  if (currentToasts.length === 0) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {currentToasts.map(toast => {
        const icon = getIcon(toast.type)
        const bgColor = getBgColor(toast.type)
        
        return (
          <div
            key={toast.id}
            className={`${bgColor} backdrop-blur-lg border rounded-lg p-4 min-w-[300px] max-w-[400px] shadow-lg flex items-start gap-3 animate-slide-in`}
          >
            {icon}
            <p className="flex-1 text-white text-sm">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-white transition text-xl font-bold leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}

