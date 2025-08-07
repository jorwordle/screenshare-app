const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Room management
const rooms = new Map();
const socketToRoom = new Map();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

// Get room info
app.get('/api/room/:roomId', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json({ 
    roomId: req.params.roomId,
    users: room.users.length,
    created: room.created 
  });
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join room
  socket.on('join-room', ({ roomId, userName }) => {
    console.log(`${userName} joining room ${roomId}`);
    
    // Create room if doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: [],
        created: Date.now(),
        messages: []
      });
    }

    const room = rooms.get(roomId);
    
    // Check if room is full (max 2 users for P2P)
    if (room.users.length >= 2) {
      socket.emit('room-full');
      return;
    }

    // Add user to room
    const user = {
      id: socket.id,
      name: userName,
      joinedAt: Date.now()
    };
    
    room.users.push(user);
    socketToRoom.set(socket.id, roomId);
    socket.join(roomId);

    // Notify other users
    socket.to(roomId).emit('user-joined', {
      userId: socket.id,
      userName: userName
    });

    // Send room state to new user
    socket.emit('room-joined', {
      roomId: roomId,
      users: room.users,
      messages: room.messages.slice(-50) // Last 50 messages
    });

    // If 2 users in room, initiate P2P connection
    if (room.users.length === 2) {
      const otherUser = room.users.find(u => u.id !== socket.id);
      socket.emit('ready-to-connect', { 
        initiator: true,
        partnerId: otherUser.id,
        partnerName: otherUser.name
      });
    }
  });

  // WebRTC signaling
  socket.on('offer', ({ offer, to }) => {
    console.log(`Sending offer from ${socket.id} to ${to}`);
    socket.to(to).emit('offer', {
      offer: offer,
      from: socket.id
    });
  });

  socket.on('answer', ({ answer, to }) => {
    console.log(`Sending answer from ${socket.id} to ${to}`);
    socket.to(to).emit('answer', {
      answer: answer,
      from: socket.id
    });
  });

  socket.on('ice-candidate', ({ candidate, to }) => {
    console.log(`Sending ICE candidate from ${socket.id} to ${to}`);
    socket.to(to).emit('ice-candidate', {
      candidate: candidate,
      from: socket.id
    });
  });

  // Chat messages
  socket.on('chat-message', ({ roomId, message, userName }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const chatMessage = {
      id: Date.now().toString(),
      userId: socket.id,
      userName: userName,
      message: message,
      timestamp: Date.now()
    };

    // Store message (limit to 100 messages)
    room.messages.push(chatMessage);
    if (room.messages.length > 100) {
      room.messages.shift();
    }

    // Broadcast to room
    io.to(roomId).emit('chat-message', chatMessage);
  });

  // Screen sharing status
  socket.on('screen-share-started', ({ roomId }) => {
    socket.to(roomId).emit('peer-screen-share-started', {
      userId: socket.id
    });
  });

  socket.on('screen-share-stopped', ({ roomId }) => {
    socket.to(roomId).emit('peer-screen-share-stopped', {
      userId: socket.id
    });
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    const roomId = socketToRoom.get(socket.id);
    if (!roomId) return;

    const room = rooms.get(roomId);
    if (!room) return;

    // Remove user from room
    room.users = room.users.filter(u => u.id !== socket.id);
    socketToRoom.delete(socket.id);

    // Notify other users
    socket.to(roomId).emit('user-left', {
      userId: socket.id
    });

    // Clean up empty rooms
    if (room.users.length === 0) {
      setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (currentRoom && currentRoom.users.length === 0) {
          rooms.delete(roomId);
          console.log(`Room ${roomId} deleted`);
        }
      }, 60000); // Delete after 1 minute if still empty
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});