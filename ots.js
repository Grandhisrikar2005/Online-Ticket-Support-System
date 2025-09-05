<!DOCTYPE html>
<html lang="en" class="bg-gray-50">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ResolveWise | Full-Stack Simulation</title>
    <!-- Tailwind CSS for a high-end look and feel -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Inter', sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .view { display: none; animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        /* A little extra polish for the user menu and alerts */
        #user-menu, #notification-bar { display: none; }
    </style>
</head>
<body class="text-gray-800">

    <!-- Notification Bar for Success/Error Messages -->
    <div id="notification-bar" class="fixed top-5 right-5 z-50 p-4 rounded-lg shadow-xl text-white"></div>
    
    <!-- App Container - The Root of our "React" App -->
    <div id="app-root">
        <!-- The JS will render different "views" inside this root element -->
    </div>

    <!-- ===================================================================== -->
    <!-- JAVASCRIPT: THE ENTIRE MERN STACK SIMULATION -->
    <!-- ===================================================================== -->
    <script>
        document.addEventListener('DOMContentLoaded', () => {

            // ================================================================
            // 1. SIMULATING THE DATABASE (MongoDB with Mongoose)
            // We use localStorage to persist data across page reloads.
            // This object acts like our database access layer.
            // ================================================================
            const DB = {
                // Gets a collection (table) from localStorage or returns a default
                getCollection(key, defaultValue = []) {
                    try {
                        return JSON.parse(localStorage.getItem(key)) || defaultValue;
                    } catch (e) { return defaultValue; }
                },
                // Saves a collection to localStorage
                saveCollection(key, data) {
                    localStorage.setItem(key, JSON.stringify(data));
                },
                // Initializes the DB with default data if it's empty
                init() {
                    if (!localStorage.getItem('users')) {
                        const defaultUsers = [
                            { id: 1, name: "Agent Smith", email: "agent@resolvewise.com", password: "password", role: "agent" },
                            { id: 2, name: "Jane Doe", email: "customer@resolvewise.com", password: "password", role: "customer" },
                        ];
                        this.saveCollection('users', defaultUsers);
                    }
                    if (!localStorage.getItem('tickets')) {
                        const defaultTickets = [
                           { id: 1024, customerId: 2, customerName: "Jane Doe", title: "Website Login Issue", description: "I can't log in! It just reloads the page.", status: "In Progress", priority: "High", comments: [{id: 1, userId: 1, text: "Hi Jane, I'm looking into this for you.", createdAt: new Date(Date.now() - 3600000)}] },
                           { id: 1023, customerId: 3, customerName: "John Appleseed", title: "Billing Inquiry", description: "There is an extra charge on my latest invoice.", status: "Closed", priority: "Low", comments: [] },
                           { id: 1021, customerId: 2, customerName: "Jane Doe", title: "My new order hasn't shipped", description: "It has been three days, and my order #ABC-123 is still 'processing'.", status: "Open", priority: "Medium", comments: [] },
                        ];
                        this.saveCollection('tickets', defaultTickets);
                    }
                }
            };
            DB.init();

            // ================================================================
            // 2. SIMULATING THE BACKEND (Node.js / Express.js Controllers)
            // This object contains our application's business logic.
            // These functions would be your API endpoints (e.g., POST /api/login).
            // ================================================================
            const AppService = {
                currentUser: JSON.parse(sessionStorage.getItem('currentUser')), // Use sessionStorage for session state

                login(email, password) {
                    const users = DB.getCollection('users');
                    const foundUser = users.find(u => u.email === email && u.password === password);
                    if (foundUser) {
                        this.currentUser = foundUser;
                        sessionStorage.setItem('currentUser', JSON.stringify(foundUser));
                        return true;
                    }
                    return false;
                },
                logout() {
                    this.currentUser = null;
                    sessionStorage.removeItem('currentUser');
                },
                getTicketsForCurrentUser() {
                    const allTickets = DB.getCollection('tickets');
                    if(this.currentUser.role === 'agent') return allTickets;
                    return allTickets.filter(t => t.customerId === this.currentUser.id);
                },
                getTicketById(ticketId) {
                    const allTickets = DB.getCollection('tickets');
                    return allTickets.find(t => t.id === ticketId);
                },
                createTicket(title, priority, description) {
                    const tickets = DB.getCollection('tickets');
                    const newTicket = {
                        id: Date.now(), // Unique ID based on timestamp
                        customerId: this.currentUser.id,
                        customerName: this.currentUser.name,
                        title,
                        description,
                        status: 'Open',
                        priority,
                        comments: [],
                    };
                    tickets.unshift(newTicket);
                    DB.saveCollection('tickets', tickets);
                    return newTicket;
                },
                updateUser(newName) {
                    const users = DB.getCollection('users');
                    const tickets = DB.getCollection('tickets');
                    
                    const userInDb = users.find(u => u.id === this.currentUser.id);
                    if (userInDb) userInDb.name = newName;

                    tickets.forEach(ticket => {
                        if (ticket.customerId === this.currentUser.id) ticket.customerName = newName;
                    });
                    
                    this.currentUser.name = newName;
                    sessionStorage.setItem('currentUser', JSON.stringify(this.currentUser));
                    DB.saveCollection('users', users);
                    DB.saveCollection('tickets', tickets);
                    return true;
                },
                addComment(ticketId, text) {
                    const tickets = DB.getCollection('tickets');
                    const ticket = tickets.find(t => t.id === ticketId);
                    if(ticket) {
                        const newComment = {
                            id: Date.now(),
                            userId: this.currentUser.id,
                            text,
                            createdAt: new Date(),
                        };
                        ticket.comments.push(newComment);
                        DB.saveCollection('tickets', tickets);
                        // SIMULATING SOCKET.IO EMIT
                        // Dispatch a custom event that the UI will listen for
                        document.dispatchEvent(new CustomEvent('new-comment', { detail: { ticketId, newComment } }));
                        return newComment;
                    }
                    return null;
                }
            };

            // ================================================================
            // 3. SIMULATING THE FRONTEND (React.js Components & Rendering)
            // This object handles all DOM manipulation, acting like React.
            // Functions are named like React components (e.g., LoginPage).
            // ================================================================
            const UIRenderer = {
                appRoot: document.getElementById('app-root'),
                notificationBar: document.getElementById('notification-bar'),

                // The main router function
                render(view, props) {
                    this.appRoot.innerHTML = ''; // Clear previous view
                    let viewHTML = '';
                    switch (view) {
                        case 'login': viewHTML = this.LoginPage(); break;
                        case 'dashboard': viewHTML = this.DashboardPage(props); break;
                        case 'createTicket': viewHTML = this.CreateTicketPage(props); break;
                        case 'account': viewHTML = this.AccountPage(props); break;
                        case 'ticketDetail': viewHTML = this.TicketDetailPage(props); break;
                    }
                    this.appRoot.innerHTML = viewHTML;
                    this.bindCommonEvents();
                    
                    // Specific event bindings for the rendered view
                    if (view === 'ticketDetail') {
                         this.bindTicketDetailEvents(props.ticket);
                    }
                },
                
                // --- Reusable Component-like functions ---
                Header(props = {}) {
                    const { title, showBackButton } = props;
                    return `
                        <header class="bg-white shadow-sm sticky top-0 z-10">
                            <nav class="container mx-auto px-4 lg:px-8 flex justify-between items-center h-16">
                                ${showBackButton ? 
                                    `<button data-route="dashboard" class="flex items-center space-x-2 text-gray-600 hover:text-blue-600">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
                                        <span>Back</span>
                                    </button>` 
                                    : 
                                    `<div class="flex items-center space-x-2 text-blue-600"><svg class="h-8 w-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span class="font-bold text-xl">ResolveWise</span></div>`
                                }
                                <div class="relative">
                                    <button id="user-menu-button" class="flex items-center space-x-2 text-sm text-gray-700 hover:text-blue-600">
                                        <span class="font-semibold">${AppService.currentUser.name}</span>
                                        <svg class="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
                                    </button>
                                    <div id="user-menu" class="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5">
                                        <a href="#" data-route="account" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">My Account</a>
                                        <a href="#" data-action="logout" class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">Log Out</a>
                                    </div>
                                </div>
                            </nav>
                        </header>
                    `;
                },
                TicketItem(ticket) {
                    const pColors = { Low: 'bg-green-500', Medium: 'bg-blue-500', High: 'bg-red-500' };
                    const sColors = { Open: 'bg-emerald-600', 'In Progress': 'bg-amber-500', Closed: 'bg-slate-700' };
                    return `
                        <div data-route="ticketDetail" data-id="${ticket.id}" class="p-4 hover:bg-gray-50 cursor-pointer flex justify-between items-center transition duration-200">
                            <div><p class="font-semibold text-lg text-gray-900">${ticket.title}</p><p class="text-sm text-gray-500">#${ticket.id} • ${ticket.customerName}</p></div>
                            <div class="flex items-center space-x-4"><span class="px-3 py-1 rounded-full text-xs font-semibold text-white ${pColors[ticket.priority] || ''}">${ticket.priority}</span><span class="px-3 py-1 rounded-full text-xs font-semibold text-white ${sColors[ticket.status] || ''}">${ticket.status}</span></div>
                        </div>`;
                },
                
                // --- Page-level component functions ---
                LoginPage() {
                    return `
                        <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                            <div class="w-full max-w-md">
                                <div class="text-center mb-8"><svg class="mx-auto h-12 w-auto text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><h1 class="text-3xl font-bold mt-4">ResolveWise</h1><p class="text-gray-500">Sign in to your support dashboard</p></div>
                                <div class="bg-white p-8 rounded-2xl shadow-lg">
                                    <form id="login-form">
                                        <div class="mb-4"><label for="email" class="block text-sm font-medium text-gray-700">Email Address</label><input type="email" id="email" class="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md" value="agent@resolvewise.com" required></div>
                                        <div class="mb-6"><label for="password" class="block text-sm font-medium text-gray-700">Password</label><input type="password" id="password" class="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md" value="password" required></div>
                                        <div><button type="submit" class="w-full flex justify-center py-3 px-4 border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">Sign In</button></div>
                                    </form>
                                    <p class="text-xs text-center mt-4 text-gray-400">Use agent@resolvewise.com or customer@resolvewise.com (pw: password)</p>
                                </div>
                            </div>
                        </div>
                    `;
                },
                DashboardPage(props) {
                    const tickets = props.tickets;
                    return `
                        ${this.Header({title: "Dashboard"})}
                        <main class="container mx-auto p-4 lg:p-8">
                            <div class="flex justify-between items-center mb-6">
                                <h1 class="text-3xl font-bold">${AppService.currentUser.role === 'agent' ? 'All Tickets' : 'My Tickets'}</h1>
                                <button data-route="createTicket" class="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">New Ticket</button>
                            </div>
                            <div class="bg-white rounded-lg shadow-md overflow-hidden"><div class="divide-y divide-gray-200">
                                ${tickets.length > 0 ? tickets.map(t => this.TicketItem(t)).join('') : '<p class="p-8 text-center text-gray-500">No tickets found.</p>'}
                            </div></div>
                        </main>
                    `;
                },
                CreateTicketPage(props) {
                    return `
                        ${this.Header({showBackButton: true})}
                        <main class="container mx-auto p-4 lg:p-8"><div class="max-w-2xl mx-auto"><div class="bg-white p-8 rounded-2xl shadow-lg">
                            <h1 class="text-2xl font-bold mb-6">Create New Ticket</h1>
                            <form id="create-ticket-form" class="space-y-6">
                                <div><label for="title">Title</label><input type="text" id="title" required class="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md"></div>
                                <div><label for="priority">Priority</label><select id="priority" class="mt-1 block w-full px-3 py-2 bg-gray-50 border-gray-300 rounded-md"><option>Low</option><option selected>Medium</option><option>High</option></select></div>
                                <div><label for="description">Description</label><textarea id="description" rows="5" required class="mt-1 block w-full px-3 py-2 bg-gray-50 border-gray-300 rounded-md"></textarea></div>
                                <div class="flex justify-end pt-2"><button type="submit" class="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Submit</button></div>
                            </form>
                        </div></div></main>
                    `;
                },
                AccountPage(props) {
                    return `
                        ${this.Header({showBackButton: true})}
                         <main class="container mx-auto p-4 lg:p-8"><div class="max-w-2xl mx-auto"><h1 class="text-3xl font-bold mb-6">My Account</h1><div class="bg-white p-8 rounded-2xl shadow-lg">
                             <form id="account-form" class="space-y-6">
                                 <div><label for="account-name">Name</label><input id="account-name" value="${AppService.currentUser.name}" class="mt-1 block w-full px-3 py-2 bg-gray-50 border-gray-300 rounded-md"></div>
                                 <div><label>Email</label><input value="${AppService.currentUser.email}" disabled class="mt-1 block w-full px-3 py-2 bg-gray-200 cursor-not-allowed border-gray-300 rounded-md"></div>
                                 <div class="flex justify-end pt-2"><button type="submit" class="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Save Changes</button></div>
                             </form>
                         </div></div></main>
                    `;
                },
                TicketDetailPage(props) {
                    const ticket = props.ticket;
                    const allUsers = DB.getCollection('users');
                    const commentHTML = (comment) => {
                         const user = allUsers.find(u => u.id === comment.userId);
                         const isCurrentUser = user.id === AppService.currentUser.id;
                         return `
                             <div class="flex items-start space-x-4">
                                 <div class="text-2xl p-2 rounded-full ${isCurrentUser ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}">${user.name.charAt(0)}</div>
                                 <div class="flex-1 ${isCurrentUser ? 'bg-blue-50' : 'bg-gray-100'} p-4 rounded-lg">
                                     <p class="font-bold">${user.name} <span class="text-xs font-normal text-gray-500">(${user.role})</span></p>
                                     <p class="text-gray-700 mt-1">${comment.text}</p>
                                     <p class="text-right text-xs text-gray-400 mt-2">${new Date(comment.createdAt).toLocaleString()}</p>
                                 </div>
                             </div>`;
                    }
                    return `
                        ${this.Header({showBackButton: true})}
                        <main class="container mx-auto p-4 lg:p-8">
                             <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                 <div class="lg:col-span-2">
                                     <div class="bg-white p-6 rounded-lg shadow-md mb-6">
                                         <h1 class="text-3xl font-bold text-gray-800">${ticket.title}</h1>
                                         <p class="mt-4 text-gray-700 leading-relaxed">${ticket.description}</p>
                                     </div>
                                     <div class="bg-white p-6 rounded-lg shadow-md">
                                         <h2 class="text-2xl font-bold text-gray-800 mb-4">Conversation</h2>
                                         <div id="comments-container" class="space-y-6">
                                            ${ticket.comments.map(commentHTML).join('')}
                                         </div>
                                         <form id="comment-form" class="mt-6 pt-6 border-t border-gray-200">
                                            <textarea id="comment-text" required placeholder="Type your reply..." class="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"></textarea>
                                            <button type="submit" class="mt-3 px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700">Post Reply</button>
                                         </form>
                                     </div>
                                 </div>
                                 <div class="lg:col-span-1">
                                     <div class="bg-white p-6 rounded-lg shadow-md">
                                        <h3 class="text-xl font-bold border-b pb-3 mb-4">Details</h3>
                                        <div class="space-y-4 text-sm">
                                            <div class="flex justify-between"><span>Requester</span><span>${ticket.customerName}</span></div>
                                            <div class="flex justify-between"><span>Status</span><span>${ticket.status}</span></div>
                                            <div class="flex justify-between"><span>Priority</span><span>${ticket.priority}</span></div>
                                        </div>
                                     </div>
                                 </div>
                             </div>
                        </main>
                    `;
                },

                // --- UI Helpers ---
                showNotification(message, type = 'success') {
                    this.notificationBar.textContent = message;
                    this.notificationBar.className = `fixed top-5 right-5 z-50 p-4 rounded-lg shadow-xl text-white ${type === 'success' ? 'bg-green-500' : 'bg-red-500'}`;
                    this.notificationBar.style.display = 'block';
                    setTimeout(() => { this.notificationBar.style.display = 'none'; }, 3000);
                },

                // --- Event Binding ---
                bindCommonEvents() {
                    this.appRoot.querySelectorAll('[data-route]').forEach(el => {
                        el.addEventListener('click', e => {
                            e.preventDefault();
                            const route = el.dataset.route;
                            const id = el.dataset.id ? parseInt(el.dataset.id) : null;
                            Router.navigate(route, { id });
                        });
                    });
                     this.appRoot.querySelectorAll('[data-action="logout"]').forEach(el => el.addEventListener('click', e => {
                        e.preventDefault();
                        Router.navigate('logout');
                    }));

                    const menuButton = document.getElementById('user-menu-button');
                    if(menuButton) menuButton.addEventListener('click', () => {
                         document.getElementById('user-menu').style.display = 'block';
                    });
                    
                    document.body.addEventListener('click', (e) => {
                        if(!e.target.closest('#user-menu-button') && document.getElementById('user-menu')){
                            document.getElementById('user-menu').style.display = 'none';
                        }
                    }, true);

                    const loginForm = document.getElementById('login-form');
                    if (loginForm) loginForm.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const success = AppService.login(e.target.email.value, e.target.password.value);
                        if(success) Router.navigate('dashboard');
                        else this.showNotification('Invalid credentials', 'error');
                    });
                     const createTicketForm = document.getElementById('create-ticket-form');
                    if (createTicketForm) createTicketForm.addEventListener('submit', e => {
                        e.preventDefault();
                        AppService.createTicket(e.target.title.value, e.target.priority.value, e.target.description.value);
                        this.showNotification('Ticket created successfully!');
                        Router.navigate('dashboard');
                    });
                    const accountForm = document.getElementById('account-form');
                    if (accountForm) accountForm.addEventListener('submit', e => {
                        e.preventDefault();
                        AppService.updateUser(e.target['account-name'].value);
                        this.showNotification('Account updated successfully!');
                        Router.navigate('dashboard');
                    });
                },
                bindTicketDetailEvents(ticket) {
                     // SIMULATING SOCKET.IO "ON"
                     // This is where the magic happens. We listen for our custom event.
                    const newCommentHandler = (event) => {
                         if (event.detail.ticketId === ticket.id) {
                            const newCommentHTML = this.TicketDetailPage({ticket: AppService.getTicketById(ticket.id)}).match(/<div id="comments-container"[\s\S]*?<\/div>/)[0];
                            document.getElementById('comments-container').outerHTML = newCommentHTML;
                            this.showNotification('New comment received!', 'success');
                         }
                    };
                    document.addEventListener('new-comment', newCommentHandler);
                    
                    const commentForm = document.getElementById('comment-form');
                    commentForm.addEventListener('submit', e => {
                         e.preventDefault();
                         const text = document.getElementById('comment-text').value;
                         AppService.addComment(ticket.id, text);
                         document.getElementById('comment-text').value = '';
                    });
                }
            };

            // ================================================================
            // 4. ROUTER: Controls the flow of the single-page application
            // ================================================================
            const Router = {
                navigate(route, props = {}) {
                    if (route === 'logout') {
                        AppService.logout();
                        return this.navigate('login');
                    }
                    if (!AppService.currentUser && route !== 'login') {
                        return this.navigate('login');
                    }
                    switch (route) {
                        case 'dashboard':
                            UIRenderer.render('dashboard', { tickets: AppService.getTicketsForCurrentUser() });
                            break;
                        case 'createTicket':
                             UIRenderer.render('createTicket');
                            break;
                        case 'account':
                            UIRenderer.render('account');
                            break;
                        case 'ticketDetail':
                            const ticket = AppService.getTicketById(props.id);
                            UIRenderer.render('ticketDetail', { ticket });
                            break;
                        default:
                            UIRenderer.render('login');
                    }
                }
            };

            // Initial application startup
            Router.navigate(window.location.hash.replace('#', '') || 'dashboard');
        });
    </script>
</body>
</html>