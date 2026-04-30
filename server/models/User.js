const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  streak: {
    type: Number,
    default: 0
  },
  lastLoginDate: {
    type: String,
    default: ''
  },
  topicsDone: {
    type: [String],
    default: []
  },
  puzzlesSolved: {
    type: Number,
    default: 0
  },
  battleWon: {
    type: Number,
    default: 0
  },
  moduleProgress: {
    type: Object,
    default: {}
  },
  activity: {
    type: Array,
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
