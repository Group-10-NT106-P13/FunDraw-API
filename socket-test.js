import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000/game', {
    query: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg2MGJiMmU2LWY2NWEtNDQ2NC04NGVhLTA5NzZiMDFlNzdhZiIsImlhdCI6MTczMjk2MDcxNSwiZXhwIjoxNzMyOTYxNjE1fQ.gnD0APlGr-EyHCwBeP8XUdRGW3XHzz2fuYDjj_0wdSk',
    }
});

const setting = {
    playerCounts: 2,
    drawTime: 120,
    rounds: 2,
    wordCounts: 3,
    hints: 2,
    words: null
}
// Join a room
socket.emit('createRoom', setting);

// // Listen for notifications (e.g., when a user joins or leaves)
// socket.on('notification', (msg) => {
//     console.log(msg);
// });

// // Send a message to a specific room
// socket.emit('message', {
//     room: 'room1',
//     sender: 'John',
//     message: 'Hello, Room!',
// });

// Listen for messages in the room
socket.on('message', (data) => {
    console.log(`${data}`);
});

// // Leave the room
// socket.emit('leaveRoom', 'room1');
