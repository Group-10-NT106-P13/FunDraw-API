import { io } from 'socket.io-client';

const socket = io('ws://localhost:3000/game', {
    query: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg2MGJiMmU2LWY2NWEtNDQ2NC04NGVhLTA5NzZiMDFlNzdhZiIsImlhdCI6MTczMjk2MDcxNSwiZXhwIjoxNzMyOTYxNjE1fQ.gnD0APlGr-EyHCwBeP8XUdRGW3XHzz2fuYDjj_0wdSk',
    },
});

// Join a room
socket.emit('createRoom');

socket.on('roomCreated', (data) => {
    console.log(`${data.roomId}`);
});

socket.on('error', (data) => {
    console.log(`${data}`);
});
