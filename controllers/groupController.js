const Room = require('../models/roomModel');
const Member = require('../models/memberModel');
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('chat.db');

const groupController = {
    createRoom: (socket, data, userId) => {
        // Updated to include default avatar logic if needed, but the model now handles the INSERT default
        Room.findOrCreate(data.name, data.desc, (err, roomId) => {
            if (err) { socket.emit('group-error', 'Creation failed!'); return; }
            Member.add(roomId, userId, 'owner', () => {
                socket.emit('group-created', { id: roomId, name: data.name, desc: data.desc, avatar_url: '/default-group.png' });
            });
        });
    },
    joinRoom: (socket, data, userId) => {
        // data.id is the roomId
        Member.add(data.id, userId, 'member', (err) => {
            if (err) {
                if (err.message === 'ALREADY_MEMBER') {
                    socket.emit('group-error', 'You are already a member of this group!');
                } else {
                    socket.emit('group-error', 'Join failed!');
                }
            } else {
                socket.emit('group-joined', data.id);
            }
        });
    },
    getGroups: (userId, callback) => {
        db.all("SELECT r.id, r.name, r.description, r.avatar_url FROM rooms r JOIN room_members m ON r.id = m.room_id WHERE m.user_id = ?", 
               [userId], (err, rows) => {
            callback(err, rows);
        });
    },
    updateSettings: (socket, data, userId) => {
        Member.getRole(data.roomId, userId, (err, row) => {
            if (row && (row.role === 'owner' || row.role === 'admin')) {
                let query = "UPDATE rooms SET description = ?";
                let params = [data.desc];
                if (data.avatarUrl) {
                    query += ", avatar_url = ?";
                    params.push(data.avatarUrl);
                }
                query += " WHERE id = ?";
                params.push(data.roomId);
                
                db.run(query, params, (err) => {
                    if (err) socket.emit('group-error', 'Update failed!');
                    else {
                        socket.emit('group-settings-updated', 'Group settings updated!');
                        socket.nsp.emit('groups-updated');
                    }
                });
            } else {
                socket.emit('group-error', 'Forbidden: Only owners/admins can change settings!');
            }
        });
    }
};

module.exports = groupController;
