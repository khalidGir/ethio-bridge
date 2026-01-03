import { useState, useEffect } from 'preact/hooks';
import ChatWindow from './ChatWindow';
import ChatBubble from './ChatBubble';

interface WidgetConfig {
  businessId: string;
  businessName?: string;
  brandColor?: string;
}

export default function ChatWidget({ businessId }: WidgetConfig) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch business configuration
    fetch(`https://ethio-bridge-api.onrender.com/api/config/${businessId}`)
      .then(res => res.json())
      .then(data => {
        setConfig(data);
        setLoading(false);
      })
      .catch(() => {
        // Fallback config
        setConfig({
          businessName: 'Ethiopian Business',
          brandColor: '#2563eb'
        });
        setLoading(false);
      });
  }, [businessId]);

  if (loading) {
    return null; // Don't render until config loads
  }

  return (
    <div className="ethio-widget">
      {isOpen && (
        <ChatWindow
          businessId={businessId}
          businessName={config?.businessName}
          brandColor={config?.brandColor}
          onClose={() => setIsOpen(false)}
        />
      )}
      <ChatBubble
        color={config?.brandColor || '#2563eb'}
        onClick={() => setIsOpen(!isOpen)}
      />
    </div>
  );
}