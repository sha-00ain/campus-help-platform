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
                    ${post.image ? `<img src="${post.image}" style="max-width:250px; border-radius:12px; margin:8px 0;">` : ''}
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
                    ${post.image ? `<img src="${post.image}" style="max-width:250px; border-radius:12px; margin:8px 0;">` : ''}
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

function openPostDetail(globalIdx) {
    const post = allFeedPosts[globalIdx];
    if (!post) return;
    currentDetailPost = post;

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
            ${!isOwner
                ? `<button onclick="respondFromModal(${post.request_id})"><i class="fas fa-hand-holding-heart"></i> I Can Donate</button>`
                : `<div class="post-actions">
                     <button class="btn-edit" onclick="editPostFromFeed('blood', ${post.request_id})"><i class="fas fa-pen"></i> Edit</button>
                     <button class="btn-delete" onclick="deletePostFromFeed('blood', ${post.request_id})"><i class="fas fa-trash"></i> Delete</button>
                   </div>`
            }
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
            ${!isOwner
                ? `<button onclick="claimFromModal(${post.item_id})"><i class="fas fa-hand-paper"></i> This is Mine / Claim</button>`
                : `<div class="post-actions">
                     <button class="btn-edit" onclick="editPostFromFeed('item', ${post.item_id})"><i class="fas fa-pen"></i> Edit</button>
                     <button class="btn-delete" onclick="deletePostFromFeed('item', ${post.item_id})"><i class="fas fa-trash"></i> Delete</button>
                   </div>`
            }
        `;
    }

    document.getElementById('postDetailModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    loadDetailComments();
}

function closeDetailModal() {
    document.getElementById('postDetailModal').classList.remove('active');
    document.body.style.overflow = '';
    currentDetailPost = null;
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

// ===== Edit / Delete a post directly from the Latest Activity feed =====
// Editing reuses the full edit form already on blood.html / lostfound.html,
// so we just deep-link there with the post id and let that page open edit mode.
function editPostFromFeed(type, id) {
    if (type === 'blood') {
        window.location.href = `blood.html?edit=${id}`;
    } else {
        window.location.href = `lostfound.html?edit=${id}`;
    }
}

async function deletePostFromFeed(type, id) {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
    try {
        if (type === 'blood') {
            await apiCall(`/blood/requests/${id}`, 'DELETE');
        } else {
            await apiCall(`/items/${id}`, 'DELETE');
        }
        closeDetailModal();
        loadFeed();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ===== Comments =====
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
            const avatar = c.profile_picture
                ? `<img src="${c.profile_picture}" alt="${c.name}">`
                : c.name.charAt(0).toUpperCase();
            return `
            <div class="comment-item">
                <div class="comment-avatar">${avatar}</div>
                <div class="comment-body">
                    <span class="comment-author">${c.name}</span>
                    <span class="comment-time">${timeAgo(c.created_at)}</span>
                    <div class="comment-text">${c.comment_text}</div>
                </div>
                ${isMine ? `<button class="comment-delete-btn" onclick="deleteComment(${c.comment_id})" title="Delete comment"><i class="fas fa-trash"></i></button>` : ''}
            </div>
            `;
        }).join('');
    } catch (err) {
        container.innerHTML = `<p class="no-comments">Could not load comments.</p>`;
    }
}

async function submitComment() {
    if (!currentDetailPost) return;
    const textEl = document.getElementById('newCommentText');
    const text = textEl.value.trim();
    if (!text) return;

    const postType = currentDetailPost.feed_type;
    const postId = postType === 'blood' ? currentDetailPost.request_id : currentDetailPost.item_id;

    try {
        await apiCall('/comments', 'POST', { post_type: postType, post_id: postId, comment_text: text });
        textEl.value = '';
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
