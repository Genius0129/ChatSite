'use client'

import { useState, useEffect } from 'react'
import { HiCheck, HiXMark } from 'react-icons/hi2'
import axios from 'axios'

interface Plan {
  id: string
  name: string
  price: number
  duration: number
  features: string[]
}

interface SubscriptionPlansProps {
  token: string
  currentPlan: string
  onSubscribe: () => void
}

export default function SubscriptionPlans({ token, currentPlan, onSubscribe }: SubscriptionPlansProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchPlans()
  }, [])

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/payment/plans`)
      setPlans(response.data)
    } catch (error) {
      console.error('Failed to fetch plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (planId: string) => {
    setSelectedPlan(planId)
    setProcessing(true)

    try {
      // Create order
      const orderResponse = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URL}/api/payment/create-order`,
        { planId },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const { orderId, amount, keyId } = orderResponse.data

      // Initialize Razorpay
      const options = {
        key: keyId,
        amount: amount,
        currency: 'INR',
        name: 'imegle.io',
        description: `Subscribe to ${planId} plan`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            // Verify payment
            await axios.post(
              `${process.env.NEXT_PUBLIC_SERVER_URL}/api/payment/verify`,
              {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                planId,
              },
              {
                headers: { Authorization: `Bearer ${token}` },
              }
            )

            alert('Subscription activated successfully!')
            onSubscribe()
          } catch (error: any) {
            console.error('Payment verification failed:', error)
            alert('Payment verification failed. Please contact support.')
          } finally {
            setProcessing(false)
            setSelectedPlan(null)
          }
        },
        prefill: {
          email: '', // You can get this from user profile
        },
        theme: {
          color: '#8b5cf6',
        },
      }

      const razorpay = new (window as any).Razorpay(options)
      razorpay.open()
    } catch (error: any) {
      console.error('Failed to create order:', error)
      alert('Failed to initiate payment. Please try again.')
      setProcessing(false)
      setSelectedPlan(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-white mb-2 text-center">Choose Your Plan</h2>
      <p className="text-gray-300 text-center mb-8">Unlock premium features and enhance your chat experience</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id
          const isSelected = selectedPlan === plan.id

          return (
            <div
              key={plan.id}
              className={`bg-white/10 backdrop-blur-lg rounded-2xl p-8 border-2 ${
                isCurrentPlan ? 'border-green-500' : 'border-white/20'
              } ${isSelected ? 'ring-2 ring-purple-500' : ''}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <div className="text-4xl font-bold text-white">
                    ₹{plan.price}
                    <span className="text-lg text-gray-300">/month</span>
                  </div>
                </div>
                {isCurrentPlan && (
                  <span className="px-3 py-1 bg-green-500 text-white text-sm rounded-full">Active</span>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-gray-300">
                    <HiCheck className="text-green-400 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={isCurrentPlan || processing}
                className={`w-full py-3 rounded-lg font-semibold transition ${
                  isCurrentPlan
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : processing && isSelected
                    ? 'bg-purple-700 text-white cursor-wait'
                    : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                }`}
              >
                {isCurrentPlan
                  ? 'Current Plan'
                  : processing && isSelected
                  ? 'Processing...'
                  : 'Subscribe Now'}
              </button>
            </div>
          )
        })}
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => window.location.reload()}
          className="text-gray-400 hover:text-white transition"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

