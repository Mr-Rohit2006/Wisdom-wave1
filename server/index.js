require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB Connected'))
.catch(err => console.log(err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

// Socket.io for Battle Mode
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const battles = {}; // In-memory store for active battles

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create_room', (data) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    battles[roomId] = {
      host: data.userId,
      hostName: data.username,
      guest: null,
      guestName: null,
      status: 'waiting',
      questions: data.questions,
      hostScore: 0,
      guestScore: 0,
      hostDone: false,
      guestDone: false,
      createdAt: Date.now()
    };

    socket.join(roomId);
    socket.emit('room_created', { roomId, room: battles[roomId] });
    console.log(`Room created: ${roomId} by ${data.username}`);
  });

  socket.on('join_room', (data) => {
    const { roomId, userId, username } = data;
    const room = battles[roomId];

    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    if (room.status !== 'waiting') {
      socket.emit('error', { message: 'Battle already in progress' });
      return;
    }

    if (room.guest) {
      socket.emit('error', { message: 'Room is full' });
      return;
    }

    room.guest = userId;
    room.guestName = username;
    room.status = 'active';

    socket.join(roomId);
    io.to(roomId).emit('room_joined', { room });
    io.to(roomId).emit('room_update', { room });
    console.log(`User ${username} joined room ${roomId}`);
  });

  socket.on('update_score', (data) => {
    const { roomId, isHost, finalScore, isDone } = data;
    const room = battles[roomId];
    if (!room) return;

    if (isHost) {
      room.hostScore = finalScore;
      if (isDone) room.hostDone = true;
    } else {
      room.guestScore = finalScore;
      if (isDone) room.guestDone = true;
    }

    if (room.hostDone && room.guestDone) {
        let winner = '';
        if (room.hostScore > room.guestScore) winner = room.host;
        else if (room.guestScore > room.hostScore) winner = room.guest;
        else winner = 'draw';

        room.winner = winner;
        room.status = 'done';
    }

    io.to(roomId).emit('room_update', { room });
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
    if (battles[roomId]) {
        // Option to delete the room if host leaves, or handle guest leaving
        delete battles[roomId];
        io.to(roomId).emit('room_closed');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
