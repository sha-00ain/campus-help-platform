// ===================================================
// Auth Controller: Register + Login
// ===================================================
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// REGISTER a new user
exports.register = async (req, res) => {
    try {
        const { name, email, password, student_id, phone, blood_group, department } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'Name, email and password are required.' });
        }

        // check if email already used
        const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Email already registered.' });
        }

        // hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.query(
            `INSERT INTO users (name, email, password_hash, student_id, phone, blood_group, department)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, email, hashedPassword, student_id, phone, blood_group, department]
        );

        res.status(201).json({ message: 'Registration successful!', user_id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during registration.' });
    }
};

// LOGIN existing user
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid email or password.' });
        }

        // create a JWT token that expires in 7 days
        const token = jwt.sign(
            { user_id: user.user_id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            message: 'Login successful!',
            token,
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                blood_group: user.blood_group,
                role: user.role
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error during login.' });
    }
};

// GET current logged-in user's full profile
exports.getProfile = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const [users] = await db.query(
            `SELECT user_id, name, email, student_id, phone, blood_group, department, role, created_at
             FROM users WHERE user_id = ?`,
            [user_id]
        );
        if (users.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json(users[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};

// UPDATE current logged-in user's profile
exports.updateProfile = async (req, res) => {
    try {
        const user_id = req.user.user_id;
        const { name, phone, blood_group, department, student_id } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Name is required.' });
        }

        await db.query(
            `UPDATE users SET name = ?, phone = ?, blood_group = ?, department = ?, student_id = ?
             WHERE user_id = ?`,
            [name, phone, blood_group, department, student_id, user_id]
        );

        res.json({ message: 'Profile updated successfully!' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error.' });
    }
};
