import mongoose from 'mongoose'

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  isPrivate: {
    type: Boolean,
    default: false
  },
  members: {
    type: Number,
    default: 1
  },
  maxMembers: {
    type: Number,
    default: 50
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  memberIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  roomLevel: {
    type: String,
    enum: ['Normal', 'Confidential', 'Restricted'],
    default: 'Normal'
  },
  classification: {
    type: String,
    enum: ['Normal', 'Confidential', 'Restricted'],
    default: 'Normal'
  }
}, {
  timestamps: true
})

// Indexes for efficient queries
roomSchema.index({ ownerId: 1 })
roomSchema.index({ memberIds: 1 })
roomSchema.index({ createdAt: -1 })

export default mongoose.model('Room', roomSchema)

