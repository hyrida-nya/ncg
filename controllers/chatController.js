const User = require('../models/userModel');
const Message = require('../models/messageModel');
const Room = require('../models/roomModel');
const Member = require('../models/memberModel');
const bcrypt = require('bcrypt');

const chatController = {
    handleLogin: (socket, data) => {
        User.findByUsername(data.user, (err, row) => {
            if (row) {
                bcrypt.compare(data.pass, row.password, (err, result) => {
                    if (result) socket.emit('login-success');
                    else socket.emit('login-fail', 'Invalid credentials!');
                });
            } else {
                socket.emit('login-fail', 'Invalid credentials!');
            }
        });
    },
    handleRegister: (socket, data) => {
        if (!data.user || data.user.trim() === '' || !data.pass || data.pass.trim() === '') {
            socket.emit('register-fail', 'Username and password are required!');
            return;
        }
        if (data.user.length < 3) {
            socket.emit('register-fail', 'Username must be at least 3 characters!');
            return;
        }
        User.findByUsername(data.user, (err, row) => {
            if (row) socket.emit('register-fail', 'Username taken!');
            else {
                bcrypt.hash(data.pass, 10, (err, hash) => {
                    User.create(data.user, hash, (err, userId) => {
                        if (err) socket.emit('register-fail', 'Error!');
                        else {
                            Room.findOrCreate('general', (err, roomId) => {
                                Member.add(roomId, userId, 'member', () => {
                                    socket.emit('register-success');
                                });
                            });
                        }
                    });
                });
            }
        });
    },
    loadHistory: (socket, roomName) => {
        Room.findOrCreate(roomName, (err, roomId) => {
            Message.getRecent(20, roomId, (err, rows) => {
                if (!err) {
                    rows.reverse().forEach(row => {
                        socket.emit('chat message', {
                            user: row.user,
                            message: row.message,
                            time: row.timestamp,
                            room: roomName
                        });
                    });
                }
            });
        });
    },
    saveMessage: (data, io) => {
        if (!data.message || data.message.trim() === '') return;
        if (data.message.length > 500) {
            data.message = data.message.substring(0, 500); 
        }
        const sanitizedMessage = data.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        Room.findOrCreate(data.room, (err, roomId) => {
            Message.save(data.user, sanitizedMessage, data.time, roomId, () => {
                io.to(data.room).emit('chat message', { ...data, message: sanitizedMessage });
            });
        });
    }
};

module.exports = chatController;
