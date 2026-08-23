// ===================================================
// Notifications Controller (personal notifications for the logged-in user)
// ===================================================
const db = require('../config/db');

// Get the current user's recent notifications (most recent first)
exports.getMyNotifications = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const [notifications] = await db.query(
            `SELECT notification_id, type, reference_id, message, is_read, created_at
             FROM notifications
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 50`,
            [user_id]
        );
        res.json(notifications);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Mark one notification as read (only if it belongs to the current user)
exports.markAsRead = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { id } = req.params;

        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
            [id, user_id]
        );
        res.json({ message: 'Marked as read.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Mark every notification as read for the current user
exports.markAllAsRead = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        await db.query(
            'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
            [user_id]
        );
        res.json({ message: 'All notifications marked as read.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};
