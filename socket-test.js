import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000/chat');

// Join a room
socket.emit('joinRoom', 'room1');

// Listen for notifications (e.g., when a user joins or leaves)
socket.on('notification', (msg) => {
    console.log(msg);
});

// Send a message to a specific room
socket.emit('message', {
    room: 'room1',
    sender: 'John',
    message: 'Hello, Room!',
});

// Listen for messages in the room
socket.on('message', (data) => {
    console.log(`Message from ${data.sender}: ${data.message}`);
});

// Leave the room
socket.emit('leaveRoom', 'room1');
