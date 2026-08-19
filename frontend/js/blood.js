requireLogin();

// Switch between tabs/sections
function showSection(id) {
    ['requestsSection','postSection','searchSection','donorSection'].forEach(s => {
        document.getElementById(s).style.display = (s === id) ? 'block' : 'none';
    });
    document.querySelectorAll('.tabs a').forEach(a => a.classList.remove('active'));
    event.target.classList.add('active');
}

// Load all open blood requests
async function loadRequests() {
    try {
        const requests = await apiCall('/blood/requests', 'GET');
        const container = document.getElementById('requestsList');

        if (requests.length === 0) {
            container.innerHTML = '<p>No open requests right now. 🎉</p>';
            return;
        }

        container.innerHTML = requests.map(r => `
            <div class="item-box">
                <h4>${r.blood_group_needed} needed
                    <span class="tag ${r.urgency_level}">${r.urgency_level}</span>
                </h4>
                ${r.image ? `<img src="${r.image}" style="max-width:200px; border-radius:8px; margin:8px 0;">` : ''}
                <p><b>Patient:</b> ${r.patient_name || 'N/A'}</p>
                <p><b>Location:</b> ${r.hospital_location}</p>
                <p><b>Units needed:</b> ${r.units_needed}</p>
                <p><b>Posted by:</b> ${r.requester_name} (${r.requester_phone || 'no phone'})</p>
                <button onclick="respondToRequest(${r.request_id})">I Can Donate</button>
            </div>
        `).join('');
    } catch (err) {
        document.getElementById('requestsList').innerHTML = `<div class="msg error">${err.message}</div>`;
    }
}

// Respond to a request (offer to donate)
async function respondToRequest(request_id) {
    try {
        await apiCall('/blood/respond', 'POST', { request_id });
        alert('Thank you! Your response has been sent to the requester.');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Show a small preview when user picks an image
document.getElementById('requestImage').addEventListener('change', () => {
    const file = document.getElementById('requestImage').files[0];
    const preview = document.getElementById('requestImagePreview');
    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
});

// Post a new blood request
document.getElementById('requestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const image = await fileToBase64(document.getElementById('requestImage'));
        const body = {
            blood_group_needed: document.getElementById('blood_group_needed').value,
            patient_name: document.getElementById('patient_name').value,
            hospital_location: document.getElementById('hospital_location').value,
            units_needed: document.getElementById('units_needed').value,
            urgency_level: document.getElementById('urgency_level').value,
            image: image
        };
        await apiCall('/blood/requests', 'POST', body);
        showMessage('postMsg', 'Request posted successfully!', 'success');
        document.getElementById('requestForm').reset();
        document.getElementById('requestImagePreview').style.display = 'none';
    } catch (err) {
        showMessage('postMsg', err.message, 'error');
    }
});

// Search donors
async function searchDonors() {
    try {
        const bg = document.getElementById('searchBloodGroup').value;
        const loc = document.getElementById('searchLocation').value;
        const query = new URLSearchParams();
        if (bg) query.append('blood_group', bg);
        if (loc) query.append('location', loc);

        const donors = await apiCall('/blood/donors?' + query.toString(), 'GET');
        const container = document.getElementById('donorResults');

        if (donors.length === 0) {
            container.innerHTML = '<p>No donors found.</p>';
            return;
        }

        container.innerHTML = donors.map(d => `
            <div class="item-box">
                <h4>${d.name} <span class="tag">${d.blood_group}</span></h4>
                <p><b>Location:</b> ${d.location || 'N/A'}</p>
                <p><b>Phone:</b> ${d.phone || 'N/A'}</p>
                <p><b>Total Donations:</b> ${d.total_donations}</p>
            </div>
        `).join('');
    } catch (err) {
        document.getElementById('donorResults').innerHTML = `<div class="msg error">${err.message}</div>`;
    }
}

// Become a donor
async function becomeDonor() {
    try {
        const location = document.getElementById('donorLocation').value;
        await apiCall('/blood/become-donor', 'POST', { location });
        showMessage('donorMsg', 'You are now registered as a donor!', 'success');
    } catch (err) {
        showMessage('donorMsg', err.message, 'error');
    }
}

// Load requests on page load
loadRequests();
