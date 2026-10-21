import { useLanguage } from '../contexts/LanguageContext'
import { Languages } from 'lucide-react'

export default function LanguageToggle({ className = '' }) {
  const { language, setLanguage } = useLanguage()

  return (
    <div className={`inline-flex items-center border border-eco-900/20 bg-white/80 backdrop-blur-sm p-0.5 rounded-sm ${className}`}>
      <div className="flex items-center gap-1 px-1.5 py-1 text-eco-500">
        <Languages className="w-3.5 h-3.5" />
      </div>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2 py-1 text-[10px] font-bold tracking-wider uppercase transition-all ${
          language === 'en'
            ? 'bg-eco-900 text-white shadow-xs'
            : 'text-eco-600 hover:text-eco-900 hover:bg-eco-50'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('hi')}
        className={`px-2 py-1 text-[10px] font-bold tracking-wider transition-all ${
          language === 'hi'
            ? 'bg-eco-900 text-white shadow-xs'
            : 'text-eco-600 hover:text-eco-900 hover:bg-eco-50'
        }`}
      >
        हिंदी
      </button>
    </div>
  )
}

