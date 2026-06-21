// app/manseryeok/couple-chat/data.ts
export type Sender = 'consultant' | 'husband' | 'wife' | 'system'

export type Message = {
  id: string
  consultation_id: string
  sender: Sender
  message: string
  image_url?: string
  created_at: string
  read_at?: string
}

export const senderConfig: Record<Sender, {
  label: string
  short: string
  bubble: string
  nameColor: string
  avatar: string
}> = {
  consultant: {
    label: '연재 선생님',
    short: '연',
    bubble: 'bg-[#2d2060] text-[#e0d8ff]',
    nameColor: 'text-[#9977ff]',
    avatar: 'bg-[#2d2060] text-[#c8b0ff]',
  },
  husband: {
    label: '남편',
    short: '남',
    bubble: 'bg-[#1a1a35] text-[#b8b0ff]',
    nameColor: 'text-[#7766bb]',
    avatar: 'bg-[#1a3050] text-[#88bbff]',
  },
  wife: {
    label: '아내',
    short: '아',
    bubble: 'bg-[#13132a] text-[#c8c8ff] border border-[#252545]',
    nameColor: 'text-[#6688bb]',
    avatar: 'bg-[#1a3020] text-[#88cc88]',
  },
  system: {
    label: '',
    short: '',
    bubble: '',
    nameColor: '',
    avatar: '',
  },
}
