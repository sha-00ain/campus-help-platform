// ===================================================
// Admin Controller
// ===================================================
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const { createNotification, getPostOwnerAndContext } = require('../utils/notify');
require('dotenv').config();

// A fixed, reserved marker email used to represent the admin as a "user" row
// so that comments the admin posts can be stored/joined like any other comment
// and shown to everyone as posted by "Admin". This account is set inactive
// (is_active = FALSE) so it can never be used to log in through the normal
// student login, even if someone guessed its randomly-generated password.
const ADMIN_MARKER_EMAIL = 'system.admin@hamdarduniversity.edu.bd';

async function getOrCreateAdminUserId() {
    const [rows] = await db.query('SELECT user_id FROM users WHERE email = ?', [ADMIN_MARKER_EMAIL]);
    if (rows.length > 0) {
        return rows[0].user_id;
    }

    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const [result] = await db.query(
        `INSERT INTO users (name, email, password_hash, role, is_active) VALUES (?, ?, ?, 'admin', FALSE)`,
        ['Admin', ADMIN_MARKER_EMAIL, hashedPassword]
    );
    return result.insertId;
}

// ===== ADMIN LOGIN =====
// Admin credentials are stored as environment variables, not in the users table,
// since the admin account should not be subject to the student email restriction.
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        if (email !== process.env.ADMIN_EMAIL || password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ message: 'Invalid admin credentials.' });
        }

        const token = jwt.sign(
            { role: 'admin', email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ message: 'Admin login successful!', token, admin: { email } });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during admin login.' });
    }
};

// ===== DASHBOARD STATS =====
exports.getStats = async (req, res) => {
    try {
        // Exclude the hidden "Admin" marker account from every count so it never
        // inflates the numbers or looks like a real blocked user.
        const [[{ total_users }]] = await db.query(
            'SELECT COUNT(*) AS total_users FROM users WHERE email != ?', [ADMIN_MARKER_EMAIL]
        );
        const [[{ total_blood }]] = await db.query('SELECT COUNT(*) AS total_blood FROM blood_requests');
        const [[{ total_items }]] = await db.query('SELECT COUNT(*) AS total_items FROM items');
        const [[{ total_comments }]] = await db.query('SELECT COUNT(*) AS total_comments FROM comments');
        const [[{ blocked_users }]] = await db.query(
            'SELECT COUNT(*) AS blocked_users FROM users WHERE is_active = FALSE AND email != ?', [ADMIN_MARKER_EMAIL]
        );

        res.json({ total_users, total_blood, total_items, total_comments, blocked_users });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// ===== USER MANAGEMENT =====
exports.getAllUsers = async (req, res) => {
    try {
        // Exclude the hidden "Admin" marker account - it should never show up in
        // the users list (deleting it would wipe out every admin-posted comment).
        const [users] = await db.query(
            `SELECT user_id, name, email, student_id, phone, blood_group, department, role, is_active, created_at
             FROM users WHERE email != ? ORDER BY created_at DESC`,
            [ADMIN_MARKER_EMAIL]
        );
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Block or unblock a user
exports.setUserBlockStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body; // true = unblock/active, false = block

        const [rows] = await db.query('SELECT email FROM users WHERE user_id = ?', [id]);
        if (rows.length > 0 && rows[0].email === ADMIN_MARKER_EMAIL) {
            return res.status(400).json({ message: 'This account cannot be modified.' });
        }

        await db.query('UPDATE users SET is_active = ? WHERE user_id = ?', [is_active, id]);
        res.json({ message: is_active ? 'User unblocked.' : 'User blocked.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Permanently delete a user account (cascades to their donor profile,
// blood requests, items, claims, comments, and notifications via FK ON DELETE CASCADE)
exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        const [rows] = await db.query('SELECT user_id, email FROM users WHERE user_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (rows[0].email === ADMIN_MARKER_EMAIL) {
            return res.status(400).json({ message: 'This account cannot be deleted.' });
        }

        await db.query('DELETE FROM users WHERE user_id = ?', [id]);
        res.json({ message: 'User account deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// ===== POST MODERATION (admin can see/edit/delete ANY post) =====
exports.getAllBloodRequests = async (req, res) => {
    try {
        const [requests] = await db.query(
            `SELECT br.*, u.name AS requester_name, u.email AS requester_email
             FROM blood_requests br
             JOIN users u ON br.requester_id = u.user_id
             ORDER BY br.created_at DESC`
        );
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.getAllItems = async (req, res) => {
    try {
        const [items] = await db.query(
            `SELECT i.*, u.name AS posted_by_name, u.email AS posted_by_email
             FROM items i
             JOIN users u ON i.posted_by = u.user_id
             ORDER BY i.created_at DESC`
        );
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.deleteAnyBloodRequest = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM blood_requests WHERE request_id = ?', [id]);
        res.json({ message: 'Blood request deleted by admin.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.deleteAnyItem = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM items WHERE item_id = ?', [id]);
        res.json({ message: 'Item deleted by admin.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.updateAnyBloodRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { blood_group_needed, patient_name, hospital_location, units_needed, urgency_level, status } = req.body;

        await db.query(
            `UPDATE blood_requests SET blood_group_needed = ?, patient_name = ?, hospital_location = ?, units_needed = ?, urgency_level = ?, status = ?
             WHERE request_id = ?`,
            [blood_group_needed, patient_name, hospital_location, units_needed, urgency_level, status, id]
        );
        res.json({ message: 'Blood request updated by admin.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

exports.updateAnyItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { item_type, category, title, description, location, date_occurred, status } = req.body;

        await db.query(
            `UPDATE items SET item_type = ?, category = ?, title = ?, description = ?, location = ?, date_occurred = ?, status = ?
             WHERE item_id = ?`,
            [item_type, category, title, description, location, date_occurred, status, id]
        );
        res.json({ message: 'Item updated by admin.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// ===== COMMENT MODERATION (admin can see every comment across all posts) =====
exports.getAllComments = async (req, res) => {
    try {
        const [comments] = await db.query(
            `SELECT c.comment_id, c.comment_text, c.created_at, c.post_type, c.post_id,
                    u.name AS commenter_name, u.email AS commenter_email,
                    CASE
                        WHEN c.post_type = 'blood' THEN br.blood_group_needed
                        ELSE i.title
                    END AS post_title
             FROM comments c
             JOIN users u ON c.user_id = u.user_id
             LEFT JOIN blood_requests br ON c.post_type = 'blood' AND c.post_id = br.request_id
             LEFT JOIN items i ON c.post_type = 'item' AND c.post_id = i.item_id
             ORDER BY c.created_at DESC`
        );
        res.json(comments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Get all comments for one specific post (admin view, works for any post) -
// threaded the same way as the public comment endpoint
exports.getCommentsForPost = async (req, res) => {
    try {
        const { postType, postId } = req.params;

        const [rows] = await db.query(
            `SELECT c.comment_id, c.comment_text, c.created_at, c.parent_comment_id,
                    u.user_id, u.name, u.profile_picture,
                    ru.name AS reply_to_name, pc.user_id AS reply_to_user_id
             FROM comments c
             JOIN users u ON c.user_id = u.user_id
             LEFT JOIN comments pc ON c.parent_comment_id = pc.comment_id
             LEFT JOIN users ru ON pc.user_id = ru.user_id
             WHERE c.post_type = ? AND c.post_id = ?
             ORDER BY c.created_at ASC`,
            [postType, postId]
        );
        res.json(threadComments(rows));
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Reorder a flat, created_at-sorted comment list so every reply sits
// immediately after the top-level comment it belongs to (mirrors the same
// helper in commentController.js, kept local here to avoid a cross-import).
function threadComments(rows) {
    const repliesByParent = {};
    const topLevel = [];

    rows.forEach(r => {
        if (r.parent_comment_id) {
            if (!repliesByParent[r.parent_comment_id]) repliesByParent[r.parent_comment_id] = [];
            repliesByParent[r.parent_comment_id].push(r);
        } else {
            topLevel.push(r);
        }
    });

    const threaded = [];
    topLevel.forEach(c => {
        threaded.push(c);
        (repliesByParent[c.comment_id] || []).forEach(r => threaded.push(r));
    });
    return threaded;
}

// Post a comment as "Admin" on any post - optionally a reply to another comment
exports.addAdminComment = async (req, res) => {
    try {
        const { post_type, post_id, comment_text, parent_comment_id } = req.body;

        if (!post_type || !post_id || !comment_text || !comment_text.trim()) {
            return res.status(400).json({ message: 'post_type, post_id, and comment_text are required.' });
        }
        if (!['blood', 'item'].includes(post_type)) {
            return res.status(400).json({ message: 'Invalid post_type.' });
        }

        let parentId = null;
        let parentAuthorId = null;
        if (parent_comment_id) {
            const [parentRows] = await db.query(
                'SELECT comment_id, user_id FROM comments WHERE comment_id = ? AND post_type = ? AND post_id = ?',
                [parent_comment_id, post_type, post_id]
            );
            if (parentRows.length === 0) {
                return res.status(400).json({ message: 'The comment you are replying to no longer exists.' });
            }
            parentId = parent_comment_id;
            parentAuthorId = parentRows[0].user_id;
        }

        const adminUserId = await getOrCreateAdminUserId();

        const [result] = await db.query(
            'INSERT INTO comments (post_type, post_id, user_id, comment_text, parent_comment_id) VALUES (?, ?, ?, ?, ?)',
            [post_type, post_id, adminUserId, comment_text.trim(), parentId]
        );

        // Notify the relevant people (Admin's own account is never notified)
        (async () => {
            try {
                const notified = new Set([adminUserId]);

                if (parentAuthorId && !notified.has(parentAuthorId)) {
                    await createNotification(parentAuthorId, 'general', post_id, `Admin replied to your comment`);
                    notified.add(parentAuthorId);
                }

                const postInfo = await getPostOwnerAndContext(post_type, post_id);
                if (postInfo && !notified.has(postInfo.owner_id)) {
                    await createNotification(postInfo.owner_id, 'general', post_id, `Admin commented on ${postInfo.label}`);
                }
            } catch (notifyErr) {
                console.error('Admin comment notification error:', notifyErr.message);
            }
        })();

        res.status(201).json({ message: 'Comment added as Admin.', comment_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};
