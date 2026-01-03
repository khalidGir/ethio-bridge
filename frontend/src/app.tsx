import { useState } from 'preact/hooks';
import ChatWidget from './components/ChatWidget';
import './components/widget.css';

export function App() {
  const [businessId, setBusinessId] = useState('default-business');

  return (
    <div>
      <h1>Ethio-Bridge Widget Demo</h1>
      <div>
        <label>
          Business ID:
          <input
            type="text"
            value={businessId}
            onChange={(e) => setBusinessId(e.currentTarget.value)}
          />
        </label>
      </div>
      <p>Click the chat bubble in the bottom-right corner to open the widget</p>

      {/* The ChatWidget will appear as a fixed element */}
      <ChatWidget businessId={businessId} />
    </div>
  );
}

export default App;