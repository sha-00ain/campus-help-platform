requireLogin();
const currentUser = getUser();

// Switch between tabs/sections
function showSection(id) {
    ['browseSection','postSection','claimsSection'].forEach(s => {
        document.getElementById(s).style.display = (s === id) ? 'block' : 'none';
    });
    document.querySelectorAll('.tabs a').forEach(a => a.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    if (id === 'claimsSection') loadMyClaims();
}

// ===== Pagination state for the items list =====
const ITEMS_PAGE_SIZE = 10;
let allItems = [];
let currentItemsPage = 1;

// Load items (with optional filters)
async function loadItems() {
    try {
        const type = document.getElementById('filterType').value;
        const keyword = document.getElementById('filterKeyword').value;
        const query = new URLSearchParams();
        if (type) query.append('item_type', type);
        if (keyword) query.append('keyword', keyword);

        allItems = await apiCall('/items?' + query.toString(), 'GET');
        currentItemsPage = 1;
        renderItemsPage(1);
    } catch (err) {
        document.getElementById('itemsList').innerHTML = `<div class="msg error">${err.message}</div>`;
    }
}

function renderItemsPage(page) {
    currentItemsPage = page;
    const container = document.getElementById('itemsList');

    if (allItems.length === 0) {
        container.innerHTML = '<p>No items found.</p>';
        renderPagination('itemsPagination', 0, ITEMS_PAGE_SIZE, 1, 'renderItemsPage');
        return;
    }

    const startIdx = (page - 1) * ITEMS_PAGE_SIZE;
    const pageItems = allItems.slice(startIdx, startIdx + ITEMS_PAGE_SIZE);

    container.innerHTML = pageItems.map(i => {
        const isOwner = currentUser && i.posted_by === currentUser.user_id;
        return `
            <div class="item-box">
                <h4>${i.title}
                    <span class="tag ${i.item_type === 'found' ? 'found' : ''}">${i.item_type}</span>
                </h4>
                ${i.image ? `<img src="${i.image}" style="max-width:200px; border-radius:8px; margin:8px 0;">` : ''}
                <p>${i.description || ''}</p>
                <p><b>Category:</b> ${i.category || 'N/A'} | <b>Location:</b> ${i.location || 'N/A'}</p>
                <p><b>Posted by:</b> ${i.posted_by_name} (${i.posted_by_phone || 'no phone'})</p>
                ${isOwner
                    ? `<div class="post-actions">
                         <button class="btn-edit" onclick="editItem(${i.item_id})"><i class="fas fa-pen"></i> Edit</button>
                         <button class="btn-delete" onclick="deleteItem(${i.item_id})"><i class="fas fa-trash"></i> Delete</button>
                       </div>`
                    : `<button onclick="claimItem(${i.item_id})">This is Mine / Claim</button>`
                }
            </div>
        `;
    }).join('');

    renderPagination('itemsPagination', allItems.length, ITEMS_PAGE_SIZE, page, 'renderItemsPage');
}

// Claim an item
async function claimItem(item_id) {
    const proof = prompt('Please describe why this item belongs to you (proof):');
    if (proof === null) return;
    try {
        await apiCall('/items/claim', 'POST', { item_id, proof_description: proof });
        alert('Claim request submitted! The poster will review it.');
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// ===== Edit an existing item (opens in a modal dialog, in place) =====
function editItem(item_id) {
    const i = allItems.find(it => it.item_id === item_id);
    if (!i) return;

    document.getElementById('editItemId').value = i.item_id;
    document.getElementById('editItemType').value = i.item_type;
    document.getElementById('editItemCategory').value = i.category || '';
    document.getElementById('editItemTitle').value = i.title;
    document.getElementById('editItemDescription').value = i.description || '';
    document.getElementById('editItemLocation').value = i.location || '';
    document.getElementById('editItemDate').value = i.date_occurred ? i.date_occurred.split('T')[0] : '';
    document.getElementById('editItemImage').value = '';
    document.getElementById('editItemImagePreview').style.display = 'none';
    document.getElementById('editItemMsg').innerHTML = '';

    document.getElementById('editItemModal').classList.add('active');
}

function closeEditItemModal() {
    document.getElementById('editItemModal').classList.remove('active');
}

function closeEditItemModalOnOverlay(event) {
    if (event.target.id === 'editItemModal') closeEditItemModal();
}

// Preview a newly-picked image inside the edit modal
document.getElementById('editItemImage').addEventListener('change', () => {
    const file = document.getElementById('editItemImage').files[0];
    const preview = document.getElementById('editItemImagePreview');
    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
});

// Save edits made in the modal
document.getElementById('editItemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const image = await fileToBase64(document.getElementById('editItemImage'));
        const editingId = document.getElementById('editItemId').value;

        const body = {
            item_type: document.getElementById('editItemType').value,
            category: document.getElementById('editItemCategory').value,
            title: document.getElementById('editItemTitle').value,
            description: document.getElementById('editItemDescription').value,
            location: document.getElementById('editItemLocation').value,
            date_occurred: document.getElementById('editItemDate').value || null
        };
        if (image) body.image = image;

        await apiCall(`/items/${editingId}`, 'PUT', body);
        closeEditItemModal();
        loadItems();
    } catch (err) {
        showMessage('editItemMsg', err.message, 'error');
    }
});

// Close the edit modal with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeEditItemModal();
});

// ===== Delete an item =====
async function deleteItem(item_id) {
    if (!confirm('Are you sure you want to delete this post? This cannot be undone.')) return;
    try {
        await apiCall(`/items/${item_id}`, 'DELETE');
        loadItems();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Show a small preview when user picks an image
document.getElementById('itemImage').addEventListener('change', () => {
    const file = document.getElementById('itemImage').files[0];
    const preview = document.getElementById('itemImagePreview');
    if (file) {
        preview.src = URL.createObjectURL(file);
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }
});

// Post a new item
document.getElementById('itemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const image = await fileToBase64(document.getElementById('itemImage'));

        const body = {
            item_type: document.getElementById('item_type').value,
            category: document.getElementById('category').value,
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            location: document.getElementById('location').value,
            date_occurred: document.getElementById('date_occurred').value || null,
            image: image
        };

        await apiCall('/items', 'POST', body);
        showMessage('postMsg', 'Item posted successfully!', 'success');

        document.getElementById('itemForm').reset();
        document.getElementById('itemImagePreview').style.display = 'none';
        loadItems();
    } catch (err) {
        showMessage('postMsg', err.message, 'error');
    }
});

// Load claim requests on items I posted
async function loadMyClaims() {
    try {
        const claims = await apiCall('/items/my-claims', 'GET');
        const container = document.getElementById('claimsList');

        if (claims.length === 0) {
            container.innerHTML = '<p>No claim requests yet.</p>';
            return;
        }

        container.innerHTML = claims.map(c => `
            <div class="item-box">
                <h4>${c.item_title} <span class="tag">${c.status}</span></h4>
                <p><b>Claimed by:</b> ${c.claimant_name} (${c.claimant_phone || 'no phone'})</p>
                <p><b>Proof:</b> ${c.proof_description || 'N/A'}</p>
                ${c.status === 'pending' ? `
                    <button onclick="updateClaim(${c.claim_id}, 'approved')">Approve</button>
                    <button class="secondary" onclick="updateClaim(${c.claim_id}, 'rejected')">Reject</button>
                ` : ''}
            </div>
        `).join('');
    } catch (err) {
        document.getElementById('claimsList').innerHTML = `<div class="msg error">${err.message}</div>`;
    }
}

// Approve/reject a claim
async function updateClaim(claim_id, status) {
    try {
        await apiCall('/items/claim-status', 'PUT', { claim_id, status });
        loadMyClaims();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Load items on page load
loadItems();
