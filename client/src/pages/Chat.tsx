import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaPaperPlane, FaUser, FaLightbulb, FaComments, FaUsers, FaVideo, FaCalendarAlt } from 'react-icons/fa'

interface Message {
  id: string
  sender: string
  message: string
  timestamp: Date
  isOwn: boolean
}

const Chat = () => {
  // Toggle this to show/hide empty state
  const hasData = false // Set to true to show data, false for empty state
  const navigate = useNavigate()
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'John Doe',
      message: 'Hello everyone! How is the project going?',
      timestamp: new Date(Date.now() - 3600000),
      isOwn: false
    },
    {
      id: '2',
      sender: 'You',
      message: 'Everything is on track! We should have a demo ready by next week.',
      timestamp: new Date(Date.now() - 3300000),
      isOwn: true
    },
    {
      id: '3',
      sender: 'Jane Smith',
      message: 'Great! Looking forward to seeing it.',
      timestamp: new Date(Date.now() - 3000000),
      isOwn: false
    }
  ])
  const [newMessage, setNewMessage] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        sender: 'You',
        message: newMessage,
        timestamp: new Date(),
        isOwn: true
      }
      setMessages([...messages, message])
      setNewMessage('')
      setAiSuggestions([])
      
      // Simulate AI auto-reply suggestions
      setTimeout(() => {
        setAiSuggestions([
          "Thanks for the update!",
          "I'll follow up on that.",
          "Sounds good to me!"
        ])
      }, 500)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setNewMessage(suggestion)
    setAiSuggestions([])
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="page-content">
      <div className="max-w-4xl mx-auto">
        <div className="page-header">
          <h1 className="page-title">
            Chat
          </h1>
          <p className="page-subtitle">
            Communicate with your team in real-time
          </p>
        </div>

        <div className="card flex flex-col" style={{ height: 'calc(100vh - 250px)' }}>
          {/* Messages Area */}
          {hasData && messages.length > 0 ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.isOwn ? 'flex-row-reverse' : ''}`}
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                    <FaUser className="text-white" />
                  </div>
                  <div className={`flex-1 ${msg.isOwn ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">{msg.sender}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{formatTime(msg.timestamp)}</span>
                    </div>
                    <div
                      className={`inline-block px-5 py-3 rounded-xl shadow-lg ${
                        msg.isOwn
                          ? 'bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-500 dark:to-green-500 text-white'
                          : 'bg-white dark:bg-gray-700 border-2 border-blue-200/50 dark:border-blue-800/50 text-gray-900 dark:text-white'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30 rounded-full mb-6">
                  <FaComments className="text-blue-600 dark:text-blue-400 text-4xl" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  Start a conversation
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-6">
                  Send a message to begin chatting with your team. Use the input below to start a conversation or explore other ways to connect.
                </p>
              </div>

              {/* Suggested Actions */}
              <div className="w-full max-w-2xl border-t border-gray-200 dark:border-gray-700 pt-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                  Suggested Actions
                </h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <button
                    onClick={() => navigate('/rooms')}
                    className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
                  >
                    <FaVideo className="text-blue-600 dark:text-blue-400 text-xl mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">Join a Room</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Start a video meeting</div>
                  </button>
                  <button
                    onClick={() => navigate('/calendar')}
                    className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left group"
                  >
                    <FaCalendarAlt className="text-purple-600 dark:text-purple-400 text-xl mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">Schedule Event</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Plan a team event</div>
                  </button>
                  <button
                    onClick={() => navigate('/files')}
                    className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-left group"
                  >
                    <FaUsers className="text-green-600 dark:text-green-400 text-xl mb-2 group-hover:scale-110 transition-transform" />
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">Share Files</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Collaborate on documents</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            {/* AI Auto-Reply Suggestions */}
            {aiSuggestions.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <FaLightbulb className="text-yellow-500" />
                  <span className="font-semibold">AI Suggestions:</span>
                </div>
                {aiSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800/50 rounded-lg text-xs text-gray-700 dark:text-gray-300 font-medium transition-colors duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-5 py-3.5 bg-white dark:bg-gray-700 border-2 border-blue-200/50 dark:border-blue-800/50 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm shadow-sm"
              />
              <button
                onClick={handleSendMessage}
                className="btn-primary"
              >
                <FaPaperPlane /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat

