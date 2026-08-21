const express = require('express');
const router = express.Router();
const bloodController = require('../controllers/bloodController');
const verifyToken = require('../middleware/auth');

router.post('/become-donor', verifyToken, bloodController.becomeDonor);
router.get('/donors', verifyToken, bloodController.searchDonors);
router.post('/requests', verifyToken, bloodController.createRequest);
router.get('/requests', verifyToken, bloodController.getRequests);
router.put('/requests/:id', verifyToken, bloodController.updateRequest);
router.delete('/requests/:id', verifyToken, bloodController.deleteRequest);
router.post('/respond', verifyToken, bloodController.respondToRequest);

module.exports = router;
