require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const chatController = require('./controllers/chatController');
const groupController = require('./controllers/groupController');
const User = require('./models/userModel');
const multer = require('multer');
const upload = multer({ dest: 'public/uploads/' });
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    res.json({ path: '/uploads/' + req.file.filename });
});

io.on('connection', (socket) => {
    console.log('A new cat joined the server!');

    socket.on('join', (room) => {
        socket.join(room);
        chatController.loadHistory(socket, room);
    });

    socket.on('leave', (room) => {
        socket.leave(room);
    });

    socket.on('create-room', (data) => {
        const username = socket.handshake.headers.cookie ? socket.handshake.headers.cookie.split('username=')[1].split(';')[0] : null;
        if (!username) return;
        User.findByUsername(username, (err, row) => {
            if (row) groupController.createRoom(socket, data, row.id);
        });
    });

    socket.on('join-room-by-id', (data) => {
        const username = socket.handshake.headers.cookie ? socket.handshake.headers.cookie.split('username=')[1].split(';')[0] : null;
        if (!username) return;
        User.findByUsername(username, (err, row) => {
            if (row) groupController.joinRoom(socket, data, row.id);
        });
    });

    socket.on('get-my-groups', () => {
        const username = socket.handshake.headers.cookie ? socket.handshake.headers.cookie.split('username=')[1].split(';')[0] : null;
        if (!username) return;
        User.findByUsername(username, (err, row) => {
            if (row) groupController.getGroups(row.id, (err, groups) => {
                socket.emit('my-groups', groups);
            });
        });
    });

    socket.on('update-group-settings', (data) => {
        const username = socket.handshake.headers.cookie ? socket.handshake.headers.cookie.split('username=')[1].split(';')[0] : null;
        if (!username) return;
        User.findByUsername(username, (err, row) => {
            if (row) groupController.updateSettings(socket, data, row.id);
        });
    });

    socket.on('login', (data) => chatController.handleLogin(socket, data));
    socket.on('register', (data) => chatController.handleRegister(socket, data));
    socket.on('chat message', (data) => chatController.saveMessage(data, io));

    socket.on('disconnect', () => {
        console.log('A cat left the server.');
    });
});

http.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
