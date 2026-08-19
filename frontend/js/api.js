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
