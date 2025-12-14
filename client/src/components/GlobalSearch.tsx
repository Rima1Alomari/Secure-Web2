import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaSearch, FaVideo, FaFile, FaCalendarAlt, FaComments, FaTimes } from 'react-icons/fa'
import SearchResultsModal from './SearchResultsModal'

interface SearchResult {
  id: string
  title: string
  type: 'room' | 'file' | 'event' | 'message'
  path: string
  metadata?: string
}

// Mock search results
const mockResults: SearchResult[] = [
  // Rooms
  { id: '1', title: 'Team Standup Meeting', type: 'room', path: '/rooms', metadata: 'Daily sync' },
  { id: '2', title: 'Project Planning Room', type: 'room', path: '/rooms', metadata: 'Active now' },
  { id: '3', title: 'Client Presentation', type: 'room', path: '/rooms', metadata: 'Scheduled' },
  
  // Files
  { id: '4', title: 'Q4_Report_2024.pdf', type: 'file', path: '/files', metadata: 'PDF • 2.3 MB' },
  { id: '5', title: 'Project_Proposal.docx', type: 'file', path: '/files', metadata: 'Word • 456 KB' },
  { id: '6', title: 'Meeting_Notes_2024.xlsx', type: 'file', path: '/files', metadata: 'Excel • 1.1 MB' },
  { id: '7', title: 'Design_Mockups.zip', type: 'file', path: '/files', metadata: 'Archive • 15.2 MB' },
  
  // Events (Calendar)
  { id: '8', title: 'Quarterly Review Meeting', type: 'event', path: '/calendar', metadata: 'Dec 15, 2024 • 2:00 PM' },
  { id: '9', title: 'Team Building Event', type: 'event', path: '/calendar', metadata: 'Dec 20, 2024 • 10:00 AM' },
  { id: '10', title: 'Product Launch', type: 'event', path: '/calendar', metadata: 'Jan 5, 2025 • 9:00 AM' },
  
  // Messages (Chat)
  { id: '11', title: 'Discussion about new features', type: 'message', path: '/chat', metadata: 'From: John Doe • 2 hours ago' },
  { id: '12', title: 'Security update notification', type: 'message', path: '/chat', metadata: 'From: Admin • Yesterday' },
  { id: '13', title: 'Project status update', type: 'message', path: '/chat', metadata: 'From: Sarah • 3 days ago' },
]

const typeConfig = {
  room: { icon: FaVideo, label: 'Rooms', color: 'text-blue-600 dark:text-blue-400' },
  file: { icon: FaFile, label: 'Files', color: 'text-green-600 dark:text-green-400' },
  event: { icon: FaCalendarAlt, label: 'Events', color: 'text-purple-600 dark:text-purple-400' },
  message: { icon: FaComments, label: 'Messages', color: 'text-orange-600 dark:text-orange-400' },
}

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredResults, setFilteredResults] = useState<SearchResult[]>([])
  const navigate = useNavigate()
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Filter results based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const filtered = mockResults.filter(result =>
        result.title.toLowerCase().includes(query) ||
        result.metadata?.toLowerCase().includes(query)
      )
      setFilteredResults(filtered)
    } else {
      setFilteredResults(mockResults)
    }
  }, [searchQuery])

  // Group results by type
  const groupedResults = filteredResults.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = []
    }
    acc[result.type].push(result)
    return acc
  }, {} as Record<string, SearchResult[]>)

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      setShowModal(true)
      setIsOpen(false)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
      setShowModal(false)
      setSearchQuery('')
    }
  }

  // Handle result click
  const handleResultClick = (result: SearchResult) => {
    navigate(result.path)
    setIsOpen(false)
    setSearchQuery('')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div ref={searchRef} className="relative flex-1 max-w-2xl mx-2 sm:mx-4">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 dark:text-gray-500" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchQuery.trim()) {
              setIsOpen(true)
            }
          }}
          placeholder="Search rooms, files, events..."
          className="block w-full pl-9 sm:pl-10 pr-9 sm:pr-10 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 text-xs sm:text-sm"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('')
              setIsOpen(false)
            }}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <FaTimes className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && filteredResults.length > 0 && (
        <div className="absolute z-50 mt-2 w-full sm:w-[calc(100vw-2rem)] lg:w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto animate-fade-in">
          <div className="p-2">
            {Object.entries(groupedResults).map(([type, results]) => {
              const config = typeConfig[type as keyof typeof typeConfig]
              const Icon = config.icon
              
              return (
                <div key={type} className="mb-4 last:mb-0">
                  {/* Group Header */}
                  <div className="flex items-center gap-2 px-3 py-2 mb-1">
                    <Icon className={`${config.color} text-sm`} />
                    <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      {config.label}
                    </h3>
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                      {results.length}
                    </span>
                  </div>
                  
                  {/* Results List */}
                  <div className="space-y-1">
                    {results.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full px-3 py-2.5 text-left rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-150 group"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-0.5 ${config.color}`}>
                            <Icon className="text-sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {result.title}
                            </div>
                            {result.metadata && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                {result.metadata}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {isOpen && filteredResults.length === 0 && searchQuery.trim() && (
        <div className="absolute z-50 mt-2 w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center animate-fade-in">
          <FaSearch className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No results found for "{searchQuery}"
          </p>
        </div>
      )}

      {/* Search Results Modal */}
      <SearchResultsModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false)
          setSearchQuery('')
        }}
        searchQuery={searchQuery}
      />
    </div>
  )
}

