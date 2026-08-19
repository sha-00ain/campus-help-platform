// ===================================================
// Shared helper functions for all pages
// ===================================================

// Change this if your backend runs on a different port
const API_BASE = 'http://localhost:5000/api';

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
