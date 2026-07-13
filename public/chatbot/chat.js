// Chatbot functionality with proper API integration
// Generates a unique conversation ID for session tracking
let conversationId = localStorage.getItem('chat-conversation-id') || ('chat-' + Date.now());
localStorage.setItem('chat-conversation-id', conversationId);

function toggleChatbox() {
  const chatbox = document.getElementById('chatbox');
  const wasHidden = chatbox.classList.contains('hidden');
  chatbox.classList.toggle('hidden');
  
  // If we're opening the chat, focus the input
  if (!chatbox.classList.contains('hidden')) {
    document.getElementById('user-input').focus();
  }
  
  // If we're closing the chat, reset the conversation
  if (wasHidden === false && chatbox.classList.contains('hidden')) {
    resetConversation();
  }
}

async function sendMessage() {
  const input = document.getElementById('user-input');
  const message = input.value.trim();
  if (!message) return;

  // Get username from session or default to "You"
  const senderName = window.currentUsername || "You";
  
  // Display user message
  appendMessage(senderName, message);
  input.value = '';
  
  // Show typing indicator
  const typingId = showTypingIndicator();

  try {
    // Use the same API_BASE_URL as defined in script.js
    const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
    
    // Get JWT token from localStorage if available (set during login)
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify({ message, conversationId })
    });

    // Remove typing indicator
    removeTypingIndicator(typingId);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const data = await response.json();
    appendMessage('LibBot', data.reply || 'Sorry, I didn\'t understand that.');
    
  } catch (error) {
    console.error('Chatbot error:', error);
    removeTypingIndicator(typingId);
    
    let errorMessage = 'Sorry, I\'m having trouble connecting. Please try again.';
    
    if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Network error. Please check your connection.';
    }
    
    appendMessage('LibBot', errorMessage, true);
  }
}

function appendMessage(sender, text, isError = false) {
  const messages = document.getElementById('messages');
  const msgDiv = document.createElement('div');
  msgDiv.className = `chat-message ${sender === 'LibBot' ? 'bot-message' : 'user-message'} ${isError ? 'error-message' : ''}`;
  
  // Convert markdown-like formatting to HTML for better display
  const formattedText = formatBotResponse(text);
  
  msgDiv.innerHTML = `
    <div class="message-header"><strong>${sender}</strong></div>
    <div class="message-text">${formattedText}</div>
  `;
  
  messages.appendChild(msgDiv);
  messages.scrollTop = messages.scrollHeight;
}

// Convert markdown formatting to HTML for bot responses
function formatBotResponse(text) {
  // Escape HTML first to prevent XSS
  const escaped = escapeHtml(text);
  // Convert **bold** to <strong>
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function showTypingIndicator() {
  const messages = document.getElementById('messages');
  const typingDiv = document.createElement('div');
  const id = 'typing-' + Date.now();
  typingDiv.id = id;
  typingDiv.className = 'chat-message bot-message typing-indicator';
  typingDiv.innerHTML = `
    <div class="message-header"><strong>LibBot</strong></div>
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  messages.appendChild(typingDiv);
  messages.scrollTop = messages.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const indicator = document.getElementById(id);
  if (indicator) {
    indicator.remove();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Enable sending message with Enter key
document.addEventListener('DOMContentLoaded', () => {
  const userInput = document.getElementById('user-input');
  if (userInput) {
    userInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
  
  // Try to get username from the page
  initializeUsername();
});

// Initialize username from page elements
function initializeUsername() {
  const burgerUsername = document.getElementById('burger-username');
  if (burgerUsername && burgerUsername.textContent !== 'Username') {
    window.currentUsername = burgerUsername.textContent;
  }
}

// Reset the conversation when chat is closed
async function resetConversation() {
  const apiUrl = typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '';
  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  try {
    await fetch(`${apiUrl}/api/chat/reset`, {
      method: 'POST',
      headers: headers,
      credentials: 'include',
      body: JSON.stringify({ conversationId })
    });
    // Clear stored conversation ID for fresh start next time
    localStorage.removeItem('chat-conversation-id');
    conversationId = 'chat-' + Date.now();
    localStorage.setItem('chat-conversation-id', conversationId);
  } catch (err) {
    console.log('Could not reset conversation');
  }
}
