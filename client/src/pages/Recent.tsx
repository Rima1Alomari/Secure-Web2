import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaFile, FaVideo, FaUsers, FaClock, FaArrowRight, FaRobot, FaLightbulb, FaInbox } from 'react-icons/fa'
import CardSkeleton from '../components/CardSkeleton'

interface RecentItem {
  id: string
  type: 'file' | 'video' | 'room' | 'chat'
  name: string
  action: string
  timestamp: Date
}

const Recent = () => {
  const navigate = useNavigate()
  // Toggle this to show/hide empty state
  const hasData = false // Set to true to show data, false for empty state
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading for 600ms
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])
  
  const [recentItems, setRecentItems] = useState<RecentItem[]>([
    {
      id: '1',
      type: 'file',
      name: 'Project_Report.pdf',
      action: 'Opened',
      timestamp: new Date(Date.now() - 3600000)
    },
    {
      id: '2',
      type: 'video',
      name: 'Team Meeting',
      action: 'Joined',
      timestamp: new Date(Date.now() - 7200000)
    },
    {
      id: '3',
      type: 'room',
      name: 'Development Team',
      action: 'Entered',
      timestamp: new Date(Date.now() - 10800000)
    },
    {
      id: '4',
      type: 'file',
      name: 'Presentation.pptx',
      action: 'Edited',
      timestamp: new Date(Date.now() - 14400000)
    },
    {
      id: '5',
      type: 'chat',
      name: 'General Discussion',
      action: 'Messaged',
      timestamp: new Date(Date.now() - 18000000)
    }
  ])

  const getIcon = (type: string) => {
    switch (type) {
      case 'file':
        return <FaFile className="text-blue-600 dark:text-blue-400" />
      case 'video':
        return <FaVideo className="text-green-600 dark:text-green-400" />
      case 'room':
        return <FaUsers className="text-purple-600 dark:text-purple-400" />
      case 'chat':
        return <FaUsers className="text-orange-600 dark:text-orange-400" />
      default:
        return <FaFile />
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 60) {
      return `${minutes} minutes ago`
    } else if (hours < 24) {
      return `${hours} hours ago`
    } else {
      return `${days} days ago`
    }
  }

  const handleItemClick = (item: RecentItem) => {
    // Navigate based on type
    switch (item.type) {
      case 'file':
        window.location.href = '/files'
        break
      case 'video':
        window.location.href = `/video/${item.name}`
        break
      case 'room':
        window.location.href = '/rooms'
        break
      case 'chat':
        window.location.href = '/chat'
        break
    }
  }

  return (
    <div className="page-content">
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">
            Recent
          </h1>
          <p className="page-subtitle">
            View your recent activities
          </p>
        </div>

        {isLoading ? (
          <>
            {/* AI Features Section Skeleton */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <CardSkeleton />
              <CardSkeleton />
            </div>
            {/* Recent Items Skeleton */}
            <div className="card">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-6 animate-pulse">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-lg"></div>
                      <div className="flex-1">
                        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-48 mb-2"></div>
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : hasData && recentItems.length > 0 ? (
          <>
            {/* AI Features Section */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* AI Activity Insights */}
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                    <FaRobot className="text-white text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Activity Insights</h3>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Most Active Time</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">10:00 AM - 12:00 PM (Peak hours)</p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Activity Trend</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">↑ 15% increase this week</p>
                  </div>
                </div>
              </div>

          {/* AI Priority Suggestions */}
          <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                    <FaLightbulb className="text-white text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Priority Suggestions</h3>
                </div>
                <div className="space-y-2">
                  <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">High Priority</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Project_Report.pdf - Review needed</p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Follow-up</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Team Meeting - Action items pending</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          {getIcon(item.type)}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            {item.name}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <span>{item.action}</span>
                            <FaClock className="text-xs" />
                            <span>{formatTime(item.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                      <FaArrowRight className="text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="card p-12 md:p-16">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30 rounded-full mb-6">
                <FaInbox className="text-blue-600 dark:text-blue-400 text-4xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                No recent activity yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Your recent activities will appear here once you start using the platform. Get started by exploring rooms, uploading files, or scheduling events.
              </p>
              <button
                onClick={() => navigate('/rooms')}
                className="btn-primary mx-auto"
              >
                <FaUsers className="text-sm" />
                Go to Rooms
              </button>
            </div>

            {/* Suggested Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                Suggested Actions
              </h3>
              <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <button
                  onClick={() => navigate('/rooms')}
                  className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
                >
                  <FaVideo className="text-blue-600 dark:text-blue-400 text-xl mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">Join a Room</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Start collaborating</div>
                </button>
                <button
                  onClick={() => navigate('/files')}
                  className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-left group"
                >
                  <FaFile className="text-green-600 dark:text-green-400 text-xl mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">Upload Files</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Share documents</div>
                </button>
                <button
                  onClick={() => navigate('/calendar')}
                  className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left group"
                >
                  <FaClock className="text-purple-600 dark:text-purple-400 text-xl mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">View Calendar</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">See upcoming events</div>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Recent

