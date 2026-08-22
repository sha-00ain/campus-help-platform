requireLogin();
const currentUser = getUser();

// Switch between tabs/sections
function showSection(id) {
    ['requestsSection','postSection','searchSection','donorSection'].forEach(s => {
        document.getElementById(s).style.display = (s === id) ? 'block' : 'none';
    });
    document.querySelectorAll('.tabs a').forEach(a => a.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
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
            <div class="item-box clickable-post" onclick="openPostDetail(${r.request_id})">
                <h4>${r.blood_group_needed} needed
                    <span class="tag ${r.urgency_level}">${r.urgency_level}</span>
                </h4>
                ${r.image ? `<img src="${r.image}" class="post-thumb-img">` : ''}
                <p><b>Patient:</b> ${r.patient_name || 'N/A'}</p>
                <p><b>Location:</b> ${r.hospital_location}</p>
                <p><b>Units needed:</b> ${r.units_needed}</p>
                <p><b>Posted by:</b> ${r.requester_name} (${r.requester_phone || 'no phone'})</p>
                ${isOwner
                    ? `<div class="post-actions">
                         <button class="btn-edit" onclick="event.stopPropagation(); editRequest(${r.request_id})"><i class="fas fa-pen"></i> Edit</button>
                         <button class="btn-delete" onclick="event.stopPropagation(); deleteRequest(${r.request_id})"><i class="fas fa-trash"></i> Delete</button>
                       </div>`
                    : `<button onclick="event.stopPropagation(); respondToRequest(${r.request_id})">I Can Donate</button>`
                }
            </div>
        `;
    }).join('');

    renderPagination('requestsPagination', allRequests.length, REQUESTS_PAGE_SIZE, page, 'renderRequestsPage');
}

// ===== Post Detail Modal (view full details + comments) =====
let currentDetailRequest = null;

function openPostDetail(request_id) {
    const r = allRequests.find(req => req.request_id === request_id);
    if (!r) return;
    currentDetailRequest = r;
    cancelReply();

    const isOwner = currentUser && r.requester_id === currentUser.user_id;
    document.getElementById('detailTitle').innerText = `🩸 ${r.blood_group_needed} needed`;
    document.getElementById('detailContent').innerHTML = `
        <span class="tag ${r.urgency_level}">${r.urgency_level}</span>
        ${r.image ? `<img src="${r.image}" class="post-detail-img">` : ''}
        <p><b>Patient:</b> ${r.patient_name || 'N/A'}</p>
        <p><b>Location:</b> ${r.hospital_location}</p>
        <p><b>Units needed:</b> ${r.units_needed}</p>
        <p style="color:var(--text-muted); font-size:0.85rem;">Posted by ${r.requester_name} (${r.requester_phone || 'no phone'})</p>
        <div style="display:flex; gap:0.6rem; margin-top:1rem; flex-wrap:wrap;">
            ${!isOwner ? `<button onclick="respondToRequest(${r.request_id}); closePostDetailModal();">I Can Donate</button>` : ''}
            ${isOwner ? `<button class="btn-edit" onclick="closePostDetailModal(); editRequest(${r.request_id});"><i class="fas fa-pen"></i> Edit</button>
                         <button class="btn-delete" onclick="closePostDetailModal(); deleteRequest(${r.request_id});"><i class="fas fa-trash"></i> Delete</button>` : ''}
        </div>
    `;

    document.getElementById('postDetailModal').classList.add('active');
    loadDetailComments();
}

function closePostDetailModal() {
    document.getElementById('postDetailModal').classList.remove('active');
    currentDetailRequest = null;
    cancelReply();
}

function closePostDetailModalOnOverlay(event) {
    if (event.target.id === 'postDetailModal') closePostDetailModal();
}

// ===== Comments =====
let replyingTo = null; // { comment_id, name } or null

async function loadDetailComments() {
    if (!currentDetailRequest) return;
    const postId = currentDetailRequest.request_id;
    const container = document.getElementById('detailComments');
    container.innerHTML = '<p class="no-comments">Loading comments...</p>';

    try {
        const comments = await apiCall(`/comments/blood/${postId}`, 'GET');
        if (comments.length === 0) {
            container.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
            return;
        }
        container.innerHTML = comments.map(c => {
            const isMine = currentUser && c.user_id === currentUser.user_id;
            const isReply = !!c.parent_comment_id;
            const avatar = c.profile_picture
                ? `<img src="${c.profile_picture}" alt="${c.name}">`
                : c.name.charAt(0).toUpperCase();

            let replyLine = '';
            if (isReply) {
                const replyAuthorIsMe = currentUser && c.user_id === currentUser.user_id;
                const parentIsMe = currentUser && c.reply_to_user_id === currentUser.user_id;
                const replyAuthorName = replyAuthorIsMe ? 'You' : c.name;
                const parentName = parentIsMe ? 'you' : (c.reply_to_name || 'a comment');
                replyLine = `${replyAuthorName} replied to ${parentName}`;
            }

            return `
            <div class="comment-item${isReply ? ' is-reply' : ''}">
                <div class="comment-avatar">${avatar}</div>
                <div class="comment-body">
                    ${isReply
                        ? `<div class="reply-to-tag"><i class="fas fa-reply"></i> ${replyLine}</div>`
                        : `<span class="comment-author">${c.name}</span>`}
                    <span class="comment-time">${timeAgo(c.created_at)}</span>
                    <div class="comment-text">${c.comment_text}</div>
                    <div class="comment-actions-row">
                        ${!isReply ? `<button class="comment-reply-btn" onclick="startReply(${c.comment_id}, '${c.name.replace(/'/g, "\\'")}')"><i class="fas fa-reply"></i> Reply</button>` : ''}
                    </div>
                </div>
                ${isMine ? `<button class="comment-delete-btn" onclick="deleteComment(${c.comment_id})" title="Delete comment"><i class="fas fa-trash"></i></button>` : ''}
            </div>
            `;
        }).join('');
    } catch (err) {
        container.innerHTML = `<p class="no-comments">Could not load comments.</p>`;
    }
}

function startReply(comment_id, name) {
    replyingTo = { comment_id, name };
    const banner = document.getElementById('replyingBanner');
    document.getElementById('replyingBannerText').innerText = `Replying to ${name}`;
    banner.classList.add('active');
    document.getElementById('newCommentText').focus();
}

function cancelReply() {
    replyingTo = null;
    const banner = document.getElementById('replyingBanner');
    if (banner) banner.classList.remove('active');
}

async function submitComment() {
    if (!currentDetailRequest) return;
    const textEl = document.getElementById('newCommentText');
    const text = textEl.value.trim();
    if (!text) return;

    try {
        const body = { post_type: 'blood', post_id: currentDetailRequest.request_id, comment_text: text };
        if (replyingTo) body.parent_comment_id = replyingTo.comment_id;

        await apiCall('/comments', 'POST', body);
        textEl.value = '';
        cancelReply();
        loadDetailComments();
    } catch (err) {
        alert('Error posting comment: ' + err.message);
    }
}

async function deleteComment(comment_id) {
    if (!confirm('Delete this comment?')) return;
    try {
        await apiCall(`/comments/${comment_id}`, 'DELETE');
        loadDetailComments();
    } catch (err) {
        alert('Error deleting comment: ' + err.message);
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

// ===== Edit an existing request (opens in a modal dialog, in place) =====
function editRequest(request_id) {
    const r = allRequests.find(req => req.request_id === request_id);
    if (!r) return;

    document.getElementById('editReqId').value = r.request_id;
    document.getElementById('editReqBloodGroup').value = r.blood_group_needed;
    document.getElementById('editReqPatientName').value = r.patient_name || '';
    document.getElementById('editReqLocation').value = r.hospital_location;
    document.getElementById('editReqUnits').value = r.units_needed;
    document.getElementById('editReqUrgency').value = r.urgency_level;
    document.getElementById('editReqImage').value = '';
    document.getElementById('editReqImagePreview').style.display = 'none';
    document.getElementById('editRequestMsg').innerHTML = '';

    document.getElementById('editRequestModal').classList.add('active');
}

function closeEditRequestModal() {
    document.getElementById('editRequestModal').classList.remove('active');
}

function closeEditRequestModalOnOverlay(event) {
    if (event.target.id === 'editRequestModal') closeEditRequestModal();
}

// Preview a newly-picked image inside the edit modal
document.getElementById('editReqImage').addEventListener('change', () => {
    const file = document.getElementById('editReqImage').files[0];
    const preview = document.getElementById('editReqImagePreview');
    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
});

// Save edits made in the modal
document.getElementById('editRequestForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const image = await fileToBase64(document.getElementById('editReqImage'));
        const editingId = document.getElementById('editReqId').value;

        const body = {
            blood_group_needed: document.getElementById('editReqBloodGroup').value,
            patient_name: document.getElementById('editReqPatientName').value,
            hospital_location: document.getElementById('editReqLocation').value,
            units_needed: document.getElementById('editReqUnits').value,
            urgency_level: document.getElementById('editReqUrgency').value
        };
        if (image) body.image = image;

        await apiCall(`/blood/requests/${editingId}`, 'PUT', body);
        closeEditRequestModal();
        loadRequests();
    } catch (err) {
        showMessage('editRequestMsg', err.message, 'error');
    }
});

// Close modals with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeEditRequestModal();
        closePostDetailModal();
    }
});

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
loadRequests();
