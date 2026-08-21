const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const verifyAdmin = require('../middleware/adminAuth');

// Public - admin login
router.post('/login', adminController.login);

// Protected - admin only
router.get('/stats', verifyAdmin, adminController.getStats);
router.get('/users', verifyAdmin, adminController.getAllUsers);
router.put('/users/:id/block', verifyAdmin, adminController.setUserBlockStatus);

router.get('/blood', verifyAdmin, adminController.getAllBloodRequests);
router.put('/blood/:id', verifyAdmin, adminController.updateAnyBloodRequest);
router.delete('/blood/:id', verifyAdmin, adminController.deleteAnyBloodRequest);

router.get('/items', verifyAdmin, adminController.getAllItems);
router.put('/items/:id', verifyAdmin, adminController.updateAnyItem);
router.delete('/items/:id', verifyAdmin, adminController.deleteAnyItem);

module.exports = router;
