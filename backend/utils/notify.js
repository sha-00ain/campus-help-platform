// ===================================================
// Notification helpers - shared by any controller that needs to notify
// users (new posts, comments, replies). Keeps the INSERT logic in one place
// instead of duplicated across controllers.
// ===================================================
const db = require('../config/db');

// The hidden "Admin" marker account (see adminController.js) should never
// receive or be counted in broadcast notifications.
const ADMIN_MARKER_EMAIL = 'system.admin@hamdarduniversity.edu.bd';

// Insert one notification row.
// post_type ('blood' | 'item' | null) tells the frontend which page
// reference_id points to, so a notification can be clicked straight through
// to the post it's about.
async function createNotification(user_id, type, reference_id, message, post_type = null) {
    try {
        await db.query(
            'INSERT INTO notifications (user_id, type, reference_id, post_type, message) VALUES (?, ?, ?, ?, ?)',
            [user_id, type, reference_id, post_type, message]
        );
    } catch (err) {
        // Notifications are a nice-to-have - never let a notification failure
        // break the actual action (post creation, commenting, etc.)
        console.error('Failed to create notification:', err.message);
    }
}

// Notify every active user except the poster (used for "new post" alerts)
async function notifyAllUsersExcept(excludeUserId, type, reference_id, message, post_type = null) {
    try {
        const [users] = await db.query(
            'SELECT user_id FROM users WHERE user_id != ? AND is_active = TRUE AND email != ?',
            [excludeUserId, ADMIN_MARKER_EMAIL]
        );
        for (const u of users) {
            await createNotification(u.user_id, type, reference_id, message, post_type);
        }
    } catch (err) {
        console.error('Failed to broadcast notification:', err.message);
    }
}

// Look up who owns a post (blood request or lost&found item) and a short
// human-readable label for it, used to build comment/reply notification text
async function getPostOwnerAndContext(post_type, post_id) {
    if (post_type === 'blood') {
        const [rows] = await db.query(
            'SELECT requester_id AS owner_id, blood_group_needed AS label FROM blood_requests WHERE request_id = ?',
            [post_id]
        );
        if (rows.length === 0) return null;
        return { owner_id: rows[0].owner_id, label: `your ${rows[0].label} blood request` };
    } else {
        const [rows] = await db.query(
            'SELECT posted_by AS owner_id, title AS label FROM items WHERE item_id = ?',
            [post_id]
        );
        if (rows.length === 0) return null;
        return { owner_id: rows[0].owner_id, label: `your post "${rows[0].label}"` };
    }
}

module.exports = { createNotification, notifyAllUsersExcept, getPostOwnerAndContext, ADMIN_MARKER_EMAIL };
