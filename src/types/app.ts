/**
 * Application Types
 */

export interface ChatSettings {
  maxMessages: number
  showAvatars: boolean
  showTimestamps: boolean
  autoScroll: boolean
  fontSize: number
  theme: 'dark' | 'light'
}

export interface StreamInfo {
  streamId: string
  channelName: string
  title: string
  isLive: boolean
  viewerCount?: number
}
