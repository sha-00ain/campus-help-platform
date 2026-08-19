// ===================================================
// Lost & Found Controller
// ===================================================
const db = require('../config/db');

// Post a new lost or found item
exports.createItem = async (req, res) => {
    try {
        const posted_by = req.user.user_id;
        const { item_type, category, title, description, location, date_occurred } = req.body;

        if (!item_type || !title) {
            return res.status(400).json({ message: 'Item type and title are required.' });
        }

        const [result] = await db.query(
            `INSERT INTO items (posted_by, item_type, category, title, description, location, date_occurred)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [posted_by, item_type, category, title, description, location, date_occurred]
        );

        res.status(201).json({ message: 'Item posted successfully!', item_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Get all items, with optional filters (type, category, search keyword)
exports.getItems = async (req, res) => {
    try {
        const { item_type, category, keyword } = req.query;

        let sql = `
            SELECT i.*, u.name AS posted_by_name, u.phone AS posted_by_phone
            FROM items i
            JOIN users u ON i.posted_by = u.user_id
            WHERE i.status = 'pending'`;
        const params = [];

        if (item_type) {
            sql += ' AND i.item_type = ?';
            params.push(item_type);
        }
        if (category) {
            sql += ' AND i.category = ?';
            params.push(category);
        }
        if (keyword) {
            sql += ' AND (i.title LIKE ? OR i.description LIKE ?)';
            params.push(`%${keyword}%`, `%${keyword}%`);
        }

        sql += ' ORDER BY i.created_at DESC';

        const [items] = await db.query(sql, params);
        res.json(items);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Claim an item (as the owner)
exports.claimItem = async (req, res) => {
    try {
        const claimant_id = req.user.user_id;
        const { item_id, proof_description } = req.body;

        if (!item_id) {
            return res.status(400).json({ message: 'item_id is required.' });
        }

        await db.query(
            'INSERT INTO claim_requests (item_id, claimant_id, proof_description) VALUES (?, ?, ?)',
            [item_id, claimant_id, proof_description]
        );

        res.status(201).json({ message: 'Claim request submitted! The poster will review it.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Get claim requests for items that I posted (so I can approve/reject)
exports.getClaimsForMyItems = async (req, res) => {
    try {
        const user_id = req.user.user_id;

        const [claims] = await db.query(
            `SELECT c.*, i.title AS item_title, u.name AS claimant_name, u.phone AS claimant_phone
             FROM claim_requests c
             JOIN items i ON c.item_id = i.item_id
             JOIN users u ON c.claimant_id = u.user_id
             WHERE i.posted_by = ?
             ORDER BY c.created_at DESC`,
            [user_id]
        );
        res.json(claims);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Approve or reject a claim
exports.updateClaimStatus = async (req, res) => {
    try {
        const { claim_id, status } = req.body; // status: 'approved' or 'rejected'

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Status must be approved or rejected.' });
        }

        await db.query('UPDATE claim_requests SET status = ? WHERE claim_id = ?', [status, claim_id]);

        if (status === 'approved') {
            // mark the item as claimed
            const [claimRows] = await db.query('SELECT item_id FROM claim_requests WHERE claim_id = ?', [claim_id]);
            if (claimRows.length > 0) {
                await db.query('UPDATE items SET status = "claimed" WHERE item_id = ?', [claimRows[0].item_id]);
            }
        }

        res.json({ message: `Claim ${status}.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};
