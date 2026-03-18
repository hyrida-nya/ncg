// Retrieve username from cookie
const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
};

const username = getCookie('username') || "AnonymousCat";
let currentRoom = "general";
let joinedGroups = [];

// Redirect if not logged in
if (!getCookie('username')) {
    window.location.href = '/';
}

const socket = io();

const getGroupAvatar = (group) => {
    if (group.avatar_url && group.avatar_url !== '/default-group.png') {
        const img = document.createElement('img');
        img.src = group.avatar_url;
        img.style.width = '30px';
        img.style.height = '30px';
        img.style.borderRadius = '50%';
        img.style.marginRight = '10px';
        img.style.objectFit = 'cover';
        return img;
    }

    const div = document.createElement('div');
    const firstLetter = group.name.charAt(0).toUpperCase();
    div.textContent = firstLetter;
    div.style.width = '30px';
    div.style.height = '30px';
    div.style.borderRadius = '50%';
    div.style.marginRight = '10px';
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.color = 'white';
    div.style.fontWeight = 'bold';
    div.style.fontSize = '14px';
    
    // Generate color from name
    const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
    const index = group.name.length % colors.length;
    div.style.background = colors[index];
    
    return div;
};

window.renderSidebar = function() {
    const groupList = document.getElementById('groupList');
    if (!groupList) return;
    groupList.innerHTML = '';
    joinedGroups.forEach(group => {
        const item = document.createElement('div');
        item.className = `group-item ${group.name === currentRoom ? 'active' : ''}`;
        item.onclick = () => switchRoom(group.name);
        
        const avatar = getGroupAvatar(group);

        const nameSpan = document.createElement('span');
        nameSpan.style.flexGrow = '1';
        nameSpan.textContent = '# ' + group.name;
        
        const dotsBtn = document.createElement('span');
        dotsBtn.className = 'dots-btn';
        dotsBtn.textContent = '⋮';
        dotsBtn.onclick = (e) => {
            e.stopPropagation();
            openManageModal(group.name, group.id, group.description || '', group.avatar_url);
        };
        
        item.appendChild(avatar);
        item.appendChild(nameSpan);
        item.appendChild(dotsBtn);
        groupList.appendChild(item);
    });
}

window.switchRoom = function(room) {
    if (room === currentRoom) return;

    socket.emit('leave', currentRoom);
    currentRoom = room;
    document.getElementById('roomTitle').textContent = `NCG Chat: ${currentRoom}`;
    document.getElementById('messages').innerHTML = '';
    socket.emit('join', currentRoom);
    window.renderSidebar(); 
}

document.addEventListener('DOMContentLoaded', () => {
    // Key shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal');
            modals.forEach(m => {
                if (m.style.display === 'flex') {
                    if (m.id === 'joinModal') closeJoinModal();
                    else if (m.id === 'manageModal') closeManageModal();
                    else if (m.id === 'cropModal') closeCropModal();
                    else if (m.id === 'alertModal') closeModal();
                }
            });
        }
    });

    document.getElementById('input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            document.getElementById('sendBtn').click();
        }
    });

    // UI: Logout
    document.getElementById('logoutBtn').addEventListener('click', () => {
        document.cookie = "username=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = '/';
    });

    const sendBtn = document.getElementById('sendBtn');
    sendBtn.addEventListener('click', () => {
        const input = document.getElementById('input');
        const msg = input.value.trim();
        if (msg === '') return;
        
        const chatData = {
            user: username,
            message: msg,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            room: currentRoom
        };

        socket.emit('chat message', chatData);
        input.value = '';
    });

    // Request group list
    socket.emit('get-my-groups');
    // Join the default room
    socket.emit('join', currentRoom);
});

// UI: Create Group
window.createNewGroup = function() {
    const name = document.getElementById('newRoomName').value.trim();
    const desc = document.getElementById('newRoomDesc').value.trim();
    if (!name) return;
    socket.emit('create-room', { name, desc });
    document.getElementById('newRoomName').value = '';
    document.getElementById('newRoomDesc').value = '';
}

// UI: Join Group
window.joinGroupById = function() {
    const id = document.getElementById('joinRoomId').value.trim();
    if (!id) return;
    socket.emit('join-room-by-id', { id });
    document.getElementById('joinRoomId').value = '';
}

let cropper;
let croppedBlob;

document.getElementById('groupAvatarInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('cropImage').src = e.target.result;
            document.getElementById('cropModal').style.display = 'flex';
            if (cropper) cropper.destroy();
            cropper = new Cropper(document.getElementById('cropImage'), {
                aspectRatio: 1,
                viewMode: 1
            });
        };
        reader.readAsDataURL(file);
    }
});

function closeCropModal() {
    document.getElementById('cropModal').style.display = 'none';
    if (cropper) cropper.destroy();
}

function saveCroppedImage() {
    cropper.getCroppedCanvas().toBlob((blob) => {
        croppedBlob = blob;
        const url = URL.createObjectURL(blob);
        const container = document.getElementById('groupAvatarContainer');
        container.innerHTML = '';
        const img = document.createElement('img');
        img.src = url;
        img.style.width = '80px';
        img.style.height = '80px';
        img.style.borderRadius = '8px';
        container.appendChild(img);
        closeCropModal();
    });
}

// UI: Manage Group
window.updateGroupSettings = async function() {
    const roomId = document.getElementById('groupIdDisplay').textContent;
    const desc = document.getElementById('descInput').value.trim();
    let avatarUrl = null;

    if (croppedBlob) {
        const formData = new FormData();
        formData.append('file', croppedBlob, 'avatar.png');
        const response = await fetch('/upload', { method: 'POST', body: formData });
        const data = await response.json();
        avatarUrl = data.path;
    }

    socket.emit('update-group-settings', { roomId, desc, avatarUrl });
    croppedBlob = null;
}

window.toggleEditMode = function() {
    const input = document.getElementById('descInput');
    const display = document.getElementById('descDisplay');
    const avatarInput = document.getElementById('groupAvatarInput');
    const avatarEditBtn = document.getElementById('avatarEditBtn');
    
    if (input.style.display === 'none') {
        input.value = display.textContent;
        input.style.display = 'block';
        display.style.display = 'none';
        avatarEditBtn.style.display = 'flex';
        document.getElementById('saveBtn').style.display = 'block';
        document.getElementById('editBtn').textContent = 'Cancel';
    } else {
        input.style.display = 'none';
        display.style.display = 'block';
        avatarEditBtn.style.display = 'none';
        document.getElementById('saveBtn').style.display = 'none';
        document.getElementById('editBtn').textContent = 'Edit';
    }
}

function showToast(message) {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

socket.on('group-settings-updated', (msg) => {
    showToast(msg);
    socket.emit('get-my-groups');
    closeManageModal();
});

socket.on('group-joined', (roomId) => {
    socket.emit('get-my-groups'); // Refresh list
    showToast("Joined group ID: " + roomId);
});

window.showAlert = function(msg) {
    const modal = document.getElementById('alertModal');
    const msgEl = document.getElementById('alertMessage'); // Assuming this exists
    if (modal && msgEl) {
        msgEl.textContent = msg;
        modal.style.display = 'flex';
    } else {
        alert(msg); // Fallback
    }
}

socket.on('group-error', (err) => {
    // If the error is about membership, use an alert modal
    if (err.includes('already a member')) {
        window.showAlert(err);
    } else {
        showToast(err);
    }
});

socket.on('chat message', (data) => {
    if (data.room === currentRoom) {
        const messagesList = document.getElementById('messages');
        const item = document.createElement('li');
        item.className = `message ${data.user === username ? 'mine' : ''}`;
        
        // Escape the username to prevent XSS
        const escapedUser = data.user.replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        item.innerHTML = `<strong>${escapedUser}:</strong> ${data.message} <small style="display:block; font-size: 0.7rem; opacity: 0.7;">${data.time}</small>`;
        messagesList.appendChild(item);
        messagesList.scrollTop = messagesList.scrollHeight;
    }
});

socket.on('groups-updated', () => {
    socket.emit('get-my-groups');
});

// Socket: Listeners for group events
socket.on('my-groups', (groups) => {
    joinedGroups = groups || [];
    window.renderSidebar();
});

socket.on('group-created', (data) => {
    socket.emit('get-my-groups'); // Refresh list
    window.switchRoom(data.name);
    document.getElementById('joinModal').style.display = 'none';
});
