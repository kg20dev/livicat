interface ChatMessageProps {
  username: string
  message: string
  avatarSeed: string | number
}

export default function ChatMessage({ username, message, avatarSeed }: ChatMessageProps) {
  return (
    <div className="flex gap-3 items-start group transition-all duration-500">
      <img
        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
        alt={username}
        className="w-8 h-8 rounded-full"
      />
      <div className="flex flex-col">
        <span className="text-label-md font-bold text-on-surface-variant">{username}</span>
        <p className="text-body-md text-on-surface mt-0.5">{message}</p>
      </div>
    </div>
  )
}
