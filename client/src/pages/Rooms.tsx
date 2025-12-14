import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaPlus, FaUsers, FaLock, FaUnlock, FaVideo, FaSignInAlt, FaRobot, FaMicrophone, FaLanguage, FaDoorOpen, FaCalendarAlt } from 'react-icons/fa'
import CardSkeleton from '../components/CardSkeleton'

interface Room {
  id: string
  name: string
  description: string
  isPrivate: boolean
  members: number
  maxMembers: number
}

const Rooms = () => {
  // Toggle this to show/hide empty state
  const hasData = false // Set to true to show data, false for empty state
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Simulate loading for 600ms
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])
  
  const [rooms, setRooms] = useState<Room[]>([
    {
      id: '1',
      name: 'General Discussion',
      description: 'Main room for team discussions',
      isPrivate: false,
      members: 12,
      maxMembers: 50
    },
    {
      id: '2',
      name: 'Project Alpha',
      description: 'Project planning and updates',
      isPrivate: true,
      members: 5,
      maxMembers: 20
    },
    {
      id: '3',
      name: 'Development Team',
      description: 'Technical discussions and code reviews',
      isPrivate: false,
      members: 8,
      maxMembers: 30
    }
  ])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newRoom, setNewRoom] = useState({ name: '', description: '', isPrivate: false })

  const handleCreateRoom = () => {
    if (newRoom.name.trim()) {
      const room: Room = {
        id: Date.now().toString(),
        name: newRoom.name,
        description: newRoom.description,
        isPrivate: newRoom.isPrivate,
        members: 1,
        maxMembers: 50
      }
      setRooms([...rooms, room])
      setNewRoom({ name: '', description: '', isPrivate: false })
      setShowCreateModal(false)
    }
  }

  const handleJoinRoom = (roomId: string) => {
    // Navigate to video room
    window.location.href = `/video/${rooms.find(r => r.id === roomId)?.name || 'room'}`
  }

  return (
    <div className="page-content">
      <div className="page-container">
        <div className="flex justify-between items-center page-header">
          <div>
            <h1 className="page-title">
              Rooms
            </h1>
            <p className="page-subtitle">
              Join rooms or create a new room
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <FaPlus className="text-sm" /> Create Room
          </button>
        </div>

        {isLoading ? (
          <>
            {/* AI Features Section Skeleton */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
            {/* Rooms Grid Skeleton */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          </>
        ) : hasData && rooms.length > 0 ? (
          <>
            {/* AI Features Section */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* AI Meeting Assistant */}
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                    <FaRobot className="text-white text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Meeting Assistant</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">AI-powered meeting insights and suggestions. Get real-time meeting assistance with auto-generated notes and action item extraction.</p>
                <div className="space-y-2">
                  <div className="p-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                    ✓ Auto-generate meeting notes
                  </div>
                  <div className="p-2 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                    ✓ Action item extraction
                  </div>
                </div>
              </div>

              {/* Real-time Speech-to-Text (STT) */}
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                    <FaMicrophone className="text-white text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Speech-to-Text</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Real-time transcription of meetings</p>
                <div className="flex items-center gap-2">
                  <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors duration-200 shadow-md">
                    Start Recording
                  </button>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Live</span>
                </div>
              </div>

              {/* AI Live Translation */}
              <div className="card">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-blue-500 to-green-600 rounded-xl flex items-center justify-center">
                    <FaLanguage className="text-white text-xl" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">AI Translation</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Real-time multi-language translation</p>
                <select className="w-full px-3 py-2 bg-white dark:bg-gray-700 border-2 border-blue-200/50 dark:border-blue-800/50 rounded-xl text-sm text-gray-900 dark:text-white">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>Arabic</option>
                </select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="card-hover"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {room.isPrivate ? (
                        <FaLock className="text-gray-500 dark:text-gray-400" />
                      ) : (
                        <FaUnlock className="text-gray-500 dark:text-gray-400" />
                      )}
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">{room.name}</h3>
                    </div>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">{room.description}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <FaUsers />
                      <span>{room.members}/{room.maxMembers}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleJoinRoom(room.id)}
                    className="w-full btn-primary"
                  >
                    <FaSignInAlt /> Join
                  </button>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="card p-12 md:p-16">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/30 dark:to-green-900/30 rounded-full mb-6">
                <FaDoorOpen className="text-blue-600 dark:text-blue-400 text-4xl" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                No rooms yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                Create your first room to start collaborating with your team. Rooms are perfect for meetings, discussions, and real-time collaboration.
              </p>
            </div>

            {/* Suggested Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8 mt-8">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
                Suggested Actions
              </h3>
              <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left group"
                >
                  <FaVideo className="text-blue-600 dark:text-blue-400 text-xl mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">Create Meeting Room</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Start a video meeting room</div>
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all text-left group"
                >
                  <FaUsers className="text-green-600 dark:text-green-400 text-xl mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">Join Existing Room</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Browse available rooms</div>
                </button>
                <button
                  onClick={() => navigate('/calendar')}
                  className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left group"
                >
                  <FaCalendarAlt className="text-purple-600 dark:text-purple-400 text-xl mb-2 group-hover:scale-110 transition-transform" />
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">Schedule Meeting</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Plan your next meeting</div>
                </button>
              </div>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-200 dark:border-gray-700 shadow-xl">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
                Create New Room
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Room Name
                  </label>
                  <input
                    type="text"
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Enter room name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newRoom.description}
                    onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="Enter room description"
                    rows={3}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="private"
                    checked={newRoom.isPrivate}
                    onChange={(e) => setNewRoom({ ...newRoom, isPrivate: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="private" className="text-sm text-gray-700 dark:text-gray-300">
                    Private Room
                  </label>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleCreateRoom}
                    className="flex-1 btn-primary"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Rooms

