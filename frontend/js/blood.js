requireLogin();
const currentUser = getUser();

// Switch between tabs/sections
function showSection(id) {
    ['requestsSection','postSection','searchSection','donorSection'].forEach(s => {
        document.getElementById(s).style.display = (s === id) ? 'block' : 'none';
    });
    document.querySelectorAll('.tabs a').forEach(a => a.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');

    // reset the post form back to "create" mode whenever we navigate to it fresh via tabs
    if (id === 'postSection') {
        exitEditMode();
    }
}

// ===== Pagination state for the requests list =====
const REQUESTS_PAGE_SIZE = 10;
let allRequests = [];
let currentRequestsPage = 1;

// Load all open blood requests
async function loadRequests() {
    try {
        allRequests = await apiCall('/blood/requests', 'GET');
        currentRequestsPage = 1;
        renderRequestsPage(1);
    } catch (err) {
        document.getElementById('requestsList').innerHTML = `<div class="msg error">${err.message}</div>`;
    }
}

function renderRequestsPage(page) {
    currentRequestsPage = page;
    const container = document.getElementById('requestsList');

    if (allRequests.length === 0) {
        container.innerHTML = '<p>No open requests right now. 🎉</p>';
        renderPagination('requestsPagination', 0, REQUESTS_PAGE_SIZE, 1, 'renderRequestsPage');
        return;
    }

    const startIdx = (page - 1) * REQUESTS_PAGE_SIZE;
    const pageItems = allRequests.slice(startIdx, startIdx + REQUESTS_PAGE_SIZE);

    container.innerHTML = pageItems.map(r => {
        const isOwner = currentUser && r.requester_id === currentUser.user_id;
        return `
            <div class="item-box">
                <h4>${r.blood_group_needed} needed
                    <span class="tag ${r.urgency_level}">${r.urgency_level}</span>
                </h4>
                ${r.image ? `<img src="${r.image}" style="max-width:200px; border-radius:8px; margin:8px 0;">` : ''}
                <p><b>Patient:</b> ${r.patient_name || 'N/A'}</p>
                <p><b>Location:</b> ${r.hospital_location}</p>
                <p><b>Units needed:</b> ${r.units_needed}</p>
                <p><b>Posted by:</b> ${r.requester_name} (${r.requester_phone || 'no phone'})</p>
                ${isOwner
                    ? `<div class="post-actions">
                         <button class="btn-edit" onclick="editRequest(${r.request_id})"><i class="fas fa-pen"></i> Edit</button>
                         <button class="btn-delete" onclick="deleteRequest(${r.request_id})"><i class="fas fa-trash"></i> Delete</button>
                       </div>`
                    : `<button onclick="respondToRequest(${r.request_id})">I Can Donate</button>`
                }
            </div>
        `;
    }).join('');

    renderPagination('requestsPagination', allRequests.length, REQUESTS_PAGE_SIZE, page, 'renderRequestsPage');
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

// ===== Edit an existing request =====
function editRequest(request_id) {
    const r = allRequests.find(req => req.request_id === request_id);
    if (!r) return;

    document.getElementById('editingRequestId').value = r.request_id;
    document.getElementById('blood_group_needed').value = r.blood_group_needed;
    document.getElementById('patient_name').value = r.patient_name || '';
    document.getElementById('hospital_location').value = r.hospital_location;
    document.getElementById('units_needed').value = r.units_needed;
    document.getElementById('urgency_level').value = r.urgency_level;

    document.getElementById('postSectionTitle').innerText = 'Edit Blood Request';
    document.getElementById('requestSubmitBtn').innerText = 'Save Changes';

    // switch tabs to the post section
    ['requestsSection','postSection','searchSection','donorSection'].forEach(s => {
        document.getElementById(s).style.display = (s === 'postSection') ? 'block' : 'none';
    });
    document.querySelectorAll('.tabs a').forEach(a => a.classList.remove('active'));
    document.querySelectorAll('.tabs a')[1].classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function exitEditMode() {
    document.getElementById('editingRequestId').value = '';
    document.getElementById('postSectionTitle').innerText = 'Post a Blood Request';
    document.getElementById('requestSubmitBtn').innerText = 'Post Request';
}

// ===== Delete a request =====
async function deleteRequest(request_id) {
    if (!confirm('Are you sure you want to delete this request? This cannot be undone.')) return;
    try {
        await apiCall(`/blood/requests/${request_id}`, 'DELETE');
        loadRequests();
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

// Post a new blood request OR save edits to an existing one
document.getElementById('requestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const image = await fileToBase64(document.getElementById('requestImage'));
        const editingId = document.getElementById('editingRequestId').value;

        const body = {
            blood_group_needed: document.getElementById('blood_group_needed').value,
            patient_name: document.getElementById('patient_name').value,
            hospital_location: document.getElementById('hospital_location').value,
            units_needed: document.getElementById('units_needed').value,
            urgency_level: document.getElementById('urgency_level').value,
            image: image
        };

        if (editingId) {
            await apiCall(`/blood/requests/${editingId}`, 'PUT', body);
            showMessage('postMsg', 'Request updated successfully!', 'success');
        } else {
            await apiCall('/blood/requests', 'POST', body);
            showMessage('postMsg', 'Request posted successfully!', 'success');
        }

        document.getElementById('requestForm').reset();
        document.getElementById('requestImagePreview').style.display = 'none';
        exitEditMode();
        loadRequests();
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
// If we arrived here via a "?edit=<id>" link (e.g. from the home feed / latest activity),
// automatically open that request in edit mode once the list has loaded.
loadRequests().then(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit');
    if (editId) {
        editRequest(parseInt(editId));
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});
