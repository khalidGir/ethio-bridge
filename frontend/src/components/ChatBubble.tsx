interface ChatBubbleProps {
  color: string;
  onClick: () => void;
}

export default function ChatBubble({ color, onClick }: ChatBubbleProps) {
  return (
    <div 
      className="chat-bubble" 
      onClick={onClick}
      style={{ 
        backgroundColor: color,
        boxShadow: `0 4px 12px ${color}40`
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
    </div>
  );
}