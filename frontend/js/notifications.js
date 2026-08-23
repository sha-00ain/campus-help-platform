// ===================================================
// Shared notification bell (used on every logged-in page). Requires a
// #notifBell button, #notifBadge span, #notifDropdown panel, and
// #notifList container to already be in the page's HTML.
// ===================================================

let allNotifications = [];

async function loadNotifications() {
    try {
        allNotifications = await apiCall('/notifications', 'GET');
        updateNotifBadge();
    } catch (err) {
        // Fail silently - notifications are a nice-to-have, not critical
        console.error('Could not load notifications:', err.message);
    }
}

function updateNotifBadge() {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    const unreadCount = allNotifications.filter(n => !n.is_read).length;
    if (unreadCount > 0) {
        badge.innerText = unreadCount > 9 ? '9+' : unreadCount;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function toggleNotifDropdown() {
    const dropdown = document.getElementById('notifDropdown');
    if (!dropdown) return;
    const opening = !dropdown.classList.contains('active');
    dropdown.classList.toggle('active');
    if (opening) renderNotifList();
}

function closeNotifDropdown() {
    const dropdown = document.getElementById('notifDropdown');
    if (dropdown) dropdown.classList.remove('active');
}

function renderNotifList() {
    const listEl = document.getElementById('notifList');
    if (!listEl) return;

    if (allNotifications.length === 0) {
        listEl.innerHTML = '<div class="notif-empty">No notifications yet.</div>';
        return;
    }

    listEl.innerHTML = allNotifications.map(n => `
        <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="handleNotifClick(${n.notification_id})">
            <div class="notif-dot"></div>
            <div class="notif-body">
                <div class="notif-message">${n.message}</div>
                <div class="notif-time">${timeAgo(n.created_at)}</div>
            </div>
        </div>
    `).join('');
}

// Work out which page a notification's post lives on, so a click can jump
// straight to it. post_type is set server-side for anything that links to a
// post; older/legacy notifications may not have it, so fall back to type.
function getNotifTargetUrl(n) {
    if (!n.reference_id) return null;
    let post_type = n.post_type;
    if (!post_type) {
        if (n.type === 'blood_request') post_type = 'blood';
        else if (n.type === 'item_found') post_type = 'item';
    }
    if (post_type === 'blood') return `blood.html?post=${n.reference_id}`;
    if (post_type === 'item') return `lostfound.html?post=${n.reference_id}`;
    return null;
}

async function handleNotifClick(notification_id) {
    const n = allNotifications.find(x => x.notification_id === notification_id);
    if (!n) return;

    if (!n.is_read) {
        n.is_read = true;
        updateNotifBadge();
        renderNotifList();
        try {
            await apiCall(`/notifications/${notification_id}/read`, 'PUT');
        } catch (err) {
            // Non-critical - already reflected in the UI
        }
    }

    const targetUrl = getNotifTargetUrl(n);
    if (targetUrl) {
        closeNotifDropdown();
        window.location.href = targetUrl;
    }
}

async function markAllNotifsRead() {
    allNotifications.forEach(n => n.is_read = true);
    updateNotifBadge();
    renderNotifList();
    try {
        await apiCall('/notifications/read-all', 'PUT');
    } catch (err) {
        // Non-critical
    }
}

// Close the dropdown when clicking outside it
document.addEventListener('click', function(e) {
    const dropdown = document.getElementById('notifDropdown');
    const bell = document.getElementById('notifBell');
    if (!dropdown || !bell) return;
    if (dropdown.classList.contains('active') && !dropdown.contains(e.target) && !bell.contains(e.target)) {
        closeNotifDropdown();
    }
});

document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeNotifDropdown();
});

// Load on page start (this file is only included on logged-in pages)
loadNotifications();
