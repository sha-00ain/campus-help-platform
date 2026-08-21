// ===================================================
// Admin Controller
// ===================================================
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

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
        const [[{ total_users }]] = await db.query('SELECT COUNT(*) AS total_users FROM users');
        const [[{ total_blood }]] = await db.query('SELECT COUNT(*) AS total_blood FROM blood_requests');
        const [[{ total_items }]] = await db.query('SELECT COUNT(*) AS total_items FROM items');
        const [[{ total_comments }]] = await db.query('SELECT COUNT(*) AS total_comments FROM comments');
        const [[{ blocked_users }]] = await db.query('SELECT COUNT(*) AS blocked_users FROM users WHERE is_active = FALSE');

        res.json({ total_users, total_blood, total_items, total_comments, blocked_users });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// ===== USER MANAGEMENT =====
exports.getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT user_id, name, email, student_id, phone, blood_group, department, role, is_active, created_at
             FROM users ORDER BY created_at DESC`
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

        const [rows] = await db.query('SELECT user_id, role FROM users WHERE user_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
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
