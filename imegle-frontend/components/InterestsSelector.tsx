'use client'

import { useState } from 'react'
import { HiCheck, HiArrowLeft } from 'react-icons/hi2'

interface InterestsSelectorProps {
  initialInterests: string[]
  onComplete: (interests: string[]) => void
  onBack: () => void
}

const AVAILABLE_INTERESTS = [
  'Gaming', 'Music', 'Movies', 'Sports', 'Technology', 'Art',
  'Travel', 'Food', 'Fashion', 'Books', 'Fitness', 'Photography',
  'Cooking', 'Dancing', 'Comedy', 'Science', 'History', 'Nature',
  'Animals', 'Cars', 'Anime', 'Programming', 'Business', 'Education',
]

export default function InterestsSelector({ initialInterests, onComplete, onBack }: InterestsSelectorProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>(initialInterests)

  const toggleInterest = (interest: string) => {
    setSelectedInterests(prev =>
      prev.includes(interest)
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    )
  }

  const handleContinue = () => {
    onComplete(selectedInterests)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-2xl w-full border border-white/20">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-300 hover:text-white mb-4 transition"
          >
            <HiArrowLeft />
            <span>Back</span>
          </button>
          <h2 className="text-3xl font-bold text-white mb-2">Select Your Interests</h2>
          <p className="text-gray-300">
            Choose topics you're interested in to match with like-minded people
          </p>
        </div>

        {/* Selected Interests Section */}
        {selectedInterests.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              Your Selected Interests ({selectedInterests.length})
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedInterests.map(interest => (
                <div
                  key={interest}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600/30 border border-purple-400/50 rounded-full text-white"
                >
                  <HiCheck className="text-purple-300" />
                  <span className="font-medium">{interest}</span>
                  <button
                    onClick={() => toggleInterest(interest)}
                    className="ml-1 text-purple-200 hover:text-white transition"
                    aria-label={`Remove ${interest}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Interests Grid */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-3">
            {selectedInterests.length > 0 ? 'Select More Interests' : 'Select Your Interests'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {AVAILABLE_INTERESTS.map(interest => {
              const isSelected = selectedInterests.includes(interest)
              return (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`p-4 rounded-lg border-2 transition-all transform hover:scale-105 ${
                    isSelected
                      ? 'bg-purple-600 border-purple-400 text-white'
                      : 'bg-white/5 border-white/20 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{interest}</span>
                    {isSelected && <HiCheck className="text-white" />}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Continue Button */}
        <div className="flex justify-end">
          <button
            onClick={handleContinue}
            disabled={selectedInterests.length === 0}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue ({selectedInterests.length} selected)
          </button>
        </div>
      </div>
    </div>
  )
}

