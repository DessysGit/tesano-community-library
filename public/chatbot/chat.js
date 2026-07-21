// ── Config ────────────────────────────────────────────────────────────────────
const CHAT_API_URL = (() => {
    const h = window.location.hostname;
    return (h === 'localhost' || h === '127.0.0.1')
        ? '/api'
        : 'https://library-backend-j90e.onrender.com/api';
})();

const SUGGESTIONS = [
    '📚 What books do you have?',
    '⭐ Recommend something to read',
    '📥 How do I download a book?',
    '🔍 How do I search?',
    '👤 How do I reset my password?'
];

let isWaiting    = false;
let charCount    = 0;
const MAX_CHARS  = 500;

// ── Toggle chatbox ────────────────────────────────────────────────────────────
function toggleChatbox() {
    const chatbox = document.getElementById('chatbox');
    const isOpen  = !chatbox.classList.contains('hidden');

    if (isOpen) {
        chatbox.classList.add('hidden');
    } else {
        chatbox.classList.remove('hidden');
        document.getElementById('user-input').focus();

        // Show welcome message on first open
        const messages = document.getElementById('messages');
        if (!messages.dataset.welcomed) {
            messages.dataset.welcomed = '1';
            showWelcome();
        }
    }
}

// ── Welcome message + suggestion chips ───────────────────────────────────────
function showWelcome() {
    const name = window.currentUsername && window.currentUsername !== 'Guest'
        ? `, ${window.currentUsername}`
        : '';

    appendMessage(
        'bot',
        `Hi${name}! 👋 I'm **LibBot**, your Tesano Community Library assistant.\n\nI can help you find books, explain features, or answer account questions. What can I help with?`
    );

    // Suggestion chips
    const chips = document.createElement('div');
    chips.className = 'suggestion-chips';
    SUGGESTIONS.forEach(text => {
        const btn = document.createElement('button');
        btn.className   = 'chip';
        btn.textContent = text;
        btn.onclick     = () => {
            chips.remove();
            sendMessage(text.replace(/^[\S]+ /, '')); // strip emoji prefix
        };
        chips.appendChild(btn);
    });
    document.getElementById('messages').appendChild(chips);
    scrollToBottom();
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function renderMarkdown(text) {
    return text
        // Bold: **text**
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Bullet: lines starting with • or -
        .replace(/^[•\-]\s+(.+)$/gm, '<li>$1</li>')
        // Wrap consecutive <li> in <ul>
        .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
        // Line breaks
        .replace(/\n/g, '<br>');
}

// ── Append a message bubble ───────────────────────────────────────────────────
function appendMessage(role, text) {
    const messages = document.getElementById('messages');

    const bubble = document.createElement('div');
    bubble.className = `message ${role === 'bot' ? 'bot-message' : 'user-message'}`;

    const content  = document.createElement('div');
    content.className = 'message-content';

    if (role === 'bot') {
        content.innerHTML = renderMarkdown(text);
    } else {
        content.textContent = text;
    }

    const timestamp = document.createElement('span');
    timestamp.className = 'message-time';
    timestamp.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    bubble.appendChild(content);
    bubble.appendChild(timestamp);
    messages.appendChild(bubble);
    scrollToBottom();
    return bubble;
}

// ── Typing indicator ──────────────────────────────────────────────────────────
function showTyping() {
    const messages = document.getElementById('messages');
    const el = document.createElement('div');
    el.className = 'message bot-message typing-indicator';
    el.id = 'typing';
    el.innerHTML = '<span></span><span></span><span></span>';
    messages.appendChild(el);
    scrollToBottom();
}

function hideTyping() {
    const el = document.getElementById('typing');
    if (el) el.remove();
}

// ── Send message ──────────────────────────────────────────────────────────────
async function sendMessage(overrideText) {
    if (isWaiting) return;

    const input   = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const message = (overrideText || input.value).trim();

    if (!message) return;

    // Remove suggestion chips on first user message
    document.querySelector('.suggestion-chips')?.remove();

    input.value = '';
    updateCharCounter('');
    appendMessage('user', message);

    // Lock UI while waiting
    isWaiting = true;
    if (sendBtn) { sendBtn.disabled = true; sendBtn.innerHTML = '⏳'; }
    input.disabled = true;
    showTyping();

    try {
        const res = await fetch(`${CHAT_API_URL}/chat`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ message, conversationId: 'libbot-session' })
        });

        hideTyping();

        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = await res.json();
        appendMessage('bot', data.reply || 'Sorry, I didn\'t get a response. Try again!');

    } catch (err) {
        hideTyping();
        appendMessage('bot', '⚠️ Couldn\'t reach the server. Please check your connection and try again.');
        console.error('LibBot error:', err);
    } finally {
        isWaiting = false;
        if (sendBtn) { sendBtn.disabled = false; sendBtn.innerHTML = '➤'; }
        input.disabled = false;
        input.focus();
    }
}

// ── Clear chat ────────────────────────────────────────────────────────────────
async function clearChat() {
    const messages = document.getElementById('messages');
    messages.innerHTML = '';
    delete messages.dataset.welcomed;

    // Tell the backend to reset the conversation history
    try {
        await fetch(`${CHAT_API_URL}/chat/reset`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ conversationId: 'libbot-session' })
        });
    } catch (_) {}

    showWelcome();
}

// ── Character counter ─────────────────────────────────────────────────────────
function updateCharCounter(value) {
    charCount = value.length;
    const counter = document.getElementById('char-counter');
    if (!counter) return;
    counter.textContent = `${charCount}/${MAX_CHARS}`;
    counter.style.color = charCount > MAX_CHARS * 0.9 ? '#f59e0b'
                        : charCount >= MAX_CHARS       ? '#dc3545'
                        : '#888';
}

// ── Scroll helper ─────────────────────────────────────────────────────────────
function scrollToBottom() {
    const messages = document.getElementById('messages');
    messages.scrollTop = messages.scrollHeight;
}

// ── Keyboard & input wiring ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('user-input');
    if (!input) return;

    input.setAttribute('maxlength', MAX_CHARS);

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    input.addEventListener('input', () => updateCharCounter(input.value));
});
