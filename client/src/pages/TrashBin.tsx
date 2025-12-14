import { useState, useMemo, useEffect } from 'react'
import { FaTrash, FaUndo, FaFile, FaFolder, FaSearch, FaSortUp, FaSortDown, FaChevronLeft, FaChevronRight, FaRobot } from 'react-icons/fa'
import TableSkeleton from '../components/TableSkeleton'
import { Toast } from '../components/common'
import { getJSON, setJSON } from '../data/storage'
import { FILES_KEY, TRASH_KEY } from '../data/keys'
import { FileItem } from '../types/models'

const TrashBin = () => {
  const [trashItems, setTrashItems] = useState<FileItem[]>([])
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<'name' | 'type' | 'size' | 'deletedAt' | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const [isLoading, setIsLoading] = useState(true)

  // Load trash items from localStorage
  useEffect(() => {
    const savedTrash = getJSON<FileItem[]>(TRASH_KEY, []) || []
    setTrashItems(savedTrash.filter(item => item.isTrashed))
    setIsLoading(false)
  }, [])

  // Save trash items to localStorage whenever they change
  useEffect(() => {
    if (trashItems.length >= 0) {
      setJSON(TRASH_KEY, trashItems)
    }
  }, [trashItems])

  const formatSize = (bytes?: number) => {
    if (!bytes) return '-'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // AI Recovery Prediction - calculates restore probability based on file type and deleted time
  const getRecoveryProbability = (item: FileItem): { probability: 'High' | 'Medium' | 'Low'; message: string; percentage: number } => {
    if (!item.deletedAt) {
      return { probability: 'Low', message: 'Unknown deletion time', percentage: 30 }
    }

    const deletedDate = new Date(item.deletedAt)
    const now = new Date()
    const daysSinceDeleted = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24))

    // Base probability from time
    let timeScore = 100
    if (daysSinceDeleted <= 1) {
      timeScore = 95
    } else if (daysSinceDeleted <= 7) {
      timeScore = 80
    } else if (daysSinceDeleted <= 14) {
      timeScore = 60
    } else if (daysSinceDeleted <= 30) {
      timeScore = 40
    } else {
      timeScore = 20
    }

    // File type modifier
    let typeModifier = 0
    const type = item.type.toLowerCase()
    if (type.includes('pdf') || type.includes('document') || type.includes('word')) {
      typeModifier = 5 // Documents are more recoverable
    } else if (type.includes('image') || type.includes('video')) {
      typeModifier = -5 // Media files might be larger/harder to recover
    } else if (item.isFolder) {
      typeModifier = -10 // Folders might have dependencies
    }

    const finalScore = Math.max(10, Math.min(100, timeScore + typeModifier))

    let probability: 'High' | 'Medium' | 'Low'
    let message: string

    if (finalScore >= 70) {
      probability = 'High'
      if (daysSinceDeleted === 0) {
        message = 'Deleted today'
      } else if (daysSinceDeleted === 1) {
        message = 'Deleted yesterday'
      } else {
        message = `Deleted ${daysSinceDeleted} day${daysSinceDeleted !== 1 ? 's' : ''} ago`
      }
    } else if (finalScore >= 40) {
      probability = 'Medium'
      const weeks = Math.floor(daysSinceDeleted / 7)
      if (weeks === 1) {
        message = 'Deleted 1 week ago'
      } else {
        message = `Deleted ${weeks} weeks ago`
      }
    } else {
      probability = 'Low'
      const weeks = Math.floor(daysSinceDeleted / 7)
      if (weeks >= 2) {
        message = `Deleted ${weeks} weeks ago`
      } else {
        message = `Deleted ${daysSinceDeleted} days ago`
      }
    }

    return { probability, message, percentage: finalScore }
  }

  // Filter and sort data
  const filteredAndSortedItems = useMemo(() => {
    let filtered = trashItems.filter(item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aVal: any
        let bVal: any

        if (sortField === 'deletedAt') {
          aVal = a.deletedAt ? new Date(a.deletedAt).getTime() : 0
          bVal = b.deletedAt ? new Date(b.deletedAt).getTime() : 0
        } else if (sortField === 'size') {
          aVal = a.size || 0
          bVal = b.size || 0
        } else if (sortField === 'type') {
          aVal = a.isFolder ? 'folder' : a.type.toLowerCase()
          bVal = b.isFolder ? 'folder' : b.type.toLowerCase()
        } else {
          aVal = String(a[sortField]).toLowerCase()
          bVal = String(b[sortField]).toLowerCase()
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [trashItems, searchQuery, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage)
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedItems.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedItems, currentPage])

  const handleSort = (field: 'name' | 'type' | 'size' | 'deletedAt') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
    setCurrentPage(1) // Reset to first page on sort
  }

  const SortIcon = ({ field }: { field: 'name' | 'type' | 'size' | 'deletedAt' }) => {
    if (sortField !== field) {
      return <FaSortUp className="text-gray-400 opacity-50" />
    }
    return sortDirection === 'asc' ? (
      <FaSortUp className="text-blue-600 dark:text-blue-400" />
    ) : (
      <FaSortDown className="text-blue-600 dark:text-blue-400" />
    )
  }

  const handleRestore = (item: FileItem) => {
    // Remove from trash
    setTrashItems(prev => prev.filter(i => i.id !== item.id))
    
    // Add back to files (remove isTrashed flag)
    const files = getJSON<FileItem[]>(FILES_KEY, []) || []
    const restoredItem = { ...item, isTrashed: false, deletedAt: undefined }
    setJSON(FILES_KEY, [...files.filter(f => f.id !== item.id), restoredItem])
    
    setToast({ message: `"${item.name}" restored successfully`, type: 'success' })
  }

  const handleDeletePermanently = (item: FileItem) => {
    if (window.confirm(`Are you sure you want to permanently delete "${item.name}"? This action cannot be undone.`)) {
      setTrashItems(prev => prev.filter(i => i.id !== item.id))
      setToast({ message: `"${item.name}" permanently deleted`, type: 'info' })
    }
  }

  const handleEmptyTrash = () => {
    if (window.confirm('Are you sure you want to empty the trash? All items will be permanently deleted.')) {
      setTrashItems([])
      setToast({ message: 'Trash emptied', type: 'info' })
    }
  }

  return (
    <div className="page-content">
      <div className="page-container">
        <div className="flex justify-between items-center page-header">
          <div>
            <h1 className="page-title">
              Trash Bin
            </h1>
            <p className="page-subtitle">
              Manage deleted files
            </p>
          </div>
          {trashItems.length > 0 && (
            <button
              onClick={handleEmptyTrash}
              className="btn-danger"
            >
              <FaTrash className="text-sm" /> Empty Trash
            </button>
          )}
        </div>

        {/* AI Recovery Prediction */}
        {trashItems.length > 0 && (
          <div className="card mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <FaRobot className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recovery Prediction</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              AI analyzes file type and deletion time to predict recovery probability.
            </p>
            <div className="space-y-3">
              {trashItems.slice(0, 3).map((item) => {
                const prediction = getRecoveryProbability(item)
                const bgClass = prediction.probability === 'High' 
                  ? 'bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20'
                  : prediction.probability === 'Medium'
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20'
                  : 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20'
                
                return (
                  <div key={item.id} className={`p-3 ${bgClass} rounded-lg`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {prediction.probability} probability: {prediction.message} ({prediction.percentage}% likely to restore)
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        prediction.probability === 'High'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : prediction.probability === 'Medium'
                          ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {prediction.probability}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : trashItems.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full mb-6">
              <FaTrash className="text-gray-400 dark:text-gray-500 text-4xl" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Trash is empty
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Deleted files will appear here. You can restore them or delete them permanently.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            {/* Search Bar */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1) // Reset to first page on search
                  }}
                  placeholder="Search by name or type..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Table with horizontal scroll on small screens */}
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        Name
                        <SortIcon field="name" />
                      </div>
                  </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleSort('type')}
                    >
                      <div className="flex items-center gap-2">
                        Type
                        <SortIcon field="type" />
                      </div>
                  </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleSort('size')}
                    >
                      <div className="flex items-center gap-2">
                        Size
                        <SortIcon field="size" />
                      </div>
                  </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={() => handleSort('deletedAt')}
                    >
                      <div className="flex items-center gap-2">
                    Deleted At
                        <SortIcon field="deletedAt" />
                      </div>
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {item.isFolder ? (
                          <FaFolder className="text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <FaFile className="text-blue-600 dark:text-blue-400" />
                        )}
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 capitalize">
                      {item.isFolder ? 'folder' : item.type.split('/')[1] || 'file'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {item.isFolder ? '-' : formatSize(item.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {item.deletedAt ? formatDate(item.deletedAt) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleRestore(item)}
                          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors p-2 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                          title="Restore"
                        >
                          <FaUndo className="text-lg" />
                        </button>
                        <button
                          onClick={() => handleDeletePermanently(item)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Delete Permanently"
                        >
                          <FaTrash className="text-lg" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length)} of {filteredAndSortedItems.length} items
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    <FaChevronLeft className="text-xs" />
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page
                            ? 'bg-blue-600 dark:bg-blue-500 text-white'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    Next
                    <FaChevronRight className="text-xs" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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

export default TrashBin

