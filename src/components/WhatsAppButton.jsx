
import { MessageCircle } from 'lucide-react'

export default function WhatsAppButton() {
  const phoneNumber = '27798078005'

  const message = encodeURIComponent(
    'Hello Blaq Dawg Store. I would like to make an enquiry.'
  )

  return (
    <a
      href={`https://wa.me/${phoneNumber}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Blaq Dawg Store on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition duration-300 hover:scale-110 hover:bg-[#1DA851] md:h-16 md:w-16"
    >
      <MessageCircle size={30} strokeWidth={2.5} />

      <span className="absolute right-0 top-0 flex h-3 w-3">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
        <span className="relative inline-flex h-3 w-3 rounded-full bg-white"></span>
      </span>
    </a>
  )
}
