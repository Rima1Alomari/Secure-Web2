import { useState, useEffect } from 'react'
import { FaPlus, FaCalendarAlt, FaClock, FaMapMarkerAlt, FaEdit, FaTrash, FaTimes, FaCheckCircle } from 'react-icons/fa'
import { FiAlertTriangle } from 'react-icons/fi'
import { Modal, Toast } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { EVENTS_KEY } from '../data/keys'
import { EventItem } from '../types/models'

interface Event extends EventItem {
  from?: string
  to?: string
  showAs?: 'busy' | 'free'
  sharedWith?: string[]
}

const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [events, setEvents] = useState<Event[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEventDetailsModal, setShowEventDetailsModal] = useState(false)
  const [showSmartSchedulingModal, setShowSmartSchedulingModal] = useState(false)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
  const [clickedDate, setClickedDate] = useState<Date | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    from: '09:00',
    to: '10:00',
    location: '',
    showAs: 'busy' as 'busy' | 'free',
    sharedWith: [] as string[]
  })

  // Load events from localStorage
  useEffect(() => {
    const savedEvents = getJSON<Event[]>(EVENTS_KEY, []) || []
    // Convert date strings back to Date objects for display
    const eventsWithDates = savedEvents.map(e => ({
      ...e,
      date: typeof e.date === 'string' ? new Date(e.date) : e.date
    }))
    setEvents(eventsWithDates)
  }, [])

  // Save events to localStorage whenever events change
  useEffect(() => {
    if (events.length > 0) {
      // Convert Date objects to ISO strings for storage
      const eventsForStorage = events.map(e => ({
        ...e,
        date: e.date instanceof Date ? e.date.toISOString() : e.date
      }))
      setJSON(EVENTS_KEY, eventsForStorage)
    }
  }, [events])

  const handleCreateEvent = () => {
    if (!newEvent.title.trim() || !newEvent.from || !newEvent.to) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      return
    }

    const event: Event = {
      id: uuid(),
      title: newEvent.title,
      description: newEvent.description,
      date: clickedDate ? clickedDate.toISOString().split('T')[0] : newEvent.date,
      time: `${newEvent.from} - ${newEvent.to}`,
      from: newEvent.from,
      to: newEvent.to,
      location: newEvent.location || undefined,
      showAs: newEvent.showAs,
      sharedWith: newEvent.sharedWith,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    }

    const eventDate = clickedDate || new Date(newEvent.date)
    const eventWithDate = {
      ...event,
      date: eventDate
    }

    setEvents([...events, eventWithDate])
    setToast({ message: 'Event created successfully', type: 'success' })
    setNewEvent({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      from: '09:00',
      to: '10:00',
      location: '',
      showAs: 'busy',
      sharedWith: []
    })
    setShowCreateModal(false)
    setClickedDate(null)
  }

  const handleDeleteEvent = (eventId: string) => {
    setEvents(events.filter(e => e.id !== eventId))
    setToast({ message: 'Event deleted', type: 'success' })
    setShowEventDetailsModal(false)
    setSelectedEvent(null)
  }

  const handleEditEvent = () => {
    if (!selectedEvent) return
    setNewEvent({
      title: selectedEvent.title,
      description: selectedEvent.description,
      date: selectedEvent.date instanceof Date 
        ? selectedEvent.date.toISOString().split('T')[0] 
        : new Date(selectedEvent.date).toISOString().split('T')[0],
      from: selectedEvent.from || selectedEvent.time.split(' - ')[0] || '09:00',
      to: selectedEvent.to || selectedEvent.time.split(' - ')[1] || '10:00',
      location: selectedEvent.location || '',
      showAs: selectedEvent.showAs || 'busy',
      sharedWith: selectedEvent.sharedWith || []
    })
    setShowEventDetailsModal(false)
    setShowCreateModal(true)
    setSelectedEvent(null)
  }

  const handleUpdateEvent = () => {
    if (!selectedEvent || !newEvent.title.trim()) {
      setToast({ message: 'Please fill in all required fields', type: 'error' })
      return
    }

    const updatedEvent: Event = {
      ...selectedEvent,
      title: newEvent.title,
      description: newEvent.description,
      date: new Date(newEvent.date),
      time: `${newEvent.from} - ${newEvent.to}`,
      from: newEvent.from,
      to: newEvent.to,
      location: newEvent.location || undefined,
      showAs: newEvent.showAs,
      sharedWith: newEvent.sharedWith,
      updatedAt: nowISO(),
    }

    setEvents(events.map(e => e.id === selectedEvent.id ? updatedEvent : e))
    setToast({ message: 'Event updated successfully', type: 'success' })
    setShowCreateModal(false)
    setSelectedEvent(null)
    setNewEvent({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      from: '09:00',
      to: '10:00',
      location: '',
      showAs: 'busy',
      sharedWith: []
    })
  }

  const handleDateClick = (date: Date) => {
    setClickedDate(date)
    setNewEvent({
      ...newEvent,
      date: date.toISOString().split('T')[0]
    })
    setShowCreateModal(true)
  }

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event)
    setShowEventDetailsModal(true)
  }

  // AI Smart Scheduling - Suggest best times
  const suggestBestTimes = () => {
    const allEvents = events.map(e => {
      const eventDate = e.date instanceof Date ? e.date : new Date(e.date)
      const fromTime = e.from || e.time.split(' - ')[0] || '09:00'
      const toTime = e.to || e.time.split(' - ')[1] || '10:00'
      return {
        date: eventDate,
        from: fromTime,
        to: toTime
      }
    })

    // Get next 7 days
    const suggestions = []
    const today = new Date()
    
    for (let i = 1; i <= 7; i++) {
      const checkDate = new Date(today)
      checkDate.setDate(today.getDate() + i)
      
      // Check morning (9-11), afternoon (2-4), late afternoon (4-6)
      const timeSlots = [
        { from: '09:00', to: '11:00', label: '9:00 AM - 11:00 AM' },
        { from: '14:00', to: '16:00', label: '2:00 PM - 4:00 PM' },
        { from: '16:00', to: '18:00', label: '4:00 PM - 6:00 PM' }
      ]

      for (const slot of timeSlots) {
        const hasConflict = allEvents.some(e => {
          const eventDate = new Date(e.date)
          return (
            eventDate.toDateString() === checkDate.toDateString() &&
            ((slot.from >= e.from && slot.from < e.to) ||
             (slot.to > e.from && slot.to <= e.to) ||
             (slot.from <= e.from && slot.to >= e.to))
          )
        })

        if (!hasConflict && suggestions.length < 3) {
          suggestions.push({
            date: checkDate,
            time: slot.label,
            from: slot.from,
            to: slot.to,
            reason: 'No conflicts detected'
          })
        }
      }
    }

    return suggestions.slice(0, 3)
  }

  // AI Conflict Prediction - Check for overlaps
  const checkConflicts = () => {
    const conflicts = []
    const sortedEvents = [...events].sort((a, b) => {
      const dateA = a.date instanceof Date ? a.date : new Date(a.date)
      const dateB = b.date instanceof Date ? b.date : new Date(b.date)
      return dateA.getTime() - dateB.getTime()
    })

    for (let i = 0; i < sortedEvents.length; i++) {
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const eventA = sortedEvents[i]
        const eventB = sortedEvents[j]
        
        const dateA = eventA.date instanceof Date ? eventA.date : new Date(eventA.date)
        const dateB = eventB.date instanceof Date ? eventB.date : new Date(eventB.date)

        if (dateA.toDateString() === dateB.toDateString()) {
          const fromA = eventA.from || eventA.time.split(' - ')[0] || '09:00'
          const toA = eventA.to || eventA.time.split(' - ')[1] || '10:00'
          const fromB = eventB.from || eventB.time.split(' - ')[0] || '09:00'
          const toB = eventB.to || eventB.time.split(' - ')[1] || '10:00'

          // Check for overlap
          if (
            (fromA >= fromB && fromA < toB) ||
            (toA > fromB && toA <= toB) ||
            (fromA <= fromB && toA >= toB)
          ) {
            const overlapMinutes = Math.min(
              timeToMinutes(toA) - timeToMinutes(fromB),
              timeToMinutes(toB) - timeToMinutes(fromA)
            )

            let severity: 'Low' | 'Medium' | 'High' = 'Low'
            if (overlapMinutes > 30) severity = 'High'
            else if (overlapMinutes > 15) severity = 'Medium'

            conflicts.push({
              eventA: eventA.title,
              eventB: eventB.title,
              date: dateA,
              severity,
              overlapMinutes,
              suggestion: overlapMinutes > 30 
                ? 'Move one meeting to a different time'
                : 'Shorten duration or adjust start time'
            })
          }
        }
      }
    }

    return conflicts
  }

  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const getEventsForDate = (date: Date) => {
    return events.filter((e) => {
      const eventDate = e.date instanceof Date ? e.date : new Date(e.date)
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      )
    })
  }

  const todayEvents = getEventsForDate(selectedDate)

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent mb-3 tracking-tight">
              Calendar
            </h1>
            <p className="text-gray-700 dark:text-gray-300 text-base md:text-lg font-medium">
              Manage events and meetings
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 dark:from-blue-500 dark:to-green-500 text-white rounded-lg text-sm font-semibold transition-colors duration-200 flex items-center gap-2 shadow-md"
          >
            <FaPlus className="text-sm" /> Add Event
          </button>
        </div>

        {/* Smart Features Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Smart Scheduling */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <FaCalendarAlt className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Smart Scheduling</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">AI analyzes team calendars and availability patterns to suggest optimal meeting times automatically.</p>
            <div className="space-y-2">
              <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Suggested Times</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Tomorrow 10:00 AM - 95% availability</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Friday 2:00 PM - 90% availability</p>
              </div>
              <button 
                onClick={() => setShowSmartSchedulingModal(true)}
                className="w-full btn-primary text-sm py-2.5"
              >
                Suggest Best Times
              </button>
            </div>
          </div>

          {/* Meeting Conflict Prediction */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-200/50 dark:border-green-800/50 shadow-xl shadow-green-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <FiAlertTriangle className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Meeting Conflict Prediction</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">AI identifies potential scheduling conflicts and suggests alternatives before they occur.</p>
            <div className="space-y-2">
              <div className="p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Prediction</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">High probability of schedule conflict next week</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">3 meetings may overlap</p>
              </div>
              <button 
                onClick={() => setShowConflictModal(true)}
                className="w-full btn-primary text-sm py-2.5"
              >
                Check Conflicts
              </button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Calendar View */}
          <div className="md:col-span-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 86400000))}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all"
                >
                  ←
                </button>
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all"
                >
                  Today
                </button>
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 86400000))}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-all"
                >
                  →
                </button>
              </div>
            </div>
            <div className="text-center">
              <button
                onClick={() => handleDateClick(selectedDate)}
                className="w-full hover:opacity-80 transition-opacity"
              >
                <div className="text-7xl font-bold bg-gradient-to-br from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent mb-3 drop-shadow-lg cursor-pointer hover:scale-105 transition-transform">
                  {selectedDate.getDate()}
                </div>
                <div className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                  {selectedDate.toLocaleDateString('en-US', { weekday: 'long' })}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Click to add event</p>
              </button>
            </div>
          </div>

          {/* Events List */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border-2 border-green-200/50 dark:border-green-800/50 shadow-xl shadow-green-500/10 p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FaCalendarAlt /> Events
            </h3>
            {todayEvents.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No events for this day
              </p>
            ) : (
              <div className="space-y-4">
                {todayEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => handleEventClick(event)}
                    className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all cursor-pointer"
                  >
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{event.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{event.description}</p>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <FaClock /> {event.time}
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mt-1">
                        <FaMapMarkerAlt /> {event.location}
                      </div>
                    )}
                    {event.showAs && (
                      <div className="mt-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          event.showAs === 'busy' 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                            : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        }`}>
                          {event.showAs === 'busy' ? 'Busy' : 'Free'}
                        </span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit Event Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setClickedDate(null)
            setNewEvent({
              title: '',
              description: '',
              date: new Date().toISOString().split('T')[0],
              from: '09:00',
              to: '10:00',
              location: '',
              showAs: 'busy',
              sharedWith: []
            })
            if (selectedEvent) setSelectedEvent(null)
          }}
          title={selectedEvent ? 'Edit Event' : 'Add New Event'}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Title *
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  From *
                </label>
                <input
                  type="time"
                  value={newEvent.from}
                  onChange={(e) => setNewEvent({ ...newEvent, from: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  To *
                </label>
                <input
                  type="time"
                  value={newEvent.to}
                  onChange={(e) => setNewEvent({ ...newEvent, to: e.target.value })}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
            </div>
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                rows={3}
                placeholder="Enter event description"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Show As
              </label>
              <select
                value={newEvent.showAs}
                onChange={(e) => setNewEvent({ ...newEvent, showAs: e.target.value as 'busy' | 'free' })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              >
                <option value="busy">Busy</option>
                <option value="free">Free</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Shared With (tags, comma-separated)
              </label>
              <input
                type="text"
                value={newEvent.sharedWith.join(', ')}
                onChange={(e) => setNewEvent({ 
                  ...newEvent, 
                  sharedWith: e.target.value.split(',').map(t => t.trim()).filter(t => t) 
                })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="team, project, urgent"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setClickedDate(null)
                  setNewEvent({
                    title: '',
                    description: '',
                    date: new Date().toISOString().split('T')[0],
                    from: '09:00',
                    to: '10:00',
                    location: '',
                    showAs: 'busy',
                    sharedWith: []
                  })
                  if (selectedEvent) setSelectedEvent(null)
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={selectedEvent ? handleUpdateEvent : handleCreateEvent}
                className="btn-primary flex-1"
              >
                {selectedEvent ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </div>
        </Modal>

        {/* Event Details Modal */}
        <Modal
          isOpen={showEventDetailsModal}
          onClose={() => {
            setShowEventDetailsModal(false)
            setSelectedEvent(null)
          }}
          title="Event Details"
        >
          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  {selectedEvent.title}
                </h3>
                {selectedEvent.description && (
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {selectedEvent.description}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <FaCalendarAlt className="text-blue-600 dark:text-blue-400" />
                  <span>
                    {selectedEvent.date instanceof Date 
                      ? selectedEvent.date.toLocaleDateString()
                      : new Date(selectedEvent.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <FaClock className="text-blue-600 dark:text-blue-400" />
                  <span>{selectedEvent.time}</span>
                </div>
                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <FaMapMarkerAlt className="text-blue-600 dark:text-blue-400" />
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
                {selectedEvent.showAs && (
                  <div>
                    <span className={`text-sm px-3 py-1 rounded-full ${
                      selectedEvent.showAs === 'busy' 
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' 
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    }`}>
                      {selectedEvent.showAs === 'busy' ? 'Busy' : 'Free'}
                    </span>
                  </div>
                )}
                {selectedEvent.sharedWith && selectedEvent.sharedWith.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Shared with:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.sharedWith.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleEditEvent}
                  className="btn-secondary flex-1"
                >
                  <FaEdit className="text-sm" />
                  Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this event?')) {
                      handleDeleteEvent(selectedEvent.id)
                    }
                  }}
                  className="btn-danger flex-1"
                >
                  <FaTrash className="text-sm" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </Modal>

        {/* Smart Scheduling Modal */}
        <Modal
          isOpen={showSmartSchedulingModal}
          onClose={() => setShowSmartSchedulingModal(false)}
          title="Suggested Meeting Times"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              AI analyzed your current events and suggests these optimal time slots with no conflicts:
            </p>
            {suggestBestTimes().length > 0 ? (
              <div className="space-y-3">
                {suggestBestTimes().map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {suggestion.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                          {suggestion.time}
                        </p>
                      </div>
                      <FaCheckCircle className="text-green-600 dark:text-green-400 text-xl" />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      ✓ {suggestion.reason}
                    </p>
                    <button
                      onClick={() => {
                        setNewEvent({
                          ...newEvent,
                          date: suggestion.date.toISOString().split('T')[0],
                          from: suggestion.from,
                          to: suggestion.to
                        })
                        setShowSmartSchedulingModal(false)
                        setShowCreateModal(true)
                      }}
                      className="btn-primary w-full text-sm py-2 mt-3"
                    >
                      Use This Time
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600 dark:text-gray-400">
                  No optimal time slots found. Your calendar is quite busy!
                </p>
              </div>
            )}
          </div>
        </Modal>

        {/* Conflict Prediction Modal */}
        <Modal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          title="Conflict Prediction"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              AI checked your calendar for overlapping meetings:
            </p>
            {checkConflicts().length > 0 ? (
              <div className="space-y-3">
                {checkConflicts().map((conflict, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-lg border-2 border-red-200 dark:border-red-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {conflict.eventA} ↔ {conflict.eventB}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {conflict.date.toLocaleDateString()}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        conflict.severity === 'High'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : conflict.severity === 'Medium'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                      }`}>
                        {conflict.severity} Risk
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Overlap: {conflict.overlapMinutes} minutes
                    </p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 mt-2 font-medium">
                      💡 Suggestion: {conflict.suggestion}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FaCheckCircle className="text-green-600 dark:text-green-400 text-4xl mx-auto mb-3" />
                <p className="text-gray-900 dark:text-white font-semibold mb-1">
                  No Conflicts Detected
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Your schedule looks good! No overlapping meetings found.
                </p>
              </div>
            )}
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

export default Calendar

