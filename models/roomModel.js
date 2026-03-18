const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('chat.db');

const Room = {
    findOrCreate: (name, desc, callback) => {
        if (typeof desc === 'function') {
            callback = desc;
            desc = '';
        }
        db.get("SELECT id FROM rooms WHERE name = ?", [name], (err, row) => {
            if (err) {
                callback(err);
                return;
            }
            if (row) {
                callback(null, row.id);
            } else {
                db.run("INSERT INTO rooms (name, description, avatar_url) VALUES (?, ?, ?)", [name, desc, '/default-group.png'], function(err) {
                    if (err) callback(err);
                    else callback(null, this.lastID);
                });
            }
        });
    }
};

module.exports = Room;
