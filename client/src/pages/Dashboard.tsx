import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { FaVideo, FaFile, FaUsers, FaCloud, FaArrowRight, FaShieldAlt, FaClock, FaLightbulb, FaPlus, FaCalendarAlt, FaUpload, FaLock } from 'react-icons/fa'
import CardSkeleton from '../components/CardSkeleton'
import { Modal, Toast } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { ROOMS_KEY, EVENTS_KEY, FILES_KEY } from '../data/keys'
import { Room, EventItem, FileItem } from '../types/models'

const Dashboard = () => {
  const navigate = useNavigate()
  const [channelName, setChannelName] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  // Modal states
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false)
  const [showStartMeetingModal, setShowStartMeetingModal] = useState(false)
  const [showNewEventModal, setShowNewEventModal] = useState(false)
  
  // Form states
  const [newRoom, setNewRoom] = useState({ name: '', description: '', isPrivate: false })
  const [newMeeting, setNewMeeting] = useState({ name: '', roomId: '' })
  const [newEvent, setNewEvent] = useState({ title: '', description: '', date: '', time: '', location: '' })
  
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  
  // Get existing rooms for meeting selection
  const existingRooms = getJSON<Room[]>(ROOMS_KEY, []) || []

  useEffect(() => {
    // Simulate loading for 600ms
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 600)
    return () => clearTimeout(timer)
  }, [])

  const handleJoinVideo = (e: React.FormEvent) => {
    e.preventDefault()
    if (channelName.trim()) {
      navigate(`/video/${channelName.trim()}`)
    } else {
      alert('Please enter a channel name')
    }
  }

  const handleOpenFiles = () => {
    navigate('/files')
  }

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'create-room':
        setShowCreateRoomModal(true)
        break
      case 'start-meeting':
        setShowStartMeetingModal(true)
        break
      case 'upload-file':
        handleUploadFile()
        break
      case 'new-event':
        setShowNewEventModal(true)
        break
    }
  }

  const handleCreateRoom = () => {
    if (!newRoom.name.trim()) {
      setToast({ message: 'Please enter a room name', type: 'error' })
      return
    }

    const room: Room = {
      id: uuid(),
      name: newRoom.name,
      description: newRoom.description,
      isPrivate: newRoom.isPrivate,
      members: 1,
      maxMembers: 50,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }

    const rooms = getJSON<Room[]>(ROOMS_KEY, []) || []
    setJSON(ROOMS_KEY, [...rooms, room])
    
    setToast({ message: 'Room created', type: 'success' })
    setShowCreateRoomModal(false)
    setNewRoom({ name: '', description: '', isPrivate: false })
  }

  const handleStartMeeting = () => {
    if (!newMeeting.name.trim()) {
      setToast({ message: 'Please enter a meeting name', type: 'error' })
      return
    }

    if (newMeeting.roomId) {
      navigate(`/rooms/${newMeeting.roomId}`)
    } else {
      navigate(`/meeting/${uuid()}`)
    }
    
    setToast({ message: 'Meeting started (Demo Mode)', type: 'info' })
    setShowStartMeetingModal(false)
    setNewMeeting({ name: '', roomId: '' })
  }

  const handleUploadFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.multiple = false
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      const fileItem: FileItem = {
        id: uuid(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: nowISO(),
        owner: 'Current User',
      }

      const files = getJSON<FileItem[]>(FILES_KEY, []) || []
      setJSON(FILES_KEY, [...files, fileItem])
      
      setToast({ message: `File "${file.name}" uploaded`, type: 'success' })
    }
    input.click()
  }

  const handleCreateEvent = () => {
    if (!newEvent.title.trim() || !newEvent.date || !newEvent.time) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      return
    }

    const event: EventItem = {
      id: uuid(),
      title: newEvent.title,
      description: newEvent.description,
      date: newEvent.date,
      time: newEvent.time,
      location: newEvent.location,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }

    const events = getJSON<EventItem[]>(EVENTS_KEY, []) || []
    setJSON(EVENTS_KEY, [...events, event])
    
    setToast({ message: 'Event created', type: 'success' })
    setShowNewEventModal(false)
    setNewEvent({ title: '', description: '', date: '', time: '', location: '' })
  }

  // Get recent files and upcoming events for display
  const recentFiles = getJSON<FileItem[]>(FILES_KEY, [])?.slice(-3).reverse() || []
  const upcomingEvents = getJSON<EventItem[]>(EVENTS_KEY, [])
    ?.filter(e => {
      const eventDate = new Date(e.date)
      return eventDate >= new Date()
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 1) || []

  if (isLoading) {
    return (
      <div className="page-content">
        <div className="page-container">
          {/* Hero Section Skeleton */}
          <div className="text-center mb-16 animate-pulse">
            <div className="w-20 h-20 bg-gray-300 dark:bg-gray-700 rounded-2xl mx-auto mb-6"></div>
            <div className="h-12 bg-gray-300 dark:bg-gray-700 rounded-lg w-96 mx-auto mb-6"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded-lg w-3/4 mx-auto"></div>
          </div>

          {/* Quick Actions Skeleton */}
          <div className="mb-12">
            <div className="h-7 bg-gray-300 dark:bg-gray-700 rounded-lg w-32 mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card animate-pulse p-6">
                  <div className="w-14 h-14 bg-gray-300 dark:bg-gray-700 rounded-xl mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-20 mx-auto mb-1"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 mx-auto"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Features Grid Skeleton */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <CardSkeleton />
            <CardSkeleton />
          </div>

          {/* Features Grid Skeleton */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>

          {/* AI Features Skeleton */}
          <div className="grid md:grid-cols-2 gap-6 mb-12">
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="page-container">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-blue-500 to-green-500 rounded-2xl mb-6 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/10">
            <FaShieldAlt className="text-white text-3xl" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent tracking-tight">
            Welcome to Secure Web
          </h2>
          <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed font-medium">
            Advanced secure collaboration platform with quantum-resistant encryption, AI threat detection, and zero-trust architecture
          </p>
        </div>

        {/* Stats Chips */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="card p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaVideo className="text-white text-xl" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">3</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Active Rooms</div>
            </div>
          </div>
          <div className="card p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaCalendarAlt className="text-white text-xl" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">5</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Upcoming Events</div>
            </div>
          </div>
          <div className="card p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaFile className="text-white text-xl" />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">12</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Files</div>
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="mb-12">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => handleQuickAction('create-room')}
              className="card-hover p-6 text-center group transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-1"
            >
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl mb-4 mx-auto transition-transform duration-300 group-hover:scale-110 shadow-lg shadow-blue-500/30">
                <FaPlus className="text-white text-xl" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Create Room</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Start a new room</p>
            </button>

            <button
              onClick={() => handleQuickAction('start-meeting')}
              className="card-hover p-6 text-center group transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/30 hover:-translate-y-1"
            >
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl mb-4 mx-auto transition-transform duration-300 group-hover:scale-110 shadow-lg shadow-green-500/30">
                <FaVideo className="text-white text-xl" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Start Meeting</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Join a video call</p>
            </button>

            <button
              onClick={() => handleQuickAction('upload-file')}
              className="card-hover p-6 text-center group transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/30 hover:-translate-y-1"
            >
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-green-500 rounded-xl mb-4 mx-auto transition-transform duration-300 group-hover:scale-110 shadow-lg shadow-blue-500/30">
                <FaUpload className="text-white text-xl" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Upload File</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Add a new file</p>
            </button>

            <button
              onClick={() => handleQuickAction('new-event')}
              className="card-hover p-6 text-center group transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/30 hover:-translate-y-1"
            >
              <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl mb-4 mx-auto transition-transform duration-300 group-hover:scale-110 shadow-lg shadow-purple-500/30">
                <FaCalendarAlt className="text-white text-xl" />
              </div>
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">New Event</h4>
              <p className="text-xs text-gray-600 dark:text-gray-400">Schedule meeting</p>
            </button>
          </div>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Video Meetings Card */}
          <div className="group card-hover p-8">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-blue-500 to-blue-400 rounded-2xl mb-6 transition-transform duration-300 group-hover:scale-110 shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/10">
              <FaVideo className="text-white text-3xl" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-400 dark:to-blue-300 bg-clip-text text-transparent mb-4">Video Meetings</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-sm">
              Start or join high-quality video meetings with real-time audio, video, and screen sharing. Create rooms for team collaboration, schedule meetings, and connect instantly with HD quality and ultra-low latency.
            </p>
            <form onSubmit={handleJoinVideo} className="space-y-4">
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="Enter channel name"
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
                required
              />
              <button
                type="submit"
                className="w-full btn-primary"
              >
                Join Meeting <FaArrowRight />
              </button>
            </form>
          </div>

          {/* File Manager Card */}
          <div className="group card-hover p-8">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-600 via-green-500 to-green-400 rounded-2xl mb-6 transition-transform duration-300 group-hover:scale-110 shadow-lg shadow-green-500/30 ring-4 ring-green-500/10">
              <FaFile className="text-white text-3xl" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 dark:from-green-400 dark:to-green-300 bg-clip-text text-transparent mb-4">File Manager</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed text-sm">
              Upload, manage, and share your files securely. Collaborate on documents with real-time editing. All files are encrypted and stored safely in the cloud.
            </p>
            <button
              onClick={handleOpenFiles}
              className="w-full btn-primary"
            >
              Open Files <FaArrowRight />
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {/* Security Scan */}
          <div className="card-hover">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-red-600 to-orange-500 rounded-xl mb-4 shadow-lg shadow-red-500/30">
              <FaLock className="text-white text-2xl" />
            </div>
            <h4 className="text-gray-900 dark:text-white font-bold text-lg mb-2">Security Scan</h4>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-3">Last scan: 2 hours ago</p>
            <button
              onClick={() => navigate('/security')}
              className="btn-secondary w-full text-sm py-2"
            >
              Run Scan
            </button>
          </div>

          {/* Recent Files */}
          <div className="card-hover">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-green-600 to-green-400 rounded-xl mb-4 shadow-lg shadow-green-500/30">
              <FaFile className="text-white text-2xl" />
            </div>
            <h4 className="text-gray-900 dark:text-white font-bold text-lg mb-2">Recent Files</h4>
            {recentFiles.length > 0 ? (
              <div className="space-y-2">
                {recentFiles.map((file) => (
                  <div key={file.id} className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {file.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-sm">No recent files</p>
            )}
            <button
              onClick={() => navigate('/files')}
              className="btn-secondary w-full text-sm py-2 mt-3"
            >
              View All
            </button>
          </div>

          {/* Upcoming Event */}
          <div className="card-hover">
            <div className="flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-blue-500 rounded-xl mb-4 shadow-lg shadow-purple-500/30">
              <FaCalendarAlt className="text-white text-2xl" />
            </div>
            <h4 className="text-gray-900 dark:text-white font-bold text-lg mb-2">Upcoming Event</h4>
            {upcomingEvents.length > 0 ? (
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  {upcomingEvents[0].title}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {new Date(upcomingEvents[0].date).toLocaleDateString()} at {upcomingEvents[0].time}
                </p>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-sm">No upcoming events</p>
            )}
            <button
              onClick={() => navigate('/calendar')}
              className="btn-secondary w-full text-sm py-2 mt-3"
            >
              View Calendar
            </button>
          </div>
        </div>

        {/* Insights Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Meeting Summary Widget */}
          <div className="card-hover">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <FaClock className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Meeting Summary</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">AI-powered summaries automatically extract key points, action items, and decisions from your meetings.</p>
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Last Meeting: Project Review</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Key points: 5 action items, 3 decisions made</p>
              </div>
              <button className="w-full btn-primary text-sm py-2.5">
                View Full Summary
              </button>
            </div>
          </div>

          {/* Insights Widget */}
          <div className="card-hover">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <FaLightbulb className="text-white text-xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Insights</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">AI analyzes team availability and meeting patterns to suggest optimal meeting times and productivity insights.</p>
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Best Meeting Time</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Tomorrow 10:00 AM - 95% availability</p>
              </div>
              <button className="w-full btn-primary text-sm py-2.5">
                View Insights
              </button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-green-600 dark:from-blue-700 dark:via-blue-600 dark:to-green-700 rounded-2xl p-8 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/10 text-white">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="transform hover:scale-110 transition-transform duration-300">
              <div className="text-5xl font-bold mb-3 drop-shadow-lg">∞</div>
              <div className="text-white/90 text-base font-semibold">Unlimited Meetings</div>
            </div>
            <div className="transform hover:scale-110 transition-transform duration-300">
              <div className="text-5xl font-bold mb-3 drop-shadow-lg">100%</div>
              <div className="text-white/90 text-base font-semibold">Secure & Encrypted</div>
            </div>
            <div className="transform hover:scale-110 transition-transform duration-300">
              <div className="text-5xl font-bold mb-3 drop-shadow-lg">24/7</div>
              <div className="text-white/90 text-base font-semibold">Always Available</div>
            </div>
          </div>
        </div>

        {/* Create Room Modal */}
        <Modal
          isOpen={showCreateRoomModal}
          onClose={() => {
            setShowCreateRoomModal(false)
            setNewRoom({ name: '', description: '', isPrivate: false })
          }}
          title="Create Room"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Room Name *
              </label>
              <input
                type="text"
                value={newRoom.name}
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter room name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={newRoom.description}
                onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter room description"
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="private-room"
                checked={newRoom.isPrivate}
                onChange={(e) => setNewRoom({ ...newRoom, isPrivate: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="private-room" className="text-sm text-gray-700 dark:text-gray-300">
                Private Room
              </label>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowCreateRoomModal(false)
                  setNewRoom({ name: '', description: '', isPrivate: false })
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoom}
                className="btn-primary flex-1"
              >
                Create Room
              </button>
            </div>
          </div>
        </Modal>

        {/* Start Meeting Modal */}
        <Modal
          isOpen={showStartMeetingModal}
          onClose={() => {
            setShowStartMeetingModal(false)
            setNewMeeting({ name: '', roomId: '' })
          }}
          title="Start Meeting"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Meeting Name *
              </label>
              <input
                type="text"
                value={newMeeting.name}
                onChange={(e) => setNewMeeting({ ...newMeeting, name: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter meeting name"
                required
              />
            </div>
            {existingRooms.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Select Room (Optional)
                </label>
                <select
                  value={newMeeting.roomId}
                  onChange={(e) => setNewMeeting({ ...newMeeting, roomId: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                >
                  <option value="">Create new meeting</option>
                  {existingRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowStartMeetingModal(false)
                  setNewMeeting({ name: '', roomId: '' })
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleStartMeeting}
                className="btn-primary flex-1"
              >
                Start Meeting
              </button>
            </div>
          </div>
        </Modal>

        {/* New Event Modal */}
        <Modal
          isOpen={showNewEventModal}
          onClose={() => {
            setShowNewEventModal(false)
            setNewEvent({ title: '', description: '', date: '', time: '', location: '' })
          }}
          title="Create Event"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Event Title *
              </label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter event title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter event description"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Time *
                </label>
                <input
                  type="time"
                  value={newEvent.time}
                  onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Location
              </label>
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter location (optional)"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowNewEventModal(false)
                  setNewEvent({ title: '', description: '', date: '', time: '', location: '' })
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                className="btn-primary flex-1"
              >
                Create Event
              </button>
            </div>
          </div>
        </Modal>

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </div>
  )
}

export default Dashboard
