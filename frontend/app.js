// API Base URL
const API_URL = (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8000/api'
    : '/api';

// Authentication Logic
function isAuthenticated() { return localStorage.getItem('access_token') !== null; }
function isAdmin() { return localStorage.getItem('user_role') === 'admin'; }
function getToken() { return localStorage.getItem('access_token'); }
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_email');
    window.location.href = 'index.html';
}

// Update Navbar based on Auth state
document.addEventListener('DOMContentLoaded', async () => {
    const navLinks = document.getElementById('nav-links');
    if (navLinks && isAuthenticated()) {
        const isAdm = isAdmin();
        const email = localStorage.getItem('user_email');
        navLinks.innerHTML = `
            <span style="font-weight: 500;">Welcome, ${email.split('@')[0]}</span>
            <a href="${isAdm ? 'admin.html' : 'dashboard.html'}" class="btn btn-outline">My Ticket</a>
            <button onclick="logout()" class="btn btn-primary">Logout</button>
        `;
    }

    // Load cities into datalist for auto-complete
    const citiesList = document.getElementById('cities-list');
    if (citiesList) {
        try {
            const res = await fetch(`${API_URL}/buses/cities`);
            const cities = await res.json();
            cities.forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                citiesList.appendChild(option);
            });
        } catch (e) { console.error('Error loading cities', e); }
    }

    // Handle resumed bookings after login redirect
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('resumeBooking') === 'true' && isAuthenticated()) {
        const scheduleId = localStorage.getItem('pendingBooking_scheduleId');
        const seatsStr = localStorage.getItem('pendingBooking_seats');
        const date = localStorage.getItem('pendingBooking_date');
        
        if (scheduleId && seatsStr && date) {
            const selectedArray = JSON.parse(seatsStr);
            window.currentSearchDate = date;
            window[`selectedSeats_${scheduleId}`] = selectedArray;
            // Clear URL param without reloading
            window.history.replaceState({}, document.title, window.location.pathname);
            
            document.getElementById('modal-schedule-id').value = scheduleId;
            
            // Inject Dynamic Passenger Forms
            const dynamicContainer = document.getElementById('dynamic-passenger-forms');
            let formsHTML = '';
            if (dynamicContainer && selectedArray.length > 0) {
                selectedArray.forEach((seatNumber, index) => {
                    formsHTML += `
                        <div class="passenger-block" data-seat="${seatNumber}" style="margin-bottom: 1.5rem;">
                            <h3 style="margin-bottom: 0.5rem; color: var(--primary-color);">Passenger ${index + 1} (Seat ${seatNumber})</h3>
                            <div class="form-group">
                                <label>Full Name</label>
                                <input type="text" class="passenger-name" required>
                            </div>
                            <div class="form-group">
                                <label>Phone Number</label>
                                <input type="tel" class="passenger-phone" required>
                            </div>
                            <div class="form-group">
                                <label>Address</label>
                                <textarea class="passenger-address" required></textarea>
                            </div>
                        </div>
                    `;
                });
                dynamicContainer.innerHTML = formsHTML;
                document.getElementById('checkout-modal').style.display = 'flex';
            }

            // IMPORTANT: Clear the pending booking from localStorage so it doesn't fire again on next login
            localStorage.removeItem('pendingBooking_scheduleId');
            localStorage.removeItem('pendingBooking_seats');
            localStorage.removeItem('pendingBooking_date');
            localStorage.removeItem('pendingBooking_timestamp');
        }
    }
});

// Setup Login
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        
        try {
            const formData = new URLSearchParams();
            formData.append('username', email); // OAuth2 expects username
            formData.append('password', password);

            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail);

            localStorage.setItem('access_token', data.access_token);
            
            const userRes = await fetch(`${API_URL}/auth/me`, {
                headers: { 'Authorization': `Bearer ${data.access_token}` }
            });
            const userData = await userRes.json();
            localStorage.setItem('user_role', userData.role);
            localStorage.setItem('user_email', userData.email);

            // Check if there's a recent pending booking (within last 15 mins)
            const pendingScheduleId = localStorage.getItem('pendingBooking_scheduleId');
            const pendingTimestamp = localStorage.getItem('pendingBooking_timestamp');
            const isRecent = pendingTimestamp && (Date.now() - parseInt(pendingTimestamp) < 900000);

            if (pendingScheduleId && isRecent) {
                // Return to homepage where the booking modal will automatically open
                window.location.href = 'index.html?resumeBooking=true';
            } else {
                // Clear any expired pending bookings
                localStorage.removeItem('pendingBooking_scheduleId');
                localStorage.removeItem('pendingBooking_seatNumber');
                localStorage.removeItem('pendingBooking_date');
                localStorage.removeItem('pendingBooking_timestamp');
                window.location.href = userData.role === 'admin' ? 'admin.html' : 'index.html';
            }
        } catch (err) {
            errorDiv.textContent = err.message;
            errorDiv.style.display = 'block';
        }
    });
}

// Setup Register
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('register-error');
        const successDiv = document.getElementById('register-success');
        
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Registration failed');

            errorDiv.style.display = 'none';
            successDiv.textContent = 'Registration successful! Redirecting to login...';
            successDiv.style.display = 'block';
            setTimeout(() => window.location.href = 'login.html', 1500);
        } catch (err) {
            successDiv.style.display = 'none';
            errorDiv.textContent = err.message;
            errorDiv.style.display = 'block';
        }
    });
}

// Swap Source and Destination
function swapCities() {
    const srcInput = document.getElementById('source');
    const destInput = document.getElementById('destination');
    const temp = srcInput.value;
    srcInput.value = destInput.value;
    destInput.value = temp;

    // Optional animation effect
    const swapIcon = document.querySelector('.swap-icon i');
    if (swapIcon) {
        swapIcon.style.transform = 'rotate(180deg)';
        setTimeout(() => swapIcon.style.transform = 'none', 300);
    }
}

// Bus Search Logic
async function searchBuses() {
    const source = document.getElementById('source').value;
    const dest = document.getElementById('destination').value;
    const date = document.getElementById('travel-date').value;

    if(!source || !dest || !date) { alert("Please fill all search fields"); return; }
    
    // Store date for later use in booking
    window.currentSearchDate = date;

    const res = await fetch(`${API_URL}/buses/search?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(dest)}&travel_date=${date}`);
    const schedules = await res.json();

    const resultsSection = document.getElementById('results-section');
    const busList = document.getElementById('bus-list');
    document.getElementById('results-count').textContent = `${schedules.length} Buses found`;

    resultsSection.style.display = 'block';
    busList.innerHTML = '';

    if (schedules.length === 0) {
        busList.innerHTML = '<p>No buses found for this route.</p>';
        return;
    }

    schedules.forEach(schedule => {
        const card = document.createElement('div');
        card.className = 'bus-card';
        card.innerHTML = `
            <div class="bus-info">
                <h3>${schedule.bus.name}</h3>
                <span class="bus-type">${schedule.bus.type}</span>
            </div>
            <div class="bus-timing">
                <div class="time-block">
                    <div class="time">${schedule.departure_time.slice(0, 5)}</div>
                    <div class="place">${schedule.route.source}</div>
                </div>
                <div class="duration">${schedule.route.duration}</div>
                <div class="time-block">
                    <div class="time">${schedule.arrival_time.slice(0, 5)}</div>
                    <div class="place">${schedule.route.destination}</div>
                </div>
            </div>
            <div class="bus-price">
                <div class="amount">₹${schedule.price}</div>
                <div class="bus-actions">
                    <button class="btn btn-primary" onclick="viewSeats(${schedule.id}, ${schedule.price})">View Seats</button>
                </div>
            </div>
            <div id="seats-container-${schedule.id}" class="seat-layout-container" style="width: 100%; display: none;"></div>
        `;
        card.style.flexDirection = 'column'; // Adjust layout for seat dropdown
        
        // Wrap the top part in a flex container
        const topPart = document.createElement('div');
        topPart.style.display = 'flex';
        topPart.style.width = '100%';
        topPart.style.justifyContent = 'space-between';
        topPart.style.alignItems = 'center';
        
        while (card.firstChild) topPart.appendChild(card.firstChild);
        
        // Find seats container
        const seatsContainer = topPart.querySelector(`#seats-container-${schedule.id}`);
        topPart.removeChild(seatsContainer);
        
        card.appendChild(topPart);
        card.appendChild(seatsContainer);

        busList.appendChild(card);
    });
}

async function viewSeats(scheduleId, price) {
    const container = document.getElementById(`seats-container-${scheduleId}`);
    if (container.style.display === 'block') { container.style.display = 'none'; return; }

    const date = window.currentSearchDate;
    container.innerHTML = '<p style="text-align: center;">Loading seats...</p>';
    container.style.display = 'block';

    try {
        const res = await fetch(`${API_URL}/buses/seats/${scheduleId}/${date}`);
        const data = await res.json();
        
        // Generate seats HTML
        let seatsHTML = '<div class="seat-grid">';
        data.seats.forEach(seat => {
            const isBooked = seat.is_booked;
            const cls = isBooked ? 'seat booked' : 'seat available';
            const onclick = isBooked ? '' : `onclick="toggleSeat(this, ${seat.seat_number}, ${price})"`;
            seatsHTML += `<div class="${cls}" data-seat="${seat.seat_number}" ${onclick}>${isBooked ? 'X' : seat.seat_number}</div>`;
        });
        seatsHTML += '</div>';

        seatsHTML += `
            <div class="checkout-panel">
                <p>Selected Seat: <strong id="selected-seat-${scheduleId}">None</strong></p>
                <p>Total Fare: <strong id="total-price-${scheduleId}">₹0</strong></p>
                <button class="btn btn-primary" style="margin-top: 10px;" onclick="bookTicket(${scheduleId})">Proceed to Book</button>
            </div>
        `;

        container.innerHTML = seatsHTML;
        container.innerHTML = seatsHTML;
        window[`selectedSeats_${scheduleId}`] = []; // store current selected seats array
    } catch (err) {
        container.innerHTML = `<p style="color: red;">Error loading seats.</p>`;
    }
}

function toggleSeat(element, seatNumber, price) {
    const container = element.closest('.seat-layout-container');
    const scheduleId = container.id.split('-').pop();

    let selectedArray = window[`selectedSeats_${scheduleId}`] || [];

    if (element.classList.contains('selected')) {
        // Deselect
        element.classList.remove('selected');
        selectedArray = selectedArray.filter(s => s !== seatNumber);
    } else {
        // Select
        if (selectedArray.length >= 6) {
            alert("You can select a maximum of 6 seats at once.");
            return;
        }
        element.classList.add('selected');
        selectedArray.push(seatNumber);
    }

    // Sort to keep UI consistent
    selectedArray.sort((a,b) => a - b);
    window[`selectedSeats_${scheduleId}`] = selectedArray;
    
    document.getElementById(`selected-seat-${scheduleId}`).textContent = selectedArray.length > 0 ? selectedArray.join(", ") : "None";
    document.getElementById(`total-price-${scheduleId}`).textContent = `₹${price * selectedArray.length}`;
}

async function bookTicket(scheduleId) {
    const selectedArray = window[`selectedSeats_${scheduleId}`] || [];
    if (selectedArray.length === 0) {
        alert("Please select at least one seat first");
        return;
    }

    if (!isAuthenticated()) {
        alert("Please login to book a ticket");
        // Save pending booking details to localStorage with a timestamp
        localStorage.setItem('pendingBooking_scheduleId', scheduleId);
        localStorage.setItem('pendingBooking_seats', JSON.stringify(selectedArray));
        localStorage.setItem('pendingBooking_date', window.currentSearchDate);
        localStorage.setItem('pendingBooking_timestamp', Date.now().toString());
        window.location.href = 'login.html';
        return;
    }

    document.getElementById('modal-schedule-id').value = scheduleId;
    
    // Inject Dynamic Passenger Forms
    const dynamicContainer = document.getElementById('dynamic-passenger-forms');
    let formsHTML = '';
    selectedArray.forEach((seatNumber, index) => {
        formsHTML += `
            <div class="passenger-block" data-seat="${seatNumber}" style="margin-bottom: 1.5rem;">
                <h3 style="margin-bottom: 0.5rem; color: var(--primary-color);">Passenger ${index + 1} (Seat ${seatNumber})</h3>
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" class="passenger-name" required>
                </div>
                <div class="form-group">
                    <label>Phone Number</label>
                    <input type="tel" class="passenger-phone" required>
                </div>
                <div class="form-group">
                    <label>Address</label>
                    <textarea class="passenger-address" required></textarea>
                </div>
            </div>
        `;
    });
    dynamicContainer.innerHTML = formsHTML;

    document.getElementById('checkout-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('checkout-modal').style.display = 'none';
}

function togglePaymentMethod(method) {
    const cardDetails = document.getElementById('payment-card-details');
    const upiDetails = document.getElementById('payment-upi-details');
    
    // Clear required flags temporarily
    cardDetails.querySelectorAll('input').forEach(el => el.required = false);
    upiDetails.querySelectorAll('input').forEach(el => el.required = false);

    if (method === 'card') {
        cardDetails.style.display = 'block';
        upiDetails.style.display = 'none';
        cardDetails.querySelectorAll('input').forEach(el => el.required = true);
    } else {
        cardDetails.style.display = 'none';
        upiDetails.style.display = 'block';
        upiDetails.querySelectorAll('input').forEach(el => el.required = true);
    }
}

// Handle Checkout Form Submit
const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const scheduleId = document.getElementById('modal-schedule-id').value;
        const travel_date = window.currentSearchDate;
        
        // Gather all passenger details
        const passengers = [];
        const blocks = document.querySelectorAll('.passenger-block');
        blocks.forEach(block => {
            const seat_number = parseInt(block.getAttribute('data-seat'));
            const name = block.querySelector('.passenger-name').value;
            const phone = block.querySelector('.passenger-phone').value;
            const address = block.querySelector('.passenger-address').value;
            
            passengers.push({
                seat_number: seat_number,
                passenger_name: name,
                passenger_phone: phone,
                passenger_address: address
            });
        });
        
        const payBtn = document.getElementById('pay-btn');
        payBtn.textContent = 'Processing Payment...';
        payBtn.disabled = true;

        try {
            // Simulate Payment Delay
            await new Promise(r => setTimeout(r, 1500));

            const res = await fetch(`${API_URL}/bookings/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    schedule_id: scheduleId,
                    travel_date: travel_date,
                    passengers: passengers
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.detail);

            alert(`Payment Successful! ${data.length} ticket(s) booked successfully!`);
            closeModal();
            checkoutForm.reset();
            viewSeats(scheduleId, 0); // Refresh seats
        } catch (err) {
            alert(`Booking failed: ${err.message}`);
        } finally {
            payBtn.textContent = 'Pay & Book Ticket';
            payBtn.disabled = false;
        }
    });
}

// User Dashboard Logic
async function loadUserBookings() {
    const list = document.getElementById('user-bookings-list');
    if (!list) return;

    try {
        const res = await fetch(`${API_URL}/bookings/my-bookings`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const bookings = await res.json();
        
        if (bookings.length === 0) {
            list.innerHTML = '<p>You have no bookings.</p>';
            return;
        }

        let html = '';
        bookings.forEach(b => {
             html += `
                <div class="bus-card" style="align-items: flex-start; flex-direction: column;">
                    <h3>${b.schedule.bus.name} (${b.schedule.route.source} to ${b.schedule.route.destination})</h3>
                    <p><strong>Passenger:</strong> ${b.passenger_name} (${b.passenger_phone})</p>
                    <p><strong>Travel Date:</strong> ${b.travel_date}</p>
                    <p><strong>Seat No:</strong> ${b.seat_number}</p>
                    <p><strong>Departs at:</strong> ${b.schedule.departure_time}</p>
                </div>
            `;
        });
        list.innerHTML = html;
        document.getElementById('user-greeting').textContent = `Hello, ${localStorage.getItem('user_email')}`;
    } catch (err) {
        list.innerHTML = `<p style="color:red">Error loading bookings</p>`;
    }
}

// Admin Panel Logic
async function loadAdminData() {
    // Check elements
    if (!document.getElementById('admin-bookings-table')) return;
    try {
        const headers = { 'Authorization': `Bearer ${getToken()}` };
        
        // Load Bookings
        const bRes = await fetch(`${API_URL}/admin/bookings`, { headers });
        const bookings = await bRes.json();
        const bTbody = document.querySelector('#admin-bookings-table tbody');
        bTbody.innerHTML = bookings.map(b => `<tr><td>${b.id}</td><td>${b.passenger_name} (${b.passenger_phone})</td><td>${b.schedule_id}</td><td>${b.travel_date}</td><td>${b.seat_number}</td></tr>`).join('');

        // Load Buses
        const busRes = await fetch(`${API_URL}/admin/buses`, { headers });
        const buses = await busRes.json();
        document.getElementById('admin-buses-tbody').innerHTML = buses.map(b => `
            <tr>
                <td>${b.id}</td><td>${b.name}</td><td>${b.type}</td><td>${b.total_seats}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-primary" onclick='openEditModal("bus", ${JSON.stringify(b)})'><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-outline" style="color: red; border-color: red;" onclick="deleteItem('buses', ${b.id})"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </td>
            </tr>`).join('');

        // Load Routes
        const rRes = await fetch(`${API_URL}/admin/routes`, { headers });
        const routes = await rRes.json();
        document.getElementById('admin-routes-tbody').innerHTML = routes.map(r => `
            <tr>
                <td>${r.id}</td><td>${r.source}</td><td>${r.destination}</td><td>${r.duration}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-primary" onclick='openEditModal("route", ${JSON.stringify(r)})'><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-outline" style="color: red; border-color: red;" onclick="deleteItem('routes', ${r.id})"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </td>
            </tr>`).join('');

        // Load Schedules
        const sRes = await fetch(`${API_URL}/admin/schedules`, { headers });
        const schedules = await sRes.json();
        document.getElementById('admin-schedules-tbody').innerHTML = schedules.map(s => `
            <tr>
                <td>${s.id}</td><td>${s.bus_id}</td><td>${s.route_id}</td><td>${s.departure_time}</td><td>${s.arrival_time}</td><td>₹${s.price}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-primary" onclick='openEditModal("schedule", ${JSON.stringify(s)})'><i class="fas fa-edit"></i> Edit</button>
                        <button class="btn btn-outline" style="color: red; border-color: red;" onclick="deleteItem('schedules', ${s.id})"><i class="fas fa-trash"></i> Delete</button>
                    </div>
                </td>
            </tr>`).join('');
    } catch (e) { console.error('Error loading admin data', e); }
}

// Admin Form Handlers
document.addEventListener('DOMContentLoaded', () => {
    // Add Forms
    const abf = document.getElementById('add-bus-form');
    if(abf) abf.addEventListener('submit', async(e) => {
        e.preventDefault();
        const obj = {
            name: document.getElementById('bus-name').value, type: document.getElementById('bus-type').value, total_seats: parseInt(document.getElementById('bus-seats').value)
        };
        await fetch(`${API_URL}/admin/buses`, { method: 'POST', headers: {'Content-Type':'application/json','Authorization': `Bearer ${getToken()}`}, body: JSON.stringify(obj)});
        loadAdminData(); abf.reset();
    });

    const arf = document.getElementById('add-route-form');
    if(arf) arf.addEventListener('submit', async(e) => {
        e.preventDefault();
        const obj = {
            source: document.getElementById('route-source').value, destination: document.getElementById('route-dest').value, duration: document.getElementById('route-dur').value
        };
        await fetch(`${API_URL}/admin/routes`, { method: 'POST', headers: {'Content-Type':'application/json','Authorization': `Bearer ${getToken()}`}, body: JSON.stringify(obj)});
        loadAdminData(); arf.reset();
    });

    const asf = document.getElementById('add-schedule-form');
    if(asf) asf.addEventListener('submit', async(e) => {
        e.preventDefault();
        const obj = {
            bus_id: parseInt(document.getElementById('sch-bus-id').value), route_id: parseInt(document.getElementById('sch-route-id').value),
            departure_time: document.getElementById('sch-dept').value, arrival_time: document.getElementById('sch-arr').value, price: parseFloat(document.getElementById('sch-price').value)
        };
        await fetch(`${API_URL}/admin/schedules`, { method: 'POST', headers: {'Content-Type':'application/json','Authorization': `Bearer ${getToken()}`}, body: JSON.stringify(obj)});
        loadAdminData(); asf.reset();
    });

    // Edit Forms
    const ebf = document.getElementById('edit-bus-form');
    if(ebf) ebf.addEventListener('submit', async(e) => {
        e.preventDefault();
        const id = document.getElementById('edit-bus-id').value;
        const obj = {
            name: document.getElementById('edit-bus-name').value, type: document.getElementById('edit-bus-type').value, total_seats: parseInt(document.getElementById('edit-bus-seats').value)
        };
        await fetch(`${API_URL}/admin/buses/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json','Authorization': `Bearer ${getToken()}`}, body: JSON.stringify(obj)});
        closeEditModal('edit-bus-modal'); loadAdminData();
    });

    const erf = document.getElementById('edit-route-form');
    if(erf) erf.addEventListener('submit', async(e) => {
        e.preventDefault();
        const id = document.getElementById('edit-route-id').value;
        const obj = {
            source: document.getElementById('edit-route-source').value, destination: document.getElementById('edit-route-dest').value, duration: document.getElementById('edit-route-dur').value
        };
        await fetch(`${API_URL}/admin/routes/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json','Authorization': `Bearer ${getToken()}`}, body: JSON.stringify(obj)});
        closeEditModal('edit-route-modal'); loadAdminData();
    });

    const esf = document.getElementById('edit-schedule-form');
    if(esf) esf.addEventListener('submit', async(e) => {
        e.preventDefault();
        const id = document.getElementById('edit-schedule-id').value;
        const obj = {
            bus_id: parseInt(document.getElementById('edit-sch-bus-id').value), route_id: parseInt(document.getElementById('edit-sch-route-id').value),
            departure_time: document.getElementById('edit-sch-dept').value, arrival_time: document.getElementById('edit-sch-arr').value, price: parseFloat(document.getElementById('edit-sch-price').value)
        };
        await fetch(`${API_URL}/admin/schedules/${id}`, { method: 'PUT', headers: {'Content-Type':'application/json','Authorization': `Bearer ${getToken()}`}, body: JSON.stringify(obj)});
        closeEditModal('edit-schedule-modal'); loadAdminData();
    });
});

// Admin Update/Delete UI Logic
function openEditModal(type, data) {
    if (type === 'bus') {
        document.getElementById('edit-bus-id').value = data.id;
        document.getElementById('edit-bus-name').value = data.name;
        document.getElementById('edit-bus-type').value = data.type;
        document.getElementById('edit-bus-seats').value = data.total_seats;
        document.getElementById('edit-bus-modal').style.display = 'flex';
    } else if (type === 'route') {
        document.getElementById('edit-route-id').value = data.id;
        document.getElementById('edit-route-source').value = data.source;
        document.getElementById('edit-route-dest').value = data.destination;
        document.getElementById('edit-route-dur').value = data.duration;
        document.getElementById('edit-route-modal').style.display = 'flex';
    } else if (type === 'schedule') {
        document.getElementById('edit-schedule-id').value = data.id;
        document.getElementById('edit-sch-bus-id').value = data.bus_id;
        document.getElementById('edit-sch-route-id').value = data.route_id;
        document.getElementById('edit-sch-dept').value = data.departure_time;
        document.getElementById('edit-sch-arr').value = data.arrival_time;
        document.getElementById('edit-sch-price').value = data.price;
        document.getElementById('edit-schedule-modal').style.display = 'flex';
    }
}

function closeEditModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function deleteItem(endpoint, id) {
    if (!confirm(`Are you sure you want to delete this item?`)) return;
    
    try {
        const res = await fetch(`${API_URL}/admin/${endpoint}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.detail || "Error deleting item");
        }
        
        alert("Item deleted successfully!");
        loadAdminData();
    } catch (err) {
        alert(err.message);
    }
}
