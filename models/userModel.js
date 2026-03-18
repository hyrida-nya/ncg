const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('chat.db');

const User = {
    findByUsername: (username, callback) => {
        db.get("SELECT * FROM users WHERE username = ?", [username], callback);
    },
    create: (username, password, callback) => {
        db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], function(err) {
            callback(err, this.lastID);
        });
    }
};

module.exports = User;
