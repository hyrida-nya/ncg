const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('chat.db');

const Member = {
    add: (roomId, userId, role, callback) => {
        db.get("SELECT 1 FROM room_members WHERE room_id = ? AND user_id = ?", [roomId, userId], (err, row) => {
            if (err) return callback(err);
            if (row) return callback(new Error("ALREADY_MEMBER"));
            db.run("INSERT INTO room_members (room_id, user_id, role) VALUES (?, ?, ?)", 
                   [roomId, userId, role], callback);
        });
    },
    remove: (roomId, userId, callback) => {
        db.run("DELETE FROM room_members WHERE room_id = ? AND user_id = ?", [roomId, userId], callback);
    },
    updateMute: (roomId, userId, muted, callback) => {
        db.run("UPDATE room_members SET muted = ? WHERE room_id = ? AND user_id = ?", [muted, roomId, userId], callback);
    },
    getRole: (roomId, userId, callback) => {
        db.get("SELECT role FROM room_members WHERE room_id = ? AND user_id = ?", [roomId, userId], callback);
    }
};

module.exports = Member;
