const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('chat.db');

const Message = {
    save: (user, message, timestamp, roomId, callback) => {
        db.run("INSERT INTO messages (user, message, timestamp, room_id) VALUES (?, ?, ?, ?)", 
               [user, message, timestamp, roomId], callback);
    },
    getRecent: (limit, roomId, callback) => {
        db.all("SELECT * FROM messages WHERE room_id = ? ORDER BY id DESC LIMIT ?", [roomId, limit], callback);
    }
};

module.exports = Message;
