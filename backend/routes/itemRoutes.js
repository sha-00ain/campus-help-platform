const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const verifyToken = require('../middleware/auth');

router.post('/', verifyToken, itemController.createItem);
router.get('/', verifyToken, itemController.getItems);
router.put('/:id', verifyToken, itemController.updateItem);
router.delete('/:id', verifyToken, itemController.deleteItem);
router.post('/claim', verifyToken, itemController.claimItem);
router.get('/my-claims', verifyToken, itemController.getClaimsForMyItems);
router.put('/claim-status', verifyToken, itemController.updateClaimStatus);

module.exports = router;
