// Microsoft Graph API Web Application
// Uses MSAL.js with Azure CLI client ID (pre-approved)

// MSAL configuration using Azure CLI client ID
const msalConfig = {
    auth: {
        clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46', // Azure CLI (often pre-approved)
        authority: 'https://login.microsoftonline.com/a00de4ec-48a8-43a6-be74-e31274e2060d',
        redirectUri: 'http://localhost:3200'
    },
    cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: false
    }
};

// Permissions we need
const loginRequest = {
    scopes: ['user.read', 'mail.read', 'mail.send']
};

// Create MSAL instance
const msalInstance = new msal.PublicClientApplication(msalConfig);

let account = null;

// Initialize
async function initialize() {
    try {
        await msalInstance.initialize();

        // Handle redirect response
        const response = await msalInstance.handleRedirectPromise();
        if (response) {
            account = response.account;
            showMainUI();
            await loadUserInfo();
        } else {
            // Check if user is already signed in
            const accounts = msalInstance.getAllAccounts();
            if (accounts.length > 0) {
                account = accounts[0];
                showMainUI();
                await loadUserInfo();
            }
        }
    } catch (error) {
        showError('Initialization error: ' + error.message);
    }
}

// Sign in
async function signIn() {
    try {
        await msalInstance.loginRedirect(loginRequest);
    } catch (error) {
        showError('Sign in error: ' + error.message);
    }
}

// Sign out
function signOut() {
    msalInstance.logoutRedirect();
}

// Get access token
async function getAccessToken() {
    if (!account) {
        throw new Error('No account signed in');
    }

    const request = {
        scopes: loginRequest.scopes,
        account: account
    };

    try {
        const response = await msalInstance.acquireTokenSilent(request);
        return response.accessToken;
    } catch (error) {
        // Silent token acquisition failed, try interactive
        const response = await msalInstance.acquireTokenRedirect(request);
        return response.accessToken;
    }
}

// Load user information
async function loadUserInfo() {
    try {
        const token = await getAccessToken();
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const user = await response.json();
        document.getElementById('userDetails').innerHTML = `
            <p><strong>Name:</strong> ${user.displayName}</p>
            <p><strong>Email:</strong> ${user.mail || user.userPrincipalName}</p>
            <p><strong>Job Title:</strong> ${user.jobTitle || 'N/A'}</p>
        `;
    } catch (error) {
        showError('Failed to load user info: ' + error.message);
    }
}

// Display access token
async function displayAccessToken() {
    try {
        const token = await getAccessToken();
        document.getElementById('tokenOutput').innerHTML = `
            <h3>Access Token:</h3>
            <pre>${token}</pre>
            <p><small>Expires in ~1 hour</small></p>
        `;
    } catch (error) {
        showError('Failed to get token: ' + error.message);
    }
}

// List inbox
async function listInbox() {
    try {
        const token = await getAccessToken();
        document.getElementById('inboxOutput').innerHTML = '<p>Loading inbox...</p>';

        const response = await fetch(
            'https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages?$select=from,subject,receivedDateTime,isRead&$top=10&$orderby=receivedDateTime DESC',
            {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const messages = data.value;

        if (messages.length === 0) {
            document.getElementById('inboxOutput').innerHTML = '<p>No messages in inbox.</p>';
            return;
        }

        let html = '<h3>Latest 10 Messages:</h3><ul>';
        messages.forEach(msg => {
            const from = msg.from?.emailAddress?.name || 'Unknown';
            const date = new Date(msg.receivedDateTime).toLocaleString();
            const status = msg.isRead ? '✓ Read' : '✉️ Unread';
            html += `<li><strong>${msg.subject || '(No subject)'}</strong><br>
                     From: ${from} | ${date} | ${status}</li>`;
        });
        html += '</ul>';

        document.getElementById('inboxOutput').innerHTML = html;
    } catch (error) {
        showError('Failed to load inbox: ' + error.message);
    }
}

// Send mail
async function sendMail() {
    try {
        const token = await getAccessToken();
        document.getElementById('mailOutput').innerHTML = '<p>Sending email...</p>';

        // Get user email
        const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const user = await userResponse.json();
        const userEmail = user.mail || user.userPrincipalName;

        // Send email to self
        const mail = {
            message: {
                subject: 'Test Email from Graph API Tutorial',
                body: {
                    contentType: 'Text',
                    content: 'Hello! This is a test email sent from the Microsoft Graph API web tutorial.'
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: userEmail
                        }
                    }
                ]
            }
        };

        const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mail)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        document.getElementById('mailOutput').innerHTML = `
            <div class="success">
                <p>✅ Email sent successfully to ${userEmail}!</p>
            </div>
        `;
    } catch (error) {
        showError('Failed to send email: ' + error.message);
    }
}

// UI helpers
function showMainUI() {
    document.getElementById('loginSection').classList.add('hidden');
    document.getElementById('mainSection').classList.remove('hidden');
}

function showError(message) {
    document.getElementById('errorDetails').textContent = message;
    document.getElementById('errorSection').classList.remove('hidden');
    console.error(message);
}

// Initialize on page load
initialize();
