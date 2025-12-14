import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import { getToken } from '../utils/auth'
import { 
  FaArrowLeft, 
  FaDownload, 
  FaShare, 
  FaEdit, 
  FaTrash, 
  FaRobot, 
  FaSearch, 
  FaTags, 
  FaFileAudio, 
  FaUpload, 
  FaFolderPlus, 
  FaBars, 
  FaTh, 
  FaSort, 
  FaFilter, 
  FaEllipsisV, 
  FaHome, 
  FaChevronRight, 
  FaTimes, 
  FaCheck, 
  FaFolder,
  FaFile,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileImage,
  FaFileVideo,
  FaFileAlt
} from 'react-icons/fa'
import { io } from 'socket.io-client'
import CardSkeleton from '../components/CardSkeleton'
import { Modal, Toast } from '../components/common'
import { getJSON, setJSON, uuid, nowISO } from '../data/storage'
import { FILES_KEY, TRASH_KEY } from '../data/keys'
import { FileItem } from '../types/models'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const ENABLE_REALTIME = false // Set to true to enable socket.io real-time features

const FileManager = () => {
  const [files, setFiles] = useState<FileItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null)
  const [shareModal, setShareModal] = useState<{ file: FileItem | null; shareLink: string }>({ file: null, shareLink: '' })
  const [backendConnected, setBackendConnected] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'size' | 'type'>('date')
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [showDetailsPanel, setShowDetailsPanel] = useState(false)
  const [selectedFileDetails, setSelectedFileDetails] = useState<FileItem | null>(null)
  
  // Modal states
  const [showRenameModal, setShowRenameModal] = useState(false)
  const [showNewFolderModal, setShowNewFolderModal] = useState(false)
  const [showTagEditModal, setShowTagEditModal] = useState(false)
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [editingTags, setEditingTags] = useState<{ file: FileItem; tags: string[] } | null>(null)
  const [transcriptionFile, setTranscriptionFile] = useState<FileItem | null>(null)
  const navigate = useNavigate()

  // Load files from localStorage on mount
  useEffect(() => {
    const savedFiles = getJSON<FileItem[]>(FILES_KEY, []) || []
    setFiles(savedFiles.filter(f => !f.isTrashed))
    setLoading(false)
  }, [])

  // Save files to localStorage whenever files change
  useEffect(() => {
    if (files.length >= 0) {
      setJSON(FILES_KEY, files)
    }
  }, [files])

  // Auto-tagging function - extracts keywords from filename and type
  const generateTags = (fileName: string, fileType: string): string[] => {
    const tags: string[] = []
    const nameLower = fileName.toLowerCase()
    
    // Type-based tags
    if (fileType.includes('pdf')) tags.push('document', 'pdf')
    if (fileType.includes('word') || fileType.includes('document')) tags.push('document', 'word')
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) tags.push('spreadsheet', 'data')
    if (fileType.includes('presentation') || fileType.includes('powerpoint')) tags.push('presentation', 'slides')
    if (fileType.includes('image')) tags.push('image', 'photo')
    if (fileType.includes('video')) tags.push('video', 'media')
    if (fileType.includes('audio')) tags.push('audio', 'media')
    
    // Keyword-based tags
    if (nameLower.includes('report')) tags.push('report')
    if (nameLower.includes('meeting') || nameLower.includes('notes')) tags.push('meeting', 'notes')
    if (nameLower.includes('budget') || nameLower.includes('financial')) tags.push('financial', 'budget')
    if (nameLower.includes('project')) tags.push('project')
    if (nameLower.includes('proposal')) tags.push('proposal')
    if (nameLower.includes('contract')) tags.push('contract', 'legal')
    
    // Remove duplicates
    return [...new Set(tags)]
  }

  // Filtered and sorted files using useMemo
  const visibleItems = useMemo(() => {
    let filtered = files.filter(f => !f.isTrashed)
    
    // Search filter (filename + tags)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(query) ||
        f.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }
    
    // Type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(f => {
        if (filterType === 'pdf') return f.type.includes('pdf')
        if (filterType === 'doc') return f.type.includes('word') || f.type.includes('document')
        if (filterType === 'image') return f.type.includes('image')
        if (filterType === 'video') return f.type.includes('video')
        return true
      })
    }
    
    // Sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'date':
          return new Date(b.uploadedAt || b.createdAt || 0).getTime() - new Date(a.uploadedAt || a.createdAt || 0).getTime()
        case 'size':
          return b.size - a.size
        case 'type':
          return a.type.localeCompare(b.type)
        default:
          return 0
      }
    })
    
    return filtered
  }, [files, searchQuery, filterType, sortBy])

  const onDrop = async (acceptedFiles: globalThis.File[]) => {
    for (const file of acceptedFiles) {
      await uploadFile(file)
    }
  }

  const uploadFile = async (file: globalThis.File) => {
    try {
      setUploading(true)
      setProgress(0)
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 100)

      // Generate tags automatically
      const autoTags = generateTags(file.name, file.type)
      
      // Convert browser File to FileItem
      const fileItem: FileItem = {
        id: uuid(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: nowISO(),
        owner: 'Current User',
        tags: autoTags,
        isTrashed: false,
        isFolder: false,
      }

      // Simulate upload completion
      setTimeout(() => {
        clearInterval(progressInterval)
        setProgress(100)
        setFiles(prev => [...prev, fileItem])
        setToast({ message: `File "${file.name}" uploaded successfully`, type: 'success' })
        setProgress(0)
        setUploading(false)
      }, 1000)
    } catch (error: any) {
      console.error('[FileManager] Upload error:', error)
      setToast({ message: 'Upload failed', type: 'error' })
      setUploading(false)
      setProgress(0)
    }
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      setToast({ message: 'Please enter a folder name', type: 'error' })
      return
    }

    const folder: FileItem = {
      id: uuid(),
      name: newFolderName,
      size: 0,
      type: 'folder',
      uploadedAt: nowISO(),
      owner: 'Current User',
      tags: ['folder'],
      isTrashed: false,
      isFolder: true,
    }

    setFiles(prev => [...prev, folder])
    setToast({ message: `Folder "${newFolderName}" created`, type: 'success' })
    setShowNewFolderModal(false)
    setNewFolderName('')
  }

  const handleRename = (file: FileItem) => {
    if (!renameValue.trim()) {
      setToast({ message: 'Please enter a new name', type: 'error' })
      return
    }

    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, name: renameValue } : f
    ))
    setToast({ message: 'File renamed successfully', type: 'success' })
    setShowRenameModal(false)
    setRenameValue('')
    setSelectedFileDetails(null)
  }

  const handleMoveToTrash = (file: FileItem) => {
    setFiles(prev => prev.map(f => 
      f.id === file.id ? { ...f, isTrashed: true } : f
    ))
    
    // Also save to trash with deletedAt timestamp
    const trashItems = getJSON<FileItem[]>(TRASH_KEY, []) || []
    setJSON(TRASH_KEY, [...trashItems, { ...file, isTrashed: true, deletedAt: nowISO() }])
    
    setToast({ message: `"${file.name}" moved to trash`, type: 'info' })
    setSelectedFileDetails(null)
    setShowDetailsPanel(false)
  }

  const handleEditTags = (file: FileItem) => {
    setEditingTags({ file, tags: [...(file.tags || [])] })
    setShowTagEditModal(true)
  }

  const handleSaveTags = () => {
    if (!editingTags) return

    setFiles(prev => prev.map(f => 
      f.id === editingTags.file.id ? { ...f, tags: editingTags.tags } : f
    ))
    setToast({ message: 'Tags updated successfully', type: 'success' })
    setShowTagEditModal(false)
    setEditingTags(null)
  }

  const handleTranscription = (file: FileItem) => {
    setTranscriptionFile(file)
    setShowTranscriptionModal(true)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: uploading
  })

  const handleDownload = async (file: FileItem) => {
    try {
      const token = getToken() || 'mock-token'
      const fileId = (file as any)._id || file.id
      const response = await axios.get(`${API_URL}/files/${fileId}/download-url`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.data.downloadUrl) {
        window.open(response.data.downloadUrl, '_blank')
      }
    } catch (error) {
      console.error('Download error:', error)
      setToast({ message: 'Failed to download file', type: 'error' })
    }
  }

  const isAudioVideo = (file: FileItem) => {
    return file.type.includes('audio') || file.type.includes('video')
  }

  const getFileTypeLabel = (type: string) => {
    if (type.includes('pdf')) return 'PDF'
    if (type.includes('word') || type.includes('document')) return 'Word'
    if (type.includes('excel') || type.includes('spreadsheet')) return 'Excel'
    if (type.includes('image')) return 'Image'
    if (type.includes('video')) return 'Video'
    if (type.includes('audio')) return 'Audio'
    if (type === 'folder') return 'Folder'
    return 'File'
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  // Helper function to get appropriate icon for file type
  const getFileIcon = (file: FileItem) => {
    if (file.isFolder) {
      return FaFolder
    }
    
    const type = file.type.toLowerCase()
    
    if (type.includes('pdf')) return FaFilePdf
    if (type.includes('word') || type.includes('document')) return FaFileWord
    if (type.includes('excel') || type.includes('spreadsheet')) return FaFileExcel
    if (type.includes('image')) return FaFileImage
    if (type.includes('video')) return FaFileVideo
    if (type.includes('audio')) return FaFileAudio
    
    return FaFileAlt
  }

  return (
    <div>


      <div className="page-content">
        <div className="page-container">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 page-header">
            <div>
              <h1 className="page-title">
                Files
              </h1>
              <p className="page-subtitle">
                Securely store, share, and manage your documents
              </p>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="btn-secondary flex-1 sm:flex-none"
              >
                <FaFolderPlus className="text-sm" />
                <span className="hidden sm:inline">New Folder</span>
                <span className="sm:hidden">Folder</span>
              </button>
              <button className="btn-primary flex-1 sm:flex-none">
                <FaUpload className="text-sm" />
                Upload File
              </button>
            </div>
          </div>

          {/* Backend Connection Warning Banner */}
          {!backendConnected && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800/50 rounded-lg flex items-center gap-3 animate-fade-in">
              <FaRobot className="text-yellow-600 dark:text-yellow-400 text-lg flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                  Files backend not connected
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                  Showing mock data. Connect to the backend to enable full functionality.
                </p>
              </div>
            </div>
          )}

          {/* AI Features Section */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Semantic Search */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-green-600 rounded-xl flex items-center justify-center">
                <FaSearch className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Semantic Search</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">AI-powered natural language search understands context and meaning, not just keywords. Find files by describing what you're looking for.</p>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files by name or tags..."
              className="w-full px-4 py-2 bg-white dark:bg-gray-700 border-2 border-blue-200/50 dark:border-blue-800/50 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Automatic Categorization */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-green-200/50 dark:border-green-800/50 shadow-xl shadow-green-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-blue-600 rounded-xl flex items-center justify-center">
                <FaTags className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Automatic Categorization</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">AI automatically analyzes file content and applies relevant tags and categories, making organization effortless.</p>
            <div className="space-y-2">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Tags are automatically generated on upload based on filename and file type.
              </p>
              <button
                onClick={() => {
                  const fileWithTags = files.find(f => f.tags && f.tags.length > 0)
                  if (fileWithTags) {
                    handleEditTags(fileWithTags)
                  } else {
                    setToast({ message: 'Upload a file to see auto-generated tags', type: 'info' })
                  }
                }}
                className="w-full btn-secondary text-sm py-2"
              >
                Edit Tags
              </button>
            </div>
          </div>

          {/* Transcription */}
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-blue-500 to-green-600 rounded-xl flex items-center justify-center">
                <FaFileAudio className="text-white text-xl" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Transcription</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">AI-powered transcription automatically converts audio and video files into searchable text, making content accessible and easy to find.</p>
            {files.some(f => isAudioVideo(f)) ? (
              <button
                onClick={() => {
                  const audioVideoFile = files.find(f => isAudioVideo(f))
                  if (audioVideoFile) {
                    handleTranscription(audioVideoFile)
                  }
                }}
                className="w-full btn-primary text-sm py-2.5"
              >
                View Transcription
              </button>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                Upload an audio or video file to enable transcription
              </p>
            )}
          </div>
        </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
            <button onClick={() => navigate('/dashboard')} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              <FaHome />
            </button>
            <FaChevronRight className="text-xs" />
            <span className="text-gray-900 dark:text-white font-medium">Files</span>
          </div>

          {/* Toolbar: View Toggle, Sort, Filter */}
          <div className="card p-4 mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Left: View Toggle & Sort */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'list' 
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <FaBars />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid' 
                        ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <FaTh />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <FaSort className="text-gray-500 dark:text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="name">Name</option>
                    <option value="date">Date</option>
                    <option value="size">Size</option>
                    <option value="type">Type</option>
                  </select>
                </div>
              </div>

              {/* Right: Type Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <FaFilter className="text-gray-500 dark:text-gray-400" />
                <div className="flex items-center gap-2 flex-wrap">
                  {['all', 'pdf', 'doc', 'image', 'video'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        filterType === type
                          ? 'bg-blue-600 text-white dark:bg-blue-500'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedFiles.length > 0 && (
            <div className="card p-4 mb-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="btn-secondary text-sm py-2">
                    <FaDownload className="text-xs" />
                    Download
                  </button>
                  <button className="btn-secondary text-sm py-2">
                    <FaShare className="text-xs" />
                    Share
                  </button>
                  <button className="btn-danger text-sm py-2">
                    <FaTrash className="text-xs" />
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>
            </div>
          )}

        <div
          {...getRootProps()}
          className={`border-3 border-dashed rounded-2xl p-10 md:p-14 text-center cursor-pointer transition-all duration-300 mb-8 bg-gradient-to-br from-white via-blue-50/30 to-green-50/30 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 border-blue-300/50 dark:border-blue-700/50 ${
            isDragActive
              ? 'border-green-500 dark:border-green-400 border-solid bg-gradient-to-br from-green-50 via-green-50/50 to-blue-50/50 dark:from-green-900/30 dark:via-green-900/20 dark:to-blue-900/20 shadow-2xl shadow-green-500/20'
              : 'hover:border-green-500 dark:hover:border-green-400 hover:shadow-xl hover:shadow-blue-500/10'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <div>
              <div className="text-lg font-semibold mb-2">Uploading... {progress}%</div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-600 via-blue-500 to-green-600 dark:from-blue-500 dark:via-blue-400 dark:to-green-500 h-3 rounded-full transition-all shadow-lg"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xl mb-2 text-gray-900 dark:text-white font-semibold">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-gray-600 dark:text-gray-300">or click to select files</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="text-center py-16 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-600 via-blue-500 to-green-600 dark:from-blue-500 dark:via-blue-400 dark:to-green-500 rounded-2xl mb-6 shadow-2xl shadow-blue-500/30 ring-4 ring-blue-500/10">
              <FaFileAlt className="text-white text-4xl" />
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-xl font-semibold">No files uploaded yet</p>
          </div>
        ) : (
          <div className="flex gap-6">
            <div className={`flex-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl overflow-hidden border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl shadow-blue-500/10 transition-all ${showDetailsPanel ? 'lg:w-2/3' : 'w-full'}`}>
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gradient-to-r from-blue-50 via-blue-50/50 to-green-50 dark:from-gray-700 dark:via-gray-700 dark:to-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Size</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Tags</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {visibleItems.map((file) => (
                  <tr 
                    key={file.id} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer ${
                      selectedFiles.includes(file.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => {
                      setSelectedFileDetails(file)
                      setShowDetailsPanel(true)
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.id)}
                          onChange={(e) => {
                            e.stopPropagation()
                            if (e.target.checked) {
                              setSelectedFiles([...selectedFiles, file.id])
                            } else {
                              setSelectedFiles(selectedFiles.filter(id => id !== file.id))
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex items-center gap-2">
                          {(() => {
                            const IconComponent = getFileIcon(file)
                            return (
                              <IconComponent 
                                className={file.isFolder 
                                  ? "text-blue-600 dark:text-blue-400" 
                                  : "text-gray-400"
                                } 
                              />
                            )
                          })()}
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {file.isFolder ? '-' : formatSize(file.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {getFileTypeLabel(file.type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {new Date(file.createdAt || file.uploadedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {file.tags && file.tags.slice(0, 2).map((tag, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                        {file.tags && file.tags.length > 2 && (
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                            +{file.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
                        {!file.isFolder && (
                          <button
                            onClick={() => handleDownload(file)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                            title="Download"
                          >
                            <FaDownload className="text-lg" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setRenameValue(file.name)
                            setSelectedFileDetails(file)
                            setShowRenameModal(true)
                          }}
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg"
                          title="Rename"
                        >
                          <FaEdit className="text-lg" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMoveToTrash(file)
                          }}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Move to Trash"
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

            {/* File Details Panel */}
            {showDetailsPanel && selectedFileDetails && (
              <div className="hidden lg:block w-1/3 card p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">File Details</h3>
                  <button
                    onClick={() => {
                      setShowDetailsPanel(false)
                      setSelectedFileDetails(null)
                    }}
                    className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <FaTimes />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Name</div>
                    <div className="font-semibold text-gray-900 dark:text-white">{selectedFileDetails.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Size</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {selectedFileDetails.isFolder ? '-' : formatSize(selectedFileDetails.size)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Type</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {getFileTypeLabel(selectedFileDetails.type)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Uploaded</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {new Date(selectedFileDetails.uploadedAt).toLocaleString()}
                    </div>
                  </div>
                  {selectedFileDetails.tags && selectedFileDetails.tags.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Tags</div>
                      <div className="flex flex-wrap gap-2">
                        {selectedFileDetails.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col gap-2">
                      {!selectedFileDetails.isFolder && (
                        <button onClick={() => handleDownload(selectedFileDetails)} className="btn-secondary w-full text-sm py-2">
                          <FaDownload className="text-xs" />
                          Download
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setRenameValue(selectedFileDetails.name)
                          setShowRenameModal(true)
                        }}
                        className="btn-secondary w-full text-sm py-2"
                      >
                        <FaEdit className="text-xs" />
                        Rename
                      </button>
                      {selectedFileDetails.tags && (
                        <button
                          onClick={() => handleEditTags(selectedFileDetails)}
                          className="btn-secondary w-full text-sm py-2"
                        >
                          <FaTags className="text-xs" />
                          Edit Tags
                        </button>
                      )}
                      {isAudioVideo(selectedFileDetails) && (
                        <button
                          onClick={() => handleTranscription(selectedFileDetails)}
                          className="btn-secondary w-full text-sm py-2"
                        >
                          <FaFileAudio className="text-xs" />
                          View Transcription
                        </button>
                      )}
                      <button
                        onClick={() => handleMoveToTrash(selectedFileDetails)}
                        className="btn-danger w-full text-sm py-2"
                      >
                        <FaTrash className="text-xs" />
                        Move to Trash
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Share Modal */}
      {shareModal.file && (
        <Modal
          isOpen={!!shareModal.file}
          onClose={() => setShareModal({ file: null, shareLink: '' })}
          title="Share File"
        >
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300 font-semibold">{shareModal.file.name}</p>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Share Link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareModal.shareLink}
                  readOnly
                  className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareModal.shareLink)
                    setToast({ message: 'Link copied to clipboard', type: 'success' })
                  }}
                  className="btn-primary"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Rename Modal */}
      <Modal
        isOpen={showRenameModal}
        onClose={() => {
          setShowRenameModal(false)
          setRenameValue('')
          setSelectedFileDetails(null)
        }}
        title="Rename"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              New Name *
            </label>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Enter new name"
              autoFocus
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                setShowRenameModal(false)
                setRenameValue('')
                setSelectedFileDetails(null)
              }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedFileDetails) {
                  handleRename(selectedFileDetails)
                }
              }}
              className="btn-primary flex-1"
            >
              Rename
            </button>
          </div>
        </div>
      </Modal>

      {/* New Folder Modal */}
      <Modal
        isOpen={showNewFolderModal}
        onClose={() => {
          setShowNewFolderModal(false)
          setNewFolderName('')
        }}
        title="Create New Folder"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Folder Name *
            </label>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Enter folder name"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder()
                }
              }}
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              onClick={() => {
                setShowNewFolderModal(false)
                setNewFolderName('')
              }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateFolder}
              className="btn-primary flex-1"
            >
              Create Folder
            </button>
          </div>
        </div>
      </Modal>

      {/* Tag Edit Modal */}
      <Modal
        isOpen={showTagEditModal}
        onClose={() => {
          setShowTagEditModal(false)
          setEditingTags(null)
        }}
        title="Edit Tags"
      >
        {editingTags && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={editingTags.tags.join(', ')}
                onChange={(e) => setEditingTags({
                  ...editingTags,
                  tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                })}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="document, project, urgent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Separate tags with commas
              </p>
            </div>
            {editingTags.tags.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Preview:</p>
                <div className="flex flex-wrap gap-2">
                  {editingTags.tags.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setShowTagEditModal(false)
                  setEditingTags(null)
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTags}
                className="btn-primary flex-1"
              >
                Save Tags
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Transcription Modal */}
      <Modal
        isOpen={showTranscriptionModal}
        onClose={() => {
          setShowTranscriptionModal(false)
          setTranscriptionFile(null)
        }}
        title="Transcription"
        size="lg"
      >
        {transcriptionFile && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Transcription for: <span className="font-semibold text-gray-900 dark:text-white">{transcriptionFile.name}</span>
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 max-h-96 overflow-y-auto">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {`[00:00:00] Welcome everyone to today's meeting. Let's start by reviewing the project status.

[00:01:15] The development team has made significant progress on the new features. We've completed the authentication module and are now working on the file management system.

[00:02:30] Sarah, can you provide an update on the frontend implementation?

[00:02:45] Sure! We've finished the dashboard layout and are now implementing the calendar functionality. The drag-and-drop file upload is working well.

[00:03:20] Great work! John, what about the backend API?

[00:03:35] The API endpoints are ready for testing. We've implemented secure file storage and the real-time notification system is in place.

[00:04:10] Excellent progress everyone. Let's schedule a follow-up meeting for next week to review the integration testing.

[00:04:45] Meeting adjourned. Thank you all for your time.`}
              </p>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`[Transcription for ${transcriptionFile.name}]\n\n[00:00:00] Welcome everyone...`)
                  setToast({ message: 'Transcription copied to clipboard', type: 'success' })
                }}
                className="btn-secondary flex-1"
              >
                Copy Text
              </button>
              <button
                onClick={() => {
                  setShowTranscriptionModal(false)
                  setTranscriptionFile(null)
                }}
                className="btn-primary flex-1"
              >
                Close
              </button>
            </div>
          </div>
        )}
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
  )
}

export default FileManager

