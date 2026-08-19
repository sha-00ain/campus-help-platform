requireLogin();

// Load current profile details from backend
async function loadProfile() {
    try {
        const profile = await apiCall('/auth/profile', 'GET');

        document.getElementById('profileName').innerText = profile.name;
        document.getElementById('profileEmail').innerText = profile.email;
        document.getElementById('avatarInitial').innerText = profile.name.charAt(0).toUpperCase();

        document.getElementById('name').value = profile.name || '';
        document.getElementById('email').value = profile.email || '';
        document.getElementById('student_id').value = profile.student_id || '';
        document.getElementById('phone').value = profile.phone || '';
        document.getElementById('blood_group').value = profile.blood_group || '';
        document.getElementById('department').value = profile.department || '';
    } catch (err) {
        showMessage('msgBox', err.message, 'error');
    }
}

// Save edited profile
document.getElementById('profileForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const body = {
            name: document.getElementById('name').value,
            student_id: document.getElementById('student_id').value,
            phone: document.getElementById('phone').value,
            blood_group: document.getElementById('blood_group').value,
            department: document.getElementById('department').value
        };
        await apiCall('/auth/profile', 'PUT', body);

        // Update the locally saved user info too (used for the welcome message on Home)
        const currentUser = getUser();
        currentUser.name = body.name;
        currentUser.blood_group = body.blood_group;
        localStorage.setItem('user', JSON.stringify(currentUser));

        showMessage('msgBox', 'Profile updated successfully!', 'success');
        loadProfile();
    } catch (err) {
        showMessage('msgBox', err.message, 'error');
    }
});

loadProfile();
