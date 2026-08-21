requireAdminLogin();

// ===== TAB SWITCHING =====
function switchTab(tab) {
    ['users', 'blood', 'items'].forEach(t => {
        document.getElementById(`panel-${t}`).style.display = (t === tab) ? 'block' : 'none';
        document.getElementById(`tabBtn-${t}`).classList.toggle('active', t === tab);
    });
    if (tab === 'users') loadUsers();
    if (tab === 'blood') loadBloodRequests();
    if (tab === 'items') loadItems();
}

// ===== STATS =====
async function loadStats() {
    try {
        const stats = await adminApiCall('/admin/stats', 'GET');
        document.getElementById('statsGrid').innerHTML = `
            <div class="stat-card"><div class="num">${stats.total_users}</div><div class="label">Total Users</div></div>
            <div class="stat-card"><div class="num">${stats.blocked_users}</div><div class="label">Blocked Users</div></div>
            <div class="stat-card"><div class="num">${stats.total_blood}</div><div class="label">Blood Requests</div></div>
            <div class="stat-card"><div class="num">${stats.total_items}</div><div class="label">Lost & Found Posts</div></div>
            <div class="stat-card"><div class="num">${stats.total_comments}</div><div class="label">Comments</div></div>
        `;
    } catch (err) {
        document.getElementById('statsGrid').innerHTML = `<div class="stat-card">Error: ${err.message}</div>`;
    }
}

// ===== USERS TAB =====
async function loadUsers() {
    const panel = document.getElementById('panel-users');
    panel.innerHTML = '<div class="loading-text">Loading users...</div>';
    try {
        const users = await adminApiCall('/admin/users', 'GET');
        if (users.length === 0) {
            panel.innerHTML = '<p class="loading-text">No users found.</p>';
            return;
        }
        panel.innerHTML = `
            <table>
                <thead><tr><th>Name</th><th>Email</th><th>Blood Group</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                    ${users.map(u => `
                        <tr>
                            <td>${u.name}</td>
                            <td>${u.email}</td>
                            <td>${u.blood_group || '-'}</td>
                            <td><span class="badge ${u.is_active ? 'active' : 'blocked'}">${u.is_active ? 'Active' : 'Blocked'}</span></td>
                            <td>
                                ${u.is_active
                                    ? `<button class="small-btn btn-block" onclick="toggleBlock(${u.user_id}, false)"><i class="fas fa-ban"></i> Block</button>`
                                    : `<button class="small-btn btn-unblock" onclick="toggleBlock(${u.user_id}, true)"><i class="fas fa-check"></i> Unblock</button>`
                                }
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        panel.innerHTML = `<p class="loading-text">Error: ${err.message}</p>`;
    }
}

async function toggleBlock(userId, makeActive) {
    const action = makeActive ? 'unblock' : 'block';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
        await adminApiCall(`/admin/users/${userId}/block`, 'PUT', { is_active: makeActive });
        loadUsers();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ===== BLOOD REQUESTS TAB =====
async function loadBloodRequests() {
    const panel = document.getElementById('panel-blood');
    panel.innerHTML = '<div class="loading-text">Loading blood requests...</div>';
    try {
        const requests = await adminApiCall('/admin/blood', 'GET');
        if (requests.length === 0) {
            panel.innerHTML = '<p class="loading-text">No blood requests found.</p>';
            return;
        }
        panel.innerHTML = `
            <table>
                <thead><tr><th>Blood Group</th><th>Patient</th><th>Location</th><th>Urgency</th><th>Status</th><th>Posted By</th><th>Action</th></tr></thead>
                <tbody>
                    ${requests.map(r => `
                        <tr>
                            <td>${r.blood_group_needed}</td>
                            <td>${r.patient_name || '-'}</td>
                            <td>${r.hospital_location}</td>
                            <td>${r.urgency_level}</td>
                            <td>${r.status}</td>
                            <td>${r.requester_name}<br><span style="color:var(--muted); font-size:0.75rem;">${r.requester_email}</span></td>
                            <td><button class="small-btn btn-del" onclick="deleteBloodRequest(${r.request_id})"><i class="fas fa-trash"></i> Delete</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        panel.innerHTML = `<p class="loading-text">Error: ${err.message}</p>`;
    }
}

async function deleteBloodRequest(id) {
    if (!confirm('Delete this blood request permanently?')) return;
    try {
        await adminApiCall(`/admin/blood/${id}`, 'DELETE');
        loadBloodRequests();
        loadStats();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ===== LOST & FOUND TAB =====
async function loadItems() {
    const panel = document.getElementById('panel-items');
    panel.innerHTML = '<div class="loading-text">Loading items...</div>';
    try {
        const items = await adminApiCall('/admin/items', 'GET');
        if (items.length === 0) {
            panel.innerHTML = '<p class="loading-text">No items found.</p>';
            return;
        }
        panel.innerHTML = `
            <table>
                <thead><tr><th>Title</th><th>Type</th><th>Category</th><th>Location</th><th>Status</th><th>Posted By</th><th>Action</th></tr></thead>
                <tbody>
                    ${items.map(i => `
                        <tr>
                            <td>${i.title}</td>
                            <td>${i.item_type}</td>
                            <td>${i.category || '-'}</td>
                            <td>${i.location || '-'}</td>
                            <td>${i.status}</td>
                            <td>${i.posted_by_name}<br><span style="color:var(--muted); font-size:0.75rem;">${i.posted_by_email}</span></td>
                            <td><button class="small-btn btn-del" onclick="deleteItemAdmin(${i.item_id})"><i class="fas fa-trash"></i> Delete</button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        panel.innerHTML = `<p class="loading-text">Error: ${err.message}</p>`;
    }
}

async function deleteItemAdmin(id) {
    if (!confirm('Delete this post permanently?')) return;
    try {
        await adminApiCall(`/admin/items/${id}`, 'DELETE');
        loadItems();
        loadStats();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ===== INIT =====
loadStats();
loadUsers();
