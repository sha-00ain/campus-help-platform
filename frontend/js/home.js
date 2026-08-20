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
        const allPosts = [...bloodPosts, ...itemPosts].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        if (allPosts.length === 0) {
            container.innerHTML = '<p>No posts yet. Be the first to post something!</p>';
            return;
        }

        container.innerHTML = allPosts.map(post => {
            if (post.feed_type === 'blood') {
                return `
                    <div class="feed-post">
                        <div class="feed-post-header">
                            <span class="post-type-tag">🩸 BLOOD REQUEST</span>
                            <span class="feed-post-time">${timeAgo(post.created_at)}</span>
                        </div>
                        <h4>${post.blood_group_needed} needed
                            <span class="tag ${post.urgency_level}">${post.urgency_level}</span>
                        </h4>
                        ${post.image ? `<img src="${post.image}" style="max-width:250px; border-radius:8px; margin:8px 0;">` : ''}
                        <p><b>Patient:</b> ${post.patient_name || 'N/A'}</p>
                        <p><b>Location:</b> ${post.hospital_location}</p>
                        <div class="feed-meta">Posted by ${post.requester_name}</div>
                    </div>
                `;
            } else {
                return `
                    <div class="feed-post type-item">
                        <div class="feed-post-header">
                            <span class="post-type-tag">${post.item_type === 'found' ? '✅ FOUND' : '🎒 LOST'} ITEM</span>
                            <span class="feed-post-time">${timeAgo(post.created_at)}</span>
                        </div>
                        <h4>${post.title}</h4>
                        ${post.image ? `<img src="${post.image}" style="max-width:250px; border-radius:8px; margin:8px 0;">` : ''}
                        <p>${post.description || ''}</p>
                        <p><b>Location:</b> ${post.location || 'N/A'}</p>
                        <div class="feed-meta">Posted by ${post.posted_by_name}</div>
                    </div>
                `;
            }
        }).join('');
    } catch (err) {
        container.innerHTML = `<div class="msg error">${err.message}</div>`;
    }
}

loadFeed();
