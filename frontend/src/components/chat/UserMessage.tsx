import type { Message } from '../../types'

export function UserMessage({ message }: { message: Message }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-accent-1 px-4 py-2.5 text-sm leading-relaxed text-[#081018]">
        {message.content}
      </div>
    </div>
  )
}
