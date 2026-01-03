import { useState } from 'preact/hooks';

interface ChatWindowProps {
  businessId: string;
  businessName?: string;
  brandColor?: string;
  onClose: () => void;
}

export default function ChatWindow({ businessId, businessName, brandColor, onClose }: ChatWindowProps) {
  const [messages, setMessages] = useState<{id: number, text: string, sender: 'user' | 'system'}[]>([
    { id: 1, text: `Hello! Welcome to ${businessName || 'our service'}. How can we help you today?`, sender: 'system' }
  ]);
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    if (inputValue.trim()) {
      const newMessage = {
        id: messages.length + 1,
        text: inputValue,
        sender: 'user' as const
      };
      setMessages([...messages, newMessage]);
      
      // Send message to backend
      fetch('https://ethio-bridge-api.onrender.com/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          message: inputValue
        })
      });
      
      setInputValue('');
    }
  };

  return (
    <div className="chat-window" style={{ border: `2px solid ${brandColor || '#2563eb'}` }}>
      <div className="chat-header" style={{ backgroundColor: brandColor || '#2563eb' }}>
        <div className="chat-title">{businessName || 'Ethio-Bridge'}</div>
        <button className="close-btn" onClick={onClose}>×</button>
      </div>
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.currentTarget.value)}
          placeholder="Type your message..."
          className="chat-input"
        />
        <button type="submit" className="send-btn" style={{ backgroundColor: brandColor || '#2563eb' }}>
          Send
        </button>
      </form>
    </div>
  );
}