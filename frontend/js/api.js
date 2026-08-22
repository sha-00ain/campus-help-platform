// ===================================================
// Shared helper functions for all pages
// ===================================================

// Change this if your backend runs on a different port
const API_BASE = 'https://campus-help-platform-d7ce.onrender.com/api';

// Get the saved login token
function getToken() {
    return localStorage.getItem('token');
}

// Get the saved logged-in user info
function getUser() {
    const u = localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
}

// Redirect to login if not logged in (use this on protected pages)
function requireLogin() {
    if (!getToken()) {
        window.location.href = 'login.html';
    }
}

// Fire a lightweight, fire-and-forget request to wake up the backend.
// Render's free tier puts the server to sleep after inactivity, and the
// first real request can take 30-60s while it wakes up. Calling this as
// soon as the login/register page loads means the server is already
// waking up in the background while the person is still typing their
// email and password, so the actual login/register click feels instant.
function wakeServer() {
    const rootUrl = API_BASE.replace(/\/api\/?$/, '/');
    fetch(rootUrl).catch(() => {});
}

// Turn a MySQL datetime into a friendly "time ago" string (shared by any
// page that shows timestamps - feed posts, comments, etc.)
function timeAgo(dateStr) {
    const then = new Date(dateStr.replace(' ', 'T'));
    const seconds = Math.floor((new Date() - then) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// Convert a selected <input type="file"> image into a base64 string (or null if none chosen)
function fileToBase64(inputElement) {
    return new Promise((resolve, reject) => {
        const file = inputElement.files[0];
        if (!file) {
            resolve(null);
            return;
        }
        // keep images reasonably small - limit to 3MB
        if (file.size > 3 * 1024 * 1024) {
            reject(new Error('Image is too large. Please choose an image under 3MB.'));
            return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result); // includes "data:image/...;base64," prefix
        reader.onerror = () => reject(new Error('Could not read the image file.'));
        reader.readAsDataURL(file);
    });
}

// Go back one page (used by the back arrow in nav). Falls back to home.html if no history.
function goBack() {
    if (document.referrer && document.referrer.includes(window.location.host)) {
        window.history.back();
    } else {
        window.location.href = 'home.html';
    }
}

// Log out
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Generic function to call the backend API
async function apiCall(endpoint, method = 'GET', body = null, useAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (useAuth && getToken()) {
        headers['Authorization'] = 'Bearer ' + getToken();
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(API_BASE + endpoint, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }
    return data;
}

// Show a message box (success or error) inside a given element id
function showMessage(elementId, text, type = 'success') {
    const el = document.getElementById(elementId);
    el.innerHTML = `<div class="msg ${type}">${text}</div>`;
}

// Build page-number pagination HTML like [1] {2} [3] ... [last]
// containerId: where to render the buttons
// totalItems: total number of items across all pages
// pageSize: items per page (default 10)
// currentPage: which page is active right now
// onPageChangeFnName: the name (as a string) of a global function to call when a page is clicked
function renderPagination(containerId, totalItems, pageSize, currentPage, onPageChangeFnName) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalPages = Math.ceil(totalItems / pageSize);
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = '<div class="pagination">';
    for (let i = 1; i <= totalPages; i++) {
        const isActive = i === currentPage;
        html += `<button type="button" class="page-btn ${isActive ? 'active' : ''}" onclick="${onPageChangeFnName}(${i})">${i}</button>`;
    }
    html += '</div>';
    container.innerHTML = html;
}

// ===== ADMIN API HELPERS =====
function getAdminToken() {
    return localStorage.getItem('adminToken');
}

function requireAdminLogin() {
    if (!getAdminToken()) {
        window.location.href = 'admin-login.html';
    }
}

function adminLogout() {
    localStorage.removeItem('adminToken');
    window.location.href = 'admin-login.html';
}

// Generic function to call the backend API using the ADMIN token
async function adminApiCall(endpoint, method = 'GET', body = null, useAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (useAuth && getAdminToken()) {
        headers['Authorization'] = 'Bearer ' + getAdminToken();
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const response = await fetch(API_BASE + endpoint, options);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
    }
    return data;
}
