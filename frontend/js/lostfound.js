requireLogin();

// Switch between tabs/sections
function showSection(id) {
    ['browseSection','postSection','claimsSection'].forEach(s => {
        document.getElementById(s).style.display = (s === id) ? 'block' : 'none';
    });
    document.querySelectorAll('.tabs a').forEach(a => a.classList.remove('active'));
    event.target.classList.add('active');
    if (id === 'claimsSection') loadMyClaims();
}

// Load items (with optional filters)
async function loadItems() {
    try {
        const type = document.getElementById('filterType').value;
        const keyword = document.getElementById('filterKeyword').value;
        const query = new URLSearchParams();
        if (type) query.append('item_type', type);
        if (keyword) query.append('keyword', keyword);

        const items = await apiCall('/items?' + query.toString(), 'GET');
        const container = document.getElementById('itemsList');

        if (items.length === 0) {
            container.innerHTML = '<p>No items found.</p>';
            return;
        }

        container.innerHTML = items.map(i => `
            <div class="item-box">
                <h4>${i.title}
                    <span class="tag ${i.item_type === 'found' ? 'found' : ''}">${i.item_type}</span>
                </h4>
                <p>${i.description || ''}</p>
                <p><b>Category:</b> ${i.category || 'N/A'} | <b>Location:</b> ${i.location || 'N/A'}</p>
                <p><b>Posted by:</b> ${i.posted_by_name} (${i.posted_by_phone || 'no phone'})</p>
                <button onclick="claimItem(${i.item_id})">This is Mine / Claim</button>
            </div>
        `).join('');
    } catch (err) {
        document.getElementById('itemsList').innerHTML = `<div class="msg error">${err.message}</div>`;
    }
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

// Post a new item
document.getElementById('itemForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        const body = {
            item_type: document.getElementById('item_type').value,
            category: document.getElementById('category').value,
            title: document.getElementById('title').value,
            description: document.getElementById('description').value,
            location: document.getElementById('location').value,
            date_occurred: document.getElementById('date_occurred').value || null
        };
        await apiCall('/items', 'POST', body);
        showMessage('postMsg', 'Item posted successfully!', 'success');
        document.getElementById('itemForm').reset();
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
