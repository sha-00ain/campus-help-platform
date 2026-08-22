requireLogin();

const user = getUser();
document.getElementById('welcomeMsg').innerText = `Welcome, ${user.name}!`;

// Future Scope modal controls
function openFutureModal() {
    document.getElementById('futureModalOverlay').classList.add('active');
}
function closeFutureModal() {
    document.getElementById('futureModalOverlay').classList.remove('active');
}
function closeFutureModalOnOverlay(event) {
    // only close if the click was on the dark overlay itself, not inside the box
    if (event.target.id === 'futureModalOverlay') {
        closeFutureModal();
    }
}

// Turn a MySQL datetime into a friendly "time ago" string
function timeAgo(dateStr) {
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

// Load both blood requests and lost&found items, merge, sort newest first
const FEED_PAGE_SIZE = 10;
let allFeedPosts = [];
let currentFeedPage = 1;

async function loadFeed() {
    const container = document.getElementById('feedList');
    try {
        const [bloodRequests, items] = await Promise.all([
            apiCall('/blood/requests', 'GET'),
            apiCall('/items', 'GET')
        ]);

        // Tag each post with its type so we can render them differently
        const bloodPosts = bloodRequests.map(r => ({ ...r, feed_type: 'blood', created_at: r.created_at }));
        const itemPosts = items.map(i => ({ ...i, feed_type: 'item', created_at: i.created_at }));

        // Merge and sort newest first
        allFeedPosts = [...bloodPosts, ...itemPosts].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        currentFeedPage = 1;
        renderFeedPage(1);
    } catch (err) {
        container.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
}

function renderFeedPage(page) {
    currentFeedPage = page;
    const container = document.getElementById('feedList');

    if (allFeedPosts.length === 0) {
        container.innerHTML = `
            <div class="empty-feed">
                <i class="fas fa-inbox"></i>
                <h3>No posts yet</h3>
                <p>Be the first to share something with the campus community!</p>
            </div>`;
        renderPagination('feedPagination', 0, FEED_PAGE_SIZE, 1, 'renderFeedPage');
        return;
    }

    const startIdx = (page - 1) * FEED_PAGE_SIZE;
    const pagePosts = allFeedPosts.slice(startIdx, startIdx + FEED_PAGE_SIZE);

    container.innerHTML = pagePosts.map((post, idx) => {
        const globalIdx = startIdx + idx;
        if (post.feed_type === 'blood') {
            return `
                <div class="feed-post" onclick="openPostDetail(${globalIdx})">
                    <div class="feed-post-header">
                        <span class="post-type-tag">🩸 BLOOD REQUEST</span>
                        <span class="feed-post-time">${timeAgo(post.created_at)}</span>
                    </div>
                    <h4>${post.blood_group_needed} needed
                        <span class="urgency-tag ${post.urgency_level}">${post.urgency_level}</span>
                    </h4>
                    ${post.image ? `<img src="${post.image}" class="feed-post-img">` : ''}
                    <p><b>Patient:</b> ${post.patient_name || 'N/A'}</p>
                    <p><b>Location:</b> ${post.hospital_location}</p>
                    <div class="feed-meta">Posted by ${post.requester_name} · <i class="fas fa-comment"></i> Tap to view & comment</div>
                </div>
            `;
        } else {
            return `
                <div class="feed-post type-item" onclick="openPostDetail(${globalIdx})">
                    <div class="feed-post-header">
                        <span class="post-type-tag">${post.item_type === 'found' ? '✅ FOUND' : '🎒 LOST'} ITEM</span>
                        <span class="feed-post-time">${timeAgo(post.created_at)}</span>
                    </div>
                    <h4>${post.title}</h4>
                    ${post.image ? `<img src="${post.image}" class="feed-post-img">` : ''}
                    <p>${post.description || ''}</p>
                    <p><b>Location:</b> ${post.location || 'N/A'}</p>
                    <div class="feed-meta">Posted by ${post.posted_by_name} · <i class="fas fa-comment"></i> Tap to view & comment</div>
                </div>
            `;
        }
    }).join('');

    renderPagination('feedPagination', allFeedPosts.length, FEED_PAGE_SIZE, page, 'renderFeedPage');
    document.getElementById('feedList').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ===== Post Detail Modal (view details + comments + interact) =====
let currentDetailPost = null;
let currentDetailIdx = null;

function openPostDetail(globalIdx) {
    const post = allFeedPosts[globalIdx];
    if (!post) return;
    currentDetailPost = post;
    currentDetailIdx = globalIdx;
    cancelReply();
    renderPostDetailView();
    document.getElementById('postDetailModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    loadDetailComments();
}

function renderPostDetailView() {
    const post = currentDetailPost;
    const contentEl = document.getElementById('detailContent');
    const titleEl = document.getElementById('detailTitle');

    if (post.feed_type === 'blood') {
        titleEl.innerText = `🩸 ${post.blood_group_needed} needed`;
        const isOwner = getUser() && post.requester_id === getUser().user_id;
        contentEl.innerHTML = `
            <span class="urgency-tag ${post.urgency_level}">${post.urgency_level}</span>
            ${post.image ? `<img src="${post.image}" style="max-width:100%; border-radius:12px; margin:10px 0;">` : ''}
            <p style="margin:4px 0;"><b>Patient:</b> ${post.patient_name || 'N/A'}</p>
            <p style="margin:4px 0;"><b>Location:</b> ${post.hospital_location}</p>
            <p style="margin:4px 0;"><b>Units needed:</b> ${post.units_needed}</p>
            <p style="margin:4px 0; color:var(--text-muted); font-size:0.85rem;">Posted by ${post.requester_name}</p>
            <div class="post-detail-actions">
                ${!isOwner ? `<button class="btn-primary-action" onclick="respondFromModal(${post.request_id})"><i class="fas fa-hand-holding-heart"></i> I Can Donate</button>` : ''}
                ${isOwner ? `<button class="btn-save" onclick="enterFeedEditMode()"><i class="fas fa-pen"></i> Edit</button>
                             <button class="btn-danger" onclick="deleteFeedPost()"><i class="fas fa-trash"></i> Delete</button>` : ''}
            </div>
        `;
    } else {
        titleEl.innerText = `${post.item_type === 'found' ? '✅ Found' : '🎒 Lost'}: ${post.title}`;
        const isOwner = getUser() && post.posted_by === getUser().user_id;
        contentEl.innerHTML = `
            <span class="tag ${post.item_type === 'found' ? 'found' : ''}">${post.item_type}</span>
            ${post.image ? `<img src="${post.image}" style="max-width:100%; border-radius:12px; margin:10px 0;">` : ''}
            <p style="margin:4px 0;">${post.description || ''}</p>
            <p style="margin:4px 0;"><b>Category:</b> ${post.category || 'N/A'} | <b>Location:</b> ${post.location || 'N/A'}</p>
            <p style="margin:4px 0; color:var(--text-muted); font-size:0.85rem;">Posted by ${post.posted_by_name}</p>
            <div class="post-detail-actions">
                ${!isOwner ? `<button class="btn-primary-action" onclick="claimFromModal(${post.item_id})"><i class="fas fa-hand-paper"></i> This is Mine / Claim</button>` : ''}
                ${isOwner ? `<button class="btn-save" onclick="enterFeedEditMode()"><i class="fas fa-pen"></i> Edit</button>
                             <button class="btn-danger" onclick="deleteFeedPost()"><i class="fas fa-trash"></i> Delete</button>` : ''}
            </div>
        `;
    }
}

function enterFeedEditMode() {
    const post = currentDetailPost;
    const contentEl = document.getElementById('detailContent');

    if (post.feed_type === 'blood') {
        contentEl.innerHTML = `
            <div class="form-group">
                <label>Blood Group Needed</label>
                <select id="feedEditBloodGroup">
                    ${['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(bg =>
                        `<option value="${bg}" ${post.blood_group_needed === bg ? 'selected' : ''}>${bg}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Patient Name</label>
                <input type="text" id="feedEditPatientName" value="${post.patient_name || ''}">
            </div>
            <div class="form-group">
                <label>Hospital / Location</label>
                <input type="text" id="feedEditLocation" value="${post.hospital_location || ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Units Needed</label>
                    <input type="number" id="feedEditUnits" min="1" value="${post.units_needed || 1}">
                </div>
                <div class="form-group">
                    <label>Urgency</label>
                    <select id="feedEditUrgency">
                        ${['normal','urgent','critical'].map(u =>
                            `<option value="${u}" ${post.urgency_level === u ? 'selected' : ''}>${u}</option>`
                        ).join('')}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Image (optional, leave blank to keep current)</label>
                <input type="file" id="feedEditImage" accept="image/*">
            </div>
            <div class="post-detail-actions">
                <button class="btn-save" onclick="saveFeedEdit()"><i class="fas fa-check"></i> Save Changes</button>
                <button class="btn-cancel" onclick="renderPostDetailView()"><i class="fas fa-times"></i> Cancel</button>
            </div>
        `;
    } else {
        contentEl.innerHTML = `
            <div class="form-group">
                <label>Type</label>
                <select id="feedEditItemType">
                    <option value="lost" ${post.item_type === 'lost' ? 'selected' : ''}>Lost</option>
                    <option value="found" ${post.item_type === 'found' ? 'selected' : ''}>Found</option>
                </select>
            </div>
            <div class="form-group">
                <label>Title</label>
                <input type="text" id="feedEditTitle" value="${post.title || ''}">
            </div>
            <div class="form-group">
                <label>Category</label>
                <input type="text" id="feedEditCategory" value="${post.category || ''}">
            </div>
            <div class="form-group">
                <label>Description</label>
                <input type="text" id="feedEditDescription" value="${post.description || ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Location</label>
                    <input type="text" id="feedEditLocation" value="${post.location || ''}">
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <input type="date" id="feedEditDate" value="${post.date_occurred ? post.date_occurred.substring(0,10) : ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Image (optional, leave blank to keep current)</label>
                <input type="file" id="feedEditImage" accept="image/*">
            </div>
            <div class="post-detail-actions">
                <button class="btn-save" onclick="saveFeedEdit()"><i class="fas fa-check"></i> Save Changes</button>
                <button class="btn-cancel" onclick="renderPostDetailView()"><i class="fas fa-times"></i> Cancel</button>
            </div>
        `;
    }
}

async function saveFeedEdit() {
    const post = currentDetailPost;
    try {
        const newImage = await fileToBase64(document.getElementById('feedEditImage'));

        if (post.feed_type === 'blood') {
            const body = {
                blood_group_needed: document.getElementById('feedEditBloodGroup').value,
                patient_name: document.getElementById('feedEditPatientName').value.trim(),
                hospital_location: document.getElementById('feedEditLocation').value.trim(),
                units_needed: document.getElementById('feedEditUnits').value,
                urgency_level: document.getElementById('feedEditUrgency').value
            };
            if (newImage) body.image = newImage;

            if (!body.hospital_location) {
                alert('Hospital/location is required.');
                return;
            }

            await apiCall(`/blood/requests/${post.request_id}`, 'PUT', body);
        } else {
            const body = {
                item_type: document.getElementById('feedEditItemType').value,
                category: document.getElementById('feedEditCategory').value.trim(),
                title: document.getElementById('feedEditTitle').value.trim(),
                description: document.getElementById('feedEditDescription').value.trim(),
                location: document.getElementById('feedEditLocation').value.trim(),
                date_occurred: document.getElementById('feedEditDate').value || null
            };
            if (newImage) body.image = newImage;

            if (!body.title) {
                alert('Title is required.');
                return;
            }

            await apiCall(`/items/${post.item_id}`, 'PUT', body);
        }

        closeDetailModal();
        await loadFeed();
        alert('✅ Post updated successfully!');
    } catch (err) {
        alert('Error updating post: ' + err.message);
    }
}

async function deleteFeedPost() {
    const post = currentDetailPost;
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
    try {
        if (post.feed_type === 'blood') {
            await apiCall(`/blood/requests/${post.request_id}`, 'DELETE');
        } else {
            await apiCall(`/items/${post.item_id}`, 'DELETE');
        }
        closeDetailModal();
        await loadFeed();
    } catch (err) {
        alert('Error deleting post: ' + err.message);
    }
}

function closeDetailModal() {
    document.getElementById('postDetailModal').classList.remove('active');
    document.body.style.overflow = '';
    currentDetailPost = null;
    currentDetailIdx = null;
    cancelReply();
}

function closeDetailModalOnOverlay(event) {
    if (event.target.id === 'postDetailModal') closeDetailModal();
}

async function respondFromModal(request_id) {
    try {
        await apiCall('/blood/respond', 'POST', { request_id });
        alert('Thank you! Your response has been sent to the requester.');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function claimFromModal(item_id) {
    const proof = prompt('Please describe why this item belongs to you (proof):');
    if (proof === null) return;
    try {
        await apiCall('/items/claim', 'POST', { item_id, proof_description: proof });
        alert('Claim request submitted! The poster will review it.');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ===== Comments =====
let replyingTo = null; // { comment_id, name } or null

async function loadDetailComments() {
    if (!currentDetailPost) return;
    const postType = currentDetailPost.feed_type;
    const postId = postType === 'blood' ? currentDetailPost.request_id : currentDetailPost.item_id;
    const container = document.getElementById('detailComments');
    container.innerHTML = '<p class="no-comments">Loading comments...</p>';

    try {
        const comments = await apiCall(`/comments/${postType}/${postId}`, 'GET');
        if (comments.length === 0) {
            container.innerHTML = '<p class="no-comments">No comments yet. Be the first to comment!</p>';
            return;
        }
        const currentUser = getUser();
        container.innerHTML = comments.map(c => {
            const isMine = currentUser && c.user_id === currentUser.user_id;
            const isReply = !!c.parent_comment_id;
            const avatar = c.profile_picture
                ? `<img src="${c.profile_picture}" alt="${c.name}">`
                : c.name.charAt(0).toUpperCase();
            return `
            <div class="comment-item${isReply ? ' is-reply' : ''}">
                <div class="comment-avatar">${avatar}</div>
                <div class="comment-body">
                    ${isReply ? `<div class="reply-to-tag"><i class="fas fa-reply"></i> Replying to ${c.reply_to_name || 'comment'}</div>` : ''}
                    <span class="comment-author">${c.name}</span>
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
    document.getElementById('replyingBanner').classList.remove('active');
}

async function submitComment() {
    if (!currentDetailPost) return;
    const textEl = document.getElementById('newCommentText');
    const text = textEl.value.trim();
    if (!text) return;

    const postType = currentDetailPost.feed_type;
    const postId = postType === 'blood' ? currentDetailPost.request_id : currentDetailPost.item_id;

    try {
        const body = { post_type: postType, post_id: postId, comment_text: text };
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

// Close modals with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeDetailModal();
    }
});

loadFeed();
