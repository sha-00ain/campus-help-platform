// ===================================================
// Blood Donation Controller
// ===================================================
const db = require('../config/db');

// Register current logged-in user as a donor
exports.becomeDonor = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { location } = req.body;

        const [existing] = await db.query('SELECT * FROM donors WHERE user_id = ?', [user_id]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'You are already registered as a donor.' });
        }

        await db.query(
            'INSERT INTO donors (user_id, location, availability_status) VALUES (?, ?, "available")',
            [user_id, location]
        );

        res.status(201).json({ message: 'You are now registered as a donor!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Search donors by blood group and/or location
exports.searchDonors = async (req, res) => {
    try {
        const { blood_group, location } = req.query;

        let sql = `
            SELECT d.donor_id, u.name, u.email, u.phone, u.blood_group, d.location,
                   d.availability_status, d.total_donations, d.last_donation_date
            FROM donors d
            JOIN users u ON d.user_id = u.user_id
            WHERE d.availability_status = 'available'`;
        const params = [];

        if (blood_group) {
            sql += ' AND u.blood_group = ?';
            params.push(blood_group);
        }
        if (location) {
            sql += ' AND d.location LIKE ?';
            params.push(`%${location}%`);
        }

        const [donors] = await db.query(sql, params);
        res.json(donors);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Create a new blood request
exports.createRequest = async (req, res) => {
    try {
        const requester_id = req.user.user_id;
        const { blood_group_needed, patient_name, hospital_location, units_needed, urgency_level, image } = req.body;

        if (!blood_group_needed || !hospital_location) {
            return res.status(400).json({ message: 'Blood group and hospital location are required.' });
        }

        const [result] = await db.query(
            `INSERT INTO blood_requests (requester_id, blood_group_needed, patient_name, hospital_location, units_needed, urgency_level, image)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [requester_id, blood_group_needed, patient_name, hospital_location, units_needed || 1, urgency_level || 'normal', image || null]
        );

        res.status(201).json({ message: 'Blood request posted!', request_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Get all open blood requests
exports.getRequests = async (req, res) => {
    try {
        const [requests] = await db.query(
            `SELECT br.*, u.name AS requester_name, u.phone AS requester_phone
             FROM blood_requests br
             JOIN users u ON br.requester_id = u.user_id
             WHERE br.status = 'open'
             ORDER BY FIELD(br.urgency_level, 'critical','urgent','normal'), br.created_at DESC`
        );
        res.json(requests);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Respond to a blood request (as a donor)
exports.respondToRequest = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { request_id } = req.body;

        // find this user's donor_id
        const [donorRows] = await db.query('SELECT donor_id FROM donors WHERE user_id = ?', [user_id]);
        if (donorRows.length === 0) {
            return res.status(400).json({ message: 'Please register as a donor first.' });
        }
        const donor_id = donorRows[0].donor_id;

        await db.query(
            'INSERT INTO donation_responses (request_id, donor_id, status) VALUES (?, ?, "pending")',
            [request_id, donor_id]
        );

        res.status(201).json({ message: 'Response sent! The requester will be notified.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Update a blood request (only the person who posted it can edit)
exports.updateRequest = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { id } = req.params;
        const { blood_group_needed, patient_name, hospital_location, units_needed, urgency_level, image } = req.body;

        const [rows] = await db.query('SELECT requester_id, image FROM blood_requests WHERE request_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Request not found.' });
        }
        if (rows[0].requester_id !== user_id) {
            return res.status(403).json({ message: 'You can only edit your own requests.' });
        }

        // keep the existing image if a new one wasn't sent
        const finalImage = (image !== undefined && image !== null) ? image : rows[0].image;

        await db.query(
            `UPDATE blood_requests SET blood_group_needed = ?, patient_name = ?, hospital_location = ?, units_needed = ?, urgency_level = ?, image = ?
             WHERE request_id = ?`,
            [blood_group_needed, patient_name, hospital_location, units_needed || 1, urgency_level || 'normal', finalImage, id]
        );

        res.json({ message: 'Request updated successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Delete a blood request (only the person who posted it can delete)
exports.deleteRequest = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { id } = req.params;

        const [rows] = await db.query('SELECT requester_id FROM blood_requests WHERE request_id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Request not found.' });
        }
        if (rows[0].requester_id !== user_id) {
            return res.status(403).json({ message: 'You can only delete your own requests.' });
        }

        await db.query('DELETE FROM blood_requests WHERE request_id = ?', [id]);
        res.json({ message: 'Request deleted.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};
