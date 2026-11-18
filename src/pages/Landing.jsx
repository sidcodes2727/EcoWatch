import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import LanguageToggle from '../components/LanguageToggle'
import { Leaf, ArrowRight, Brain, Navigation, Zap, Shield, Camera, CheckCircle } from 'lucide-react'

export default function Landing() {
  const { t } = useLanguage()

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen relative bg-eco-50 font-sans selection:bg-eco-200 selection:text-eco-900">
      <nav className="fixed w-full px-6 lg:px-12 py-6 flex items-center justify-between border-b border-eco-900/10 bg-eco-50/90 backdrop-blur-md z-50 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-eco-900 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-eco-50" strokeWidth={1.5} />
          </div>
          <span className="font-medium text-xl tracking-[0.1em] text-eco-900 uppercase">EcoWatch</span>
        </div>
        
        <div className="hidden md:flex items-center gap-10">
          <button onClick={() => scrollTo('features')} className="text-xs font-bold tracking-[0.1em] uppercase text-eco-600 hover:text-eco-900 transition-colors">
            {t('platform')}
          </button>
          <button onClick={() => scrollTo('how-it-works')} className="text-xs font-bold tracking-[0.1em] uppercase text-eco-600 hover:text-eco-900 transition-colors">
            {t('howItWorks')}
          </button>
          <button onClick={() => scrollTo('technology')} className="text-xs font-bold tracking-[0.1em] uppercase text-eco-600 hover:text-eco-900 transition-colors">
            {t('technology')}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <LanguageToggle />
          <Link to="/login" className="text-xs font-bold tracking-[0.1em] uppercase text-eco-900 hover:text-accent transition-colors hidden sm:block">
            {t('signIn')}
          </Link>
          <Link to="/register" className="btn-editorial btn-editorial-primary px-6 py-3">
            {t('register')}
          </Link>
        </div>
      </nav>

      <main className="pt-32 pb-20 lg:pt-40 lg:pb-32 px-6 lg:px-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-grid-size opacity-50 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center relative z-10">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-3 mb-8 border border-eco-900/10 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-eco-800">{t('liveBadge')}</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] leading-[1.05] text-eco-900 font-bold mb-8 tracking-tight">
              {t('heroTitle1')}<br />
              {t('heroTitle2')}<br />
              <span className="text-accent italic font-medium">{t('heroTitle3')}</span>
            </h1>

            <p className="text-lg lg:text-xl text-eco-700 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light mb-10">
              {t('heroSubtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link to="/register" className="btn-editorial btn-editorial-primary w-full sm:w-auto px-10 py-5 group">
                {t('deployNow')}
                <ArrowRight className="w-4 h-4 ml-3 transition-transform group-hover:translate-x-2" />
              </Link>
              <button onClick={() => scrollTo('how-it-works')} className="btn-editorial btn-editorial-secondary w-full sm:w-auto px-10 py-5">
                {t('explorePlatform')}
              </button>
            </div>
          </div>

          <div className="flex-1 w-full max-w-2xl lg:max-w-none relative">
            <div className="aspect-square sm:aspect-video lg:aspect-[4/3] bg-eco-900 relative overflow-hidden shadow-2xl border border-eco-900/10 flex items-center justify-center">
              <div className="absolute inset-0 bg-grid-pattern bg-grid-size opacity-10 mix-blend-overlay" />
              
              <div className="relative z-10 w-[80%] h-[70%] border border-eco-50/20 bg-eco-800/50 backdrop-blur flex flex-col p-6 shadow-2xl transform lg:-rotate-2 transition-transform hover:rotate-0 duration-700">
                <div className="flex items-center justify-between border-b border-eco-50/10 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-accent" />
                    <span className="text-xs font-bold tracking-widest uppercase text-eco-50">{t('aiAnalysisActive')}</span>
                  </div>
                  <span className="text-[10px] font-mono text-eco-400">SYS_OK</span>
                </div>
                
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="border border-eco-50/10 bg-eco-900/50 p-4 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-eco-400 uppercase tracking-widest mb-2">{t('fillCapacity')}</span>
                    <span className="text-4xl font-light text-white">87<span className="text-xl text-eco-500">%</span></span>
                  </div>
                  <div className="border border-eco-50/10 bg-eco-900/50 p-4 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-eco-400 uppercase tracking-widest mb-2">{t('priority')}</span>
                    <span className="text-2xl font-bold text-accent uppercase">{t('severityHigh')}</span>
                  </div>
                  <div className="col-span-2 border border-eco-50/10 bg-eco-900/50 p-4">
                    <span className="text-[10px] font-bold text-eco-400 uppercase tracking-widest mb-3 block">{t('routeOptimization')}</span>
                    <div className="h-1 bg-eco-800 relative w-full">
                      <div className="absolute top-0 left-0 h-full bg-accent w-[60%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <section id="features" className="py-24 bg-white border-t border-eco-900/10 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="mb-16 md:w-2/3">
            <h2 className="text-3xl md:text-5xl font-bold text-eco-900 mb-6 tracking-tight">{t('theEcosystem')}</h2>
            <p className="text-lg text-eco-600 font-light leading-relaxed">
              {t('ecosystemSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 border-t border-eco-900/10">
            {[
              {
                icon: Brain,
                title: t('feature1Title'),
                desc: t('feature1Desc')
              },
              {
                icon: Navigation,
                title: t('feature2Title'),
                desc: t('feature2Desc')
              },
              {
                icon: Shield,
                title: t('feature3Title'),
                desc: t('feature3Desc')
              }
            ].map((feature, idx) => (
              <div key={idx} className="pt-8 border-t md:border-t-0 md:border-l border-eco-900/10 md:pl-8 first:border-l-0 first:pl-0">
                <feature.icon className="w-8 h-8 text-accent mb-6" strokeWidth={1.5} />
                <h3 className="text-xl font-bold text-eco-900 mb-4">{feature.title}</h3>
                <p className="text-sm text-eco-600 leading-relaxed font-light">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="py-24 bg-eco-900 text-eco-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-grid-size opacity-10 mix-blend-overlay" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">{t('seamlessOperations')}</h2>
            <p className="text-eco-400 max-w-2xl mx-auto text-lg font-light">{t('operationsSubtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { num: "01", icon: Camera, title: t('step1Title'), text: t('step1Desc') },
              { num: "02", icon: Zap, title: t('step2Title'), text: t('step2Desc') },
              { num: "03", icon: CheckCircle, title: t('step3Title'), text: t('step3Desc') }
            ].map((step, idx) => (
              <div key={idx} className="relative group">
                <div className="text-7xl font-bold text-eco-800 mb-6 group-hover:text-eco-700 transition-colors">{step.num}</div>
                <div className="absolute top-8 left-8">
                  <step.icon className="w-8 h-8 text-accent mb-4" />
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-sm text-eco-300 leading-relaxed font-light">{step.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-eco-950 py-12 border-t border-eco-50/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Leaf className="w-5 h-5 text-eco-500" />
            <span className="font-bold text-lg tracking-[0.1em] text-white uppercase">EcoWatch</span>
          </div>
          <div className="text-xs font-mono text-eco-500">
            &copy; {new Date().getFullYear()} {t('footerCopy')}
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-xs font-bold tracking-widest uppercase text-eco-400 hover:text-white transition-colors">{t('privacy')}</a>
            <a href="#" className="text-xs font-bold tracking-widest uppercase text-eco-400 hover:text-white transition-colors">{t('terms')}</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
