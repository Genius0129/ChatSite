'use client'

import { HiUserCircle } from 'react-icons/hi2'

interface GoogleLoginProps {
  onLoginSuccess: (token: string, user: any) => void
}

function LoginButton({ onLoginSuccess }: GoogleLoginProps) {
  const handleLogin = () => {
    // Redirect to backend OAuth endpoint
    window.location.href = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/auth/google`
  }

  return (
    <button
      onClick={handleLogin}
      className="flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition font-semibold"
    >
      <HiUserCircle size={20} />
      Sign in with Google
    </button>
  )
}

export default function GoogleLogin({ onLoginSuccess }: GoogleLoginProps) {
  return <LoginButton onLoginSuccess={onLoginSuccess} />
}

