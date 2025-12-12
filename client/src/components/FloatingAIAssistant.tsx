import { useState } from 'react'
import { FaRobot, FaTimes } from 'react-icons/fa'
import AIChatbot from './AIChatbot'

const FloatingAIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Robot Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-br from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 rounded-full shadow-lg transition-colors duration-200 flex items-center justify-center ${
          isOpen ? 'rotate-180' : ''
        }`}
        aria-label="AI Assistant"
      >
        {isOpen ? (
          <FaTimes className="text-white text-2xl transition-transform duration-300" />
        ) : (
          <FaRobot className="text-white text-xl" />
        )}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
        )}
      </button>

      {/* AI Chatbot Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Chatbot Window */}
          <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] animate-slide-up">
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-lg rounded-xl border border-gray-200 dark:border-gray-700 shadow-xl h-full flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                    <FaRobot className="text-white text-base" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">AI Assistant</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Always here to help</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <FaTimes className="text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <AIChatbot placeholder="Ask me anything..." title="" />
            </div>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default FloatingAIAssistant

