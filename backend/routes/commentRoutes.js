const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const verifyToken = require('../middleware/auth');

router.post('/', verifyToken, commentController.addComment);
router.get('/:postType/:postId', verifyToken, commentController.getComments);
router.delete('/:id', verifyToken, commentController.deleteComment);

module.exports = router;
