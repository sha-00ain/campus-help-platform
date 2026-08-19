-- ===================================================
-- Campus Community Help Platform
-- Blood Donation + Lost & Found Module
-- ===================================================

CREATE DATABASE IF NOT EXISTS campus_help_platform;
USE campus_help_platform;

-- 1. USERS TABLE (shared login for everyone)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    student_id VARCHAR(20),
    phone VARCHAR(20),
    blood_group VARCHAR(5),
    department VARCHAR(50),
    role ENUM('student','staff','admin') DEFAULT 'student',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. DONORS TABLE
CREATE TABLE donors (
    donor_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    last_donation_date DATE,
    availability_status ENUM('available','unavailable') DEFAULT 'available',
    total_donations INT DEFAULT 0,
    location VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 3. BLOOD REQUESTS TABLE
CREATE TABLE blood_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    requester_id INT NOT NULL,
    blood_group_needed VARCHAR(5) NOT NULL,
    patient_name VARCHAR(100),
    hospital_location VARCHAR(150) NOT NULL,
    units_needed INT DEFAULT 1,
    urgency_level ENUM('normal','urgent','critical') DEFAULT 'normal',
    status ENUM('open','fulfilled','closed') DEFAULT 'open',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (requester_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 4. DONATION RESPONSES TABLE
CREATE TABLE donation_responses (
    response_id INT AUTO_INCREMENT PRIMARY KEY,
    request_id INT NOT NULL,
    donor_id INT NOT NULL,
    status ENUM('pending','accepted','rejected','completed') DEFAULT 'pending',
    responded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (request_id) REFERENCES blood_requests(request_id) ON DELETE CASCADE,
    FOREIGN KEY (donor_id) REFERENCES donors(donor_id) ON DELETE CASCADE
);

-- 5. ITEMS TABLE (Lost & Found)
CREATE TABLE items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    posted_by INT NOT NULL,
    item_type ENUM('lost','found') NOT NULL,
    category VARCHAR(50),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    location VARCHAR(150),
    date_occurred DATE,
    status ENUM('pending','claimed','closed') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (posted_by) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 6. CLAIM REQUESTS TABLE
CREATE TABLE claim_requests (
    claim_id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    claimant_id INT NOT NULL,
    proof_description TEXT,
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(item_id) ON DELETE CASCADE,
    FOREIGN KEY (claimant_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 7. NOTIFICATIONS TABLE (generic, works for future modules too)
CREATE TABLE notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('blood_request','item_found','item_claim','event_alert','general') DEFAULT 'general',
    reference_id INT,
    message TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ===================================================
-- INDEXES (for performance)
-- ===================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_blood_group ON users(blood_group);
CREATE INDEX idx_requests_status_urgency ON blood_requests(status, urgency_level);
CREATE INDEX idx_items_type_category_status ON items(item_type, category, status);
