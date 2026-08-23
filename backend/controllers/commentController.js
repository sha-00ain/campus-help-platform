// ===================================================
// Comment Controller — simple comments on blood requests or lost&found items
// ===================================================
const db = require('../config/db');
const { createNotification, getPostOwnerAndContext } = require('../utils/notify');

// Add a comment to a post (blood request or item) - optionally a reply to
// another comment on that same post via parent_comment_id
exports.addComment = async (req, res) => {
    try {
        const user_id = req.user.user_id;
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
            // The comment being replied to must exist on this same post
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

        const [result] = await db.query(
            'INSERT INTO comments (post_type, post_id, user_id, comment_text, parent_comment_id) VALUES (?, ?, ?, ?, ?)',
            [post_type, post_id, user_id, comment_text.trim(), parentId]
        );

        // Notify the relevant people (never notify the commenter about their own action)
        (async () => {
            try {
                const [[commenter]] = await db.query('SELECT name FROM users WHERE user_id = ?', [user_id]);
                const commenterName = commenter ? commenter.name : 'Someone';
                const notified = new Set([user_id]);

                if (parentAuthorId && !notified.has(parentAuthorId)) {
                    await createNotification(parentAuthorId, 'general', post_id, `${commenterName} replied to your comment`, post_type);
                    notified.add(parentAuthorId);
                }

                const postInfo = await getPostOwnerAndContext(post_type, post_id);
                if (postInfo && !notified.has(postInfo.owner_id)) {
                    await createNotification(postInfo.owner_id, 'general', post_id, `${commenterName} commented on ${postInfo.label}`, post_type);
                }
            } catch (notifyErr) {
                console.error('Comment notification error:', notifyErr.message);
            }
        })();

        res.status(201).json({ message: 'Comment added.', comment_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Get all comments for a specific post, threaded so each reply is placed
// directly after the comment it replies to (with reply_to_name so the
// frontend can show who a reply is addressed to)
exports.getComments = async (req, res) => {
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
// immediately after the top-level comment it belongs to.
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
