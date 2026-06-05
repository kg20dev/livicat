import { FC } from 'react'

interface ChatDisplayProps {
  className?: string
}

export const ChatDisplay: FC<ChatDisplayProps> = ({ className = '' }) => {
  return (
    <div className={`chat-display ${className}`}>
      <div className="chat-header">
        <h2>Live Chat</h2>
      </div>
      <div className="chat-messages">
        <p className="text-gray-400">Chat messages will appear here...</p>
      </div>
    </div>
  )
}

export default ChatDisplay
