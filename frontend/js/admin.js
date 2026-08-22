requireAdminLogin();

// ===== STATE =====
let allUsers = [];
let allBloodRequests = [];
let allItems = [];
let allComments = [];
let currentListView = null;   // which array the currently-rendered table maps to (for click index lookups)
let currentView = 'users';    // 'users' | 'blocked' | 'blood' | 'items' | 'comments'

// ===== STATS (clickable cards) =====
async function loadStats() {
    try {
        const stats = await adminApiCall('/admin/stats', 'GET');
        document.getElementById('statsGrid').innerHTML = `
            <button class="stat-card" id="statCard-users" onclick="showView('users')">
                <div class="num">${stats.total_users}</div>
                <div class="label"><i class="fas fa-users"></i> Total Users</div>
            </button>
            <button class="stat-card" id="statCard-blocked" onclick="showView('blocked')">
                <div class="num">${stats.blocked_users}</div>
                <div class="label"><i class="fas fa-user-slash"></i> Blocked Users</div>
            </button>
            <button class="stat-card" id="statCard-blood" onclick="showView('blood')">
                <div class="num">${stats.total_blood}</div>
                <div class="label"><i class="fas fa-tint"></i> Blood Requests</div>
            </button>
            <button class="stat-card" id="statCard-items" onclick="showView('items')">
                <div class="num">${stats.total_items}</div>
                <div class="label"><i class="fas fa-box-open"></i> Lost & Found Posts</div>
            </button>
            <button class="stat-card" id="statCard-comments" onclick="showView('comments')">
                <div class="num">${stats.total_comments}</div>
                <div class="label"><i class="fas fa-comment"></i> Comments</div>
            </button>
        `;
        highlightActiveCard();
    } catch (err) {
        document.getElementById('statsGrid').innerHTML = `<div class="stat-card">Error: ${err.message}</div>`;
    }
}

function highlightActiveCard() {
    ['users', 'blocked', 'blood', 'items', 'comments'].forEach(v => {
        const card = document.getElementById(`statCard-${v}`);
        if (card) card.classList.toggle('active', v === currentView);
    });
}

// ===== VIEW SWITCHING =====
function showView(view) {
    currentView = view;
    highlightActiveCard();

    if (view === 'users') loadUsersView();
    if (view === 'blocked') loadUsersView();
    if (view === 'blood') loadBloodView();
    if (view === 'items') loadItemsView();
    if (view === 'comments') loadCommentsView();
}

// ===== USERS / BLOCKED USERS =====
async function loadUsersView() {
    const isBlocked = currentView === 'blocked';
    document.getElementById('panelTitle').innerHTML = isBlocked
        ? '<i class="fas fa-user-slash"></i> Blocked Users'
        : '<i class="fas fa-users"></i> All Users';

    const panel = document.getElementById('panelContent');
    panel.innerHTML = '<div class="loading-text">Loading users...</div>';
    try {
        allUsers = await adminApiCall('/admin/users', 'GET');
        const list = isBlocked ? allUsers.filter(u => !u.is_active) : allUsers;
        currentListView = list;

        if (list.length === 0) {
            panel.innerHTML = `<p class="loading-text">${isBlocked ? 'No blocked users.' : 'No users found.'}</p>`;
            return;
        }

        panel.innerHTML = `
            <table>
                <thead><tr><th>Name</th><th>Email</th><th>Blood Group</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                    ${list.map((u, idx) => `
                        <tr>
                            <td><button class="user-name-link" onclick="openUserDetails(${idx})">${u.name}</button></td>
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
        loadStats();
        loadUsersView();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ===== USER DETAILS MODAL =====
function openUserDetails(idx) {
    const u = currentListView[idx];
    if (!u) return;
    const joined = u.created_at ? new Date(u.created_at.replace(' ', 'T')).toLocaleDateString() : '-';
    document.getElementById('userDetailsBody').innerHTML = `
        <div class="detail-row"><span>Name</span><span>${u.name}</span></div>
        <div class="detail-row"><span>Email</span><span>${u.email}</span></div>
        <div class="detail-row"><span>Student/Staff ID</span><span>${u.student_id || '-'}</span></div>
        <div class="detail-row"><span>Phone</span><span>${u.phone || '-'}</span></div>
        <div class="detail-row"><span>Blood Group</span><span>${u.blood_group || '-'}</span></div>
        <div class="detail-row"><span>Department</span><span>${u.department || '-'}</span></div>
        <div class="detail-row"><span>Role</span><span>${u.role}</span></div>
        <div class="detail-row"><span>Status</span><span><span class="badge ${u.is_active ? 'active' : 'blocked'}">${u.is_active ? 'Active' : 'Blocked'}</span></span></div>
        <div class="detail-row"><span>Joined</span><span>${joined}</span></div>
        <div class="modal-actions">
            ${u.is_active
                ? `<button class="btn-modal btn-block" onclick="toggleBlock(${u.user_id}, false); closeUserModal();"><i class="fas fa-ban"></i> Block</button>`
                : `<button class="btn-modal btn-unblock" onclick="toggleBlock(${u.user_id}, true); closeUserModal();"><i class="fas fa-check"></i> Unblock</button>`
            }
            <button class="btn-modal btn-del" onclick="deleteUserAccount(${u.user_id})"><i class="fas fa-trash"></i> Delete Account</button>
        </div>
    `;
    document.getElementById('userDetailsModal').classList.add('active');
}

function closeUserModal() {
    document.getElementById('userDetailsModal').classList.remove('active');
}

function closeUserModalOnOverlay(event) {
    if (event.target.id === 'userDetailsModal') closeUserModal();
}

async function deleteUserAccount(userId) {
    if (!confirm('Permanently delete this user account? This will remove all of their posts, comments, and donor info too. This cannot be undone.')) return;
    try {
        await adminApiCall(`/admin/users/${userId}`, 'DELETE');
        closeUserModal();
        loadStats();
        loadUsersView();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ===== BLOOD REQUESTS VIEW =====
async function loadBloodView() {
    document.getElementById('panelTitle').innerHTML = '<i class="fas fa-tint"></i> Blood Requests';
    const panel = document.getElementById('panelContent');
    panel.innerHTML = '<div class="loading-text">Loading blood requests...</div>';
    try {
        allBloodRequests = await adminApiCall('/admin/blood', 'GET');
        if (allBloodRequests.length === 0) {
            panel.innerHTML = '<p class="loading-text">No blood requests found.</p>';
            return;
        }
        panel.innerHTML = `
            <table>
                <thead><tr><th>Blood Group</th><th>Patient</th><th>Location</th><th>Urgency</th><th>Status</th><th>Posted By</th></tr></thead>
                <tbody>
                    ${allBloodRequests.map((r, idx) => `
                        <tr class="clickable-row" onclick="openBloodDetail(${idx})">
                            <td>${r.blood_group_needed}</td>
                            <td>${r.patient_name || '-'}</td>
                            <td>${r.hospital_location}</td>
                            <td>${r.urgency_level}</td>
                            <td>${r.status}</td>
                            <td>${r.requester_name}<br><span style="color:var(--muted); font-size:0.75rem;">${r.requester_email}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        panel.innerHTML = `<p class="loading-text">Error: ${err.message}</p>`;
    }
}

// ===== LOST & FOUND VIEW =====
async function loadItemsView() {
    document.getElementById('panelTitle').innerHTML = '<i class="fas fa-box-open"></i> Lost & Found Posts';
    const panel = document.getElementById('panelContent');
    panel.innerHTML = '<div class="loading-text">Loading items...</div>';
    try {
        allItems = await adminApiCall('/admin/items', 'GET');
        if (allItems.length === 0) {
            panel.innerHTML = '<p class="loading-text">No items found.</p>';
            return;
        }
        panel.innerHTML = `
            <table>
                <thead><tr><th>Title</th><th>Type</th><th>Category</th><th>Location</th><th>Status</th><th>Posted By</th></tr></thead>
                <tbody>
                    ${allItems.map((i, idx) => `
                        <tr class="clickable-row" onclick="openItemDetail(${idx})">
                            <td>${i.title}</td>
                            <td>${i.item_type}</td>
                            <td>${i.category || '-'}</td>
                            <td>${i.location || '-'}</td>
                            <td>${i.status}</td>
                            <td>${i.posted_by_name}<br><span style="color:var(--muted); font-size:0.75rem;">${i.posted_by_email}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        panel.innerHTML = `<p class="loading-text">Error: ${err.message}</p>`;
    }
}

// ===== COMMENTS VIEW (all comments across every post) =====
async function loadCommentsView() {
    document.getElementById('panelTitle').innerHTML = '<i class="fas fa-comment"></i> Comments';
    const panel = document.getElementById('panelContent');
    panel.innerHTML = '<div class="loading-text">Loading comments...</div>';
    try {
        allComments = await adminApiCall('/admin/comments', 'GET');
        if (allComments.length === 0) {
            panel.innerHTML = '<p class="loading-text">No comments found.</p>';
            return;
        }
        panel.innerHTML = `
            <table>
                <thead><tr><th>Commenter</th><th>Comment</th><th>On Post</th><th>Posted</th></tr></thead>
                <tbody>
                    ${allComments.map((c, idx) => `
                        <tr class="clickable-row comments-list-row" onclick="openCommentContext(${idx})">
                            <td>${c.commenter_name}</td>
                            <td>${c.comment_text.length > 60 ? c.comment_text.slice(0, 60) + '…' : c.comment_text}</td>
                            <td>${c.post_type === 'blood' ? '🩸 ' : '🎒 '}${c.post_title || '(deleted post)'}</td>
                            <td style="white-space:nowrap;">${timeAgoAdmin(c.created_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        panel.innerHTML = `<p class="loading-text">Error: ${err.message}</p>`;
    }
}

function openCommentContext(idx) {
    const c = allComments[idx];
    if (!c) return;
    if (c.post_type === 'blood') {
        openPostDetailByTypeAndId('blood', c.post_id);
    } else {
        openPostDetailByTypeAndId('item', c.post_id);
    }
}

function timeAgoAdmin(dateStr) {
    const then = new Date(dateStr.replace(' ', 'T'));
    const seconds = Math.floor((new Date() - then) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// ===== POST DETAILS MODAL (blood request or lost&found item) =====
let currentPostDetail = null; // { kind: 'blood'|'item', data: {...} }

function openBloodDetail(idx) {
    currentPostDetail = { kind: 'blood', data: allBloodRequests[idx] };
    renderPostDetailView();
    document.getElementById('postDetailsModal').classList.add('active');
    loadPostDetailComments();
}

function openItemDetail(idx) {
    currentPostDetail = { kind: 'item', data: allItems[idx] };
    renderPostDetailView();
    document.getElementById('postDetailsModal').classList.add('active');
    loadPostDetailComments();
}

// Used when clicking a comment in the Comments view - fetch the post fresh since
// it may not be in the currently-loaded blood/items list.
async function openPostDetailByTypeAndId(kind, postId) {
    try {
        if (kind === 'blood') {
            const requests = await adminApiCall('/admin/blood', 'GET');
            const post = requests.find(r => r.request_id === postId);
            if (!post) { alert('This blood request no longer exists.'); return; }
            currentPostDetail = { kind: 'blood', data: post };
        } else {
            const items = await adminApiCall('/admin/items', 'GET');
            const post = items.find(i => i.item_id === postId);
            if (!post) { alert('This item no longer exists.'); return; }
            currentPostDetail = { kind: 'item', data: post };
        }
        renderPostDetailView();
        document.getElementById('postDetailsModal').classList.add('active');
        loadPostDetailComments();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function closePostModal() {
    document.getElementById('postDetailsModal').classList.remove('active');
    currentPostDetail = null;
}

function closePostModalOnOverlay(event) {
    if (event.target.id === 'postDetailsModal') closePostModal();
}

function renderPostDetailView() {
    const { kind, data: p } = currentPostDetail;
    const titleEl = document.getElementById('postDetailsTitle');
    const bodyEl = document.getElementById('postDetailsBody');

    if (kind === 'blood') {
        titleEl.innerHTML = `<i class="fas fa-tint"></i> ${p.blood_group_needed} needed`;
        bodyEl.innerHTML = `
            <div class="post-detail-view">
                ${p.image ? `<img src="${p.image}">` : ''}
                <p><b>Patient:</b> ${p.patient_name || 'N/A'}</p>
                <p><b>Hospital/Location:</b> ${p.hospital_location}</p>
                <p><b>Units needed:</b> ${p.units_needed}</p>
                <p><b>Urgency:</b> ${p.urgency_level}</p>
                <p><b>Status:</b> ${p.status}</p>
                <p style="color:var(--muted); font-size:0.82rem;">Posted by ${p.requester_name} (${p.requester_email})</p>
            </div>
            <div class="modal-actions">
                <button class="btn-save" onclick="enterPostEditMode()"><i class="fas fa-pen"></i> Edit</button>
                <button class="btn-danger" onclick="deletePostFromAdminModal()"><i class="fas fa-trash"></i> Delete</button>
            </div>
            <div class="comments-section" id="commentsSection"></div>
        `;
    } else {
        titleEl.innerHTML = `<i class="fas fa-box-open"></i> ${p.title}`;
        bodyEl.innerHTML = `
            <div class="post-detail-view">
                ${p.image ? `<img src="${p.image}">` : ''}
                <p>${p.description || ''}</p>
                <p><b>Type:</b> ${p.item_type} | <b>Category:</b> ${p.category || 'N/A'}</p>
                <p><b>Location:</b> ${p.location || 'N/A'}</p>
                <p><b>Status:</b> ${p.status}</p>
                <p style="color:var(--muted); font-size:0.82rem;">Posted by ${p.posted_by_name} (${p.posted_by_email})</p>
            </div>
            <div class="modal-actions">
                <button class="btn-save" onclick="enterPostEditMode()"><i class="fas fa-pen"></i> Edit</button>
                <button class="btn-danger" onclick="deletePostFromAdminModal()"><i class="fas fa-trash"></i> Delete</button>
            </div>
            <div class="comments-section" id="commentsSection"></div>
        `;
    }
}

function enterPostEditMode() {
    const { kind, data: p } = currentPostDetail;
    const bodyEl = document.getElementById('postDetailsBody');

    if (kind === 'blood') {
        bodyEl.innerHTML = `
            <div class="form-group">
                <label>Blood Group Needed</label>
                <select id="editBloodGroup">
                    ${['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg =>
                        `<option value="${bg}" ${p.blood_group_needed === bg ? 'selected' : ''}>${bg}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Patient Name</label>
                <input type="text" id="editPatientName" value="${p.patient_name || ''}">
            </div>
            <div class="form-group">
                <label>Hospital / Location</label>
                <input type="text" id="editHospitalLocation" value="${p.hospital_location || ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Units Needed</label>
                    <input type="number" id="editUnits" min="1" value="${p.units_needed || 1}">
                </div>
                <div class="form-group">
                    <label>Urgency</label>
                    <select id="editUrgency">
                        ${['normal','urgent','critical'].map(u =>
                            `<option value="${u}" ${p.urgency_level === u ? 'selected' : ''}>${u}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="editStatus">
                    ${['open','fulfilled','closed'].map(s =>
                        `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="modal-actions">
                <button class="btn-save" onclick="savePostEdit()"><i class="fas fa-check"></i> Save Changes</button>
                <button class="btn-cancel" onclick="renderPostDetailView(); loadPostDetailComments();"><i class="fas fa-times"></i> Cancel</button>
            </div>
        `;
    } else {
        bodyEl.innerHTML = `
            <div class="form-group">
                <label>Type</label>
                <select id="editItemType">
                    <option value="lost" ${p.item_type === 'lost' ? 'selected' : ''}>Lost</option>
                    <option value="found" ${p.item_type === 'found' ? 'selected' : ''}>Found</option>
                </select>
            </div>
            <div class="form-group">
                <label>Title</label>
                <input type="text" id="editTitle" value="${p.title || ''}">
            </div>
            <div class="form-group">
                <label>Category</label>
                <input type="text" id="editCategory" value="${p.category || ''}">
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" id="editDescription" value="${p.description || ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" id="editLocation" value="${p.location || ''}">
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="editDate" value="${p.date_occurred ? p.date_occurred.substring(0,10) : ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="editStatus">
                    ${['pending','claimed','closed'].map(s =>
                        `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="modal-actions">
                <button class="btn-save" onclick="savePostEdit()"><i class="fas fa-check"></i> Save Changes</button>
                <button class="btn-cancel" onclick="renderPostDetailView(); loadPostDetailComments();"><i class="fas fa-times"></i> Cancel</button>
            </div>
        `;
    }
}

async function savePostEdit() {
    const { kind, data: p } = currentPostDetail;
    try {
        if (kind === 'blood') {
            const body = {
                blood_group_needed: document.getElementById('editBloodGroup').value,
                patient_name: document.getElementById('editPatientName').value.trim(),
                hospital_location: document.getElementById('editHospitalLocation').value.trim(),
                units_needed: document.getElementById('editUnits').value,
                urgency_level: document.getElementById('editUrgency').value,
                status: document.getElementById('editStatus').value
            };
            if (!body.hospital_location) { alert('Hospital/location is required.'); return; }
            await adminApiCall(`/admin/blood/${p.request_id}`, 'PUT', body);
        } else {
            const body = {
                item_type: document.getElementById('editItemType').value,
                category: document.getElementById('editCategory').value.trim(),
                title: document.getElementById('editTitle').value.trim(),
                description: document.getElementById('editDescription').value.trim(),
                location: document.getElementById('editLocation').value.trim(),
                date_occurred: document.getElementById('editDate').value || null,
                status: document.getElementById('editStatus').value
            };
            if (!body.title) { alert('Title is required.'); return; }
            await adminApiCall(`/admin/items/${p.item_id}`, 'PUT', body);
        }

        closePostModal();
        loadStats();
        if (kind === 'blood') loadBloodView(); else loadItemsView();
        alert('✅ Post updated by admin.');
    } catch (err) {
        alert('Error updating post: ' + err.message);
    }
}

async function deletePostFromAdminModal() {
    const { kind, data: p } = currentPostDetail;
    if (!confirm('Permanently delete this post? This cannot be undone.')) return;
    try {
        if (kind === 'blood') {
            await adminApiCall(`/admin/blood/${p.request_id}`, 'DELETE');
        } else {
            await adminApiCall(`/admin/items/${p.item_id}`, 'DELETE');
        }
        closePostModal();
        loadStats();
        if (kind === 'blood') loadBloodView(); else loadItemsView();
    } catch (err) {
        alert('Error deleting post: ' + err.message);
    }
}

// ===== COMMENTS WITHIN THE POST DETAIL MODAL =====
async function loadPostDetailComments() {
    if (!currentPostDetail) return;
    const { kind, data: p } = currentPostDetail;
    const postType = kind;
    const postId = kind === 'blood' ? p.request_id : p.item_id;
    const section = document.getElementById('commentsSection');
    if (!section) return;

    section.innerHTML = `
        <h3><i class="fas fa-comments"></i> Comments</h3>
        <div id="postCommentsList" class="no-comments">Loading comments...</div>
        <div class="admin-comment-box">
            <input type="text" id="adminCommentText" placeholder="Comment as Admin...">
            <button onclick="submitAdminComment()"><i class="fas fa-paper-plane"></i></button>
        </div>
    `;

    try {
        const comments = await adminApiCall(`/admin/comments/${postType}/${postId}`, 'GET');
        const listEl = document.getElementById('postCommentsList');
        if (!listEl) return;
        if (comments.length === 0) {
            listEl.className = 'no-comments';
            listEl.innerHTML = 'No comments yet.';
            return;
        }
        listEl.className = '';
        listEl.innerHTML = comments.map(c => {
            const isAdmin = c.name === 'Admin';
            const avatar = c.profile_picture
                ? `<img src="${c.profile_picture}" alt="${c.name}">`
                : c.name.charAt(0).toUpperCase();
            return `
                <div class="comment-item">
                    <div class="comment-avatar ${isAdmin ? 'admin-avatar' : ''}">${isAdmin ? '<i class="fas fa-user-shield"></i>' : avatar}</div>
                    <div class="comment-body">
                        <span class="comment-author ${isAdmin ? 'is-admin' : ''}">${c.name}</span>
                        <span class="comment-time">${timeAgoAdmin(c.created_at)}</span>
                        <div class="comment-text">${c.comment_text}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        const listEl = document.getElementById('postCommentsList');
        if (listEl) listEl.innerHTML = 'Could not load comments.';
    }
}

async function submitAdminComment() {
    if (!currentPostDetail) return;
    const textEl = document.getElementById('adminCommentText');
    const text = textEl.value.trim();
    if (!text) return;

    const { kind, data: p } = currentPostDetail;
    const postType = kind;
    const postId = kind === 'blood' ? p.request_id : p.item_id;

    try {
        await adminApiCall('/admin/comments', 'POST', { post_type: postType, post_id: postId, comment_text: text });
        textEl.value = '';
        loadPostDetailComments();
    } catch (err) {
        alert('Error posting comment: ' + err.message);
    }
}

// Close any open modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeUserModal();
        closePostModal();
    }
});

// ===== INIT =====
loadStats();
showView('users');
