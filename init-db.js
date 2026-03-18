const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('chat.db');

db.serialize(() => {
    // 1. Drop old tables for a clean slate with the new structure
    db.run("DROP TABLE IF EXISTS users");
    db.run("DROP TABLE IF EXISTS messages");
    db.run("DROP TABLE IF EXISTS rooms");
    db.run("DROP TABLE IF EXISTS room_members");

    // 2. Users (now with more info)
    db.run("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT UNIQUE, password TEXT)");
    
    // 3. Rooms (the community hubs)
    db.run("CREATE TABLE rooms (id INTEGER PRIMARY KEY, name TEXT UNIQUE, description TEXT, owner_id INTEGER, avatar_url TEXT DEFAULT '/default-group.png', join_policy TEXT DEFAULT 'public', FOREIGN KEY(owner_id) REFERENCES users(id))");

    // 4. Room Members (who's in the room and what can they do)
    db.run("CREATE TABLE room_members (id INTEGER PRIMARY KEY, room_id INTEGER, user_id INTEGER, role TEXT DEFAULT 'member', muted BOOLEAN DEFAULT 0, FOREIGN KEY(room_id) REFERENCES rooms(id), FOREIGN KEY(user_id) REFERENCES users(id))");

    // 5. Messages (linked to room ID)
    db.run("CREATE TABLE messages (id INTEGER PRIMARY KEY, user TEXT, message TEXT, timestamp TEXT, room_id INTEGER, FOREIGN KEY(room_id) REFERENCES rooms(id))");

    console.log("Database initialized: Expanded schema for complex groups!");
});

db.close();
