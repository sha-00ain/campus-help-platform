// ===================================================
// Comment Controller — simple comments on blood requests or lost&found items
// ===================================================
const db = require('../config/db');

// Add a comment to a post (blood request or item)
exports.addComment = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { post_type, post_id, comment_text } = req.body;

        if (!post_type || !post_id || !comment_text || !comment_text.trim()) {
            return res.status(400).json({ message: 'post_type, post_id, and comment_text are required.' });
        }
        if (!['blood', 'item'].includes(post_type)) {
            return res.status(400).json({ message: 'Invalid post_type.' });
        }

        const [result] = await db.query(
            'INSERT INTO comments (post_type, post_id, user_id, comment_text) VALUES (?, ?, ?, ?)',
            [post_type, post_id, user_id, comment_text.trim()]
        );

        res.status(201).json({ message: 'Comment added.', comment_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Get all comments for a specific post
exports.getComments = async (req, res) => {
    try {
        const { postType, postId } = req.params;

        const [comments] = await db.query(
            `SELECT c.comment_id, c.comment_text, c.created_at, u.user_id, u.name, u.profile_picture
             FROM comments c
             JOIN users u ON c.user_id = u.user_id
             WHERE c.post_type = ? AND c.post_id = ?
             ORDER BY c.created_at ASC`,
            [postType, postId]
        );

        res.json(comments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Delete a comment (only the person who wrote it can delete it)
exports.deleteComment = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { id } = req.params;

        const [rows] = await db.query('SELECT user_id FROM comments WHERE comment_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Comment not found.' });
        }
        if (rows[0].user_id !== user_id) {
            return res.status(403).json({ message: 'You can only delete your own comments.' });
        }

        await db.query('DELETE FROM comments WHERE comment_id = ?', [id]);
        res.json({ message: 'Comment deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};
