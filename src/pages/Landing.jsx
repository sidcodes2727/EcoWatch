import { Link } from 'react-router-dom'
import { Leaf, ArrowRight, Brain, Navigation, Zap, Shield, Camera, CheckCircle } from 'lucide-react'

export default function Landing() {
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen relative bg-eco-50 font-sans selection:bg-eco-200 selection:text-eco-900">
      
      {/* Navbar */}
      <nav className="fixed w-full px-6 lg:px-12 py-6 flex items-center justify-between border-b border-eco-900/10 bg-eco-50/90 backdrop-blur-md z-50 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-eco-900 flex items-center justify-center">
            <Leaf className="w-5 h-5 text-eco-50" strokeWidth={1.5} />
          </div>
          <span className="font-medium text-xl tracking-[0.1em] text-eco-900 uppercase">EcoWatch</span>
        </div>
        
        <div className="hidden md:flex items-center gap-10">
          <button onClick={() => scrollTo('features')} className="text-xs font-bold tracking-[0.1em] uppercase text-eco-600 hover:text-eco-900 transition-colors">Platform</button>
          <button onClick={() => scrollTo('how-it-works')} className="text-xs font-bold tracking-[0.1em] uppercase text-eco-600 hover:text-eco-900 transition-colors">How it works</button>
          <button onClick={() => scrollTo('technology')} className="text-xs font-bold tracking-[0.1em] uppercase text-eco-600 hover:text-eco-900 transition-colors">Technology</button>
        </div>

        <div className="flex items-center gap-4">
          <Link to="/login" className="text-xs font-bold tracking-[0.1em] uppercase text-eco-900 hover:text-accent transition-colors hidden sm:block">
            Sign In
          </Link>
          <Link to="/register" className="btn-editorial btn-editorial-primary px-6 py-3">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 lg:pt-40 lg:pb-32 px-6 lg:px-12 relative overflow-hidden">
        {/* Decorative Grid */}
        <div className="absolute inset-0 bg-grid-pattern bg-grid-size opacity-50 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-16 items-center relative z-10">
          
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-3 mb-8 border border-eco-900/10 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span className="text-[10px] font-bold tracking-widest uppercase text-eco-800">EcoWatch OS 2.0 Live</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] leading-[1.05] text-eco-900 font-bold mb-8 tracking-tight">
              Intelligent<br />
              waste management<br />
              <span className="text-accent italic font-medium">automated.</span>
            </h1>

            <p className="text-lg lg:text-xl text-eco-700 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light mb-10">
              Transform campus sustainability with military-grade AI vision, predictive routing, and automated workforce dispatching.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <Link to="/register" className="btn-editorial btn-editorial-primary w-full sm:w-auto px-10 py-5 group">
                Deploy Now
                <ArrowRight className="w-4 h-4 ml-3 transition-transform group-hover:translate-x-2" />
              </Link>
              <button onClick={() => scrollTo('how-it-works')} className="btn-editorial btn-editorial-secondary w-full sm:w-auto px-10 py-5">
                Explore Platform
              </button>
            </div>
          </div>

          <div className="flex-1 w-full max-w-2xl lg:max-w-none relative">
            {/* Abstract UI representation */}
            <div className="aspect-square sm:aspect-video lg:aspect-[4/3] bg-eco-900 relative overflow-hidden shadow-2xl border border-eco-900/10 flex items-center justify-center">
              <div className="absolute inset-0 bg-grid-pattern bg-grid-size opacity-10 mix-blend-overlay" />
              
              <div className="relative z-10 w-[80%] h-[70%] border border-eco-50/20 bg-eco-800/50 backdrop-blur flex flex-col p-6 shadow-2xl transform lg:-rotate-2 transition-transform hover:rotate-0 duration-700">
                <div className="flex items-center justify-between border-b border-eco-50/10 pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-accent" />
                    <span className="text-xs font-bold tracking-widest uppercase text-eco-50">AI Analysis Active</span>
                  </div>
                  <span className="text-[10px] font-mono text-eco-400">SYS_OK</span>
                </div>
                
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="border border-eco-50/10 bg-eco-900/50 p-4 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-eco-400 uppercase tracking-widest mb-2">Fill Capacity</span>
                    <span className="text-4xl font-light text-white">87<span className="text-xl text-eco-500">%</span></span>
                  </div>
                  <div className="border border-eco-50/10 bg-eco-900/50 p-4 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-eco-400 uppercase tracking-widest mb-2">Priority</span>
                    <span className="text-2xl font-bold text-accent uppercase">Critical</span>
                  </div>
                  <div className="col-span-2 border border-eco-50/10 bg-eco-900/50 p-4">
                    <span className="text-[10px] font-bold text-eco-400 uppercase tracking-widest mb-3 block">Route Optimization</span>
                    <div className="h-1 bg-eco-800 relative w-full">
                      <div className="absolute top-0 left-0 h-full bg-accent w-[60%]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute bottom-6 right-6 flex gap-2">
                <div className="w-2 h-2 bg-eco-500 rounded-none animate-pulse" />
                <div className="w-2 h-2 bg-eco-500 rounded-none animate-pulse delay-75" />
                <div className="w-2 h-2 bg-eco-500 rounded-none animate-pulse delay-150" />
              </div>
            </div>
          </div>
          
        </div>
      </main>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white border-t border-eco-900/10 relative">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="mb-16 md:w-2/3">
            <h2 className="text-3xl md:text-5xl font-bold text-eco-900 mb-6 tracking-tight">The Ecosystem</h2>
            <p className="text-lg text-eco-600 font-light leading-relaxed">
              A fully integrated suite of tools designed to optimize environmental maintenance through machine learning and real-time coordination.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 border-t border-eco-900/10">
            {[
              {
                icon: Brain,
                title: "Neural Vision",
                desc: "Instantaneous image analysis calculates fill volume and classifies waste severity with >95% accuracy."
              },
              {
                icon: Navigation,
                title: "Dynamic Routing",
                desc: "Algorithmic pathfinding ensures sanitation workers take the most efficient routes to critical bins."
              },
              {
                icon: Shield,
                title: "Automated Dispatch",
                desc: "The system autonomously creates, assigns, and verifies cleaning tasks without human oversight."
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

      {/* How it Works */}
      <section id="how-it-works" className="py-24 bg-eco-900 text-eco-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-grid-size opacity-10 mix-blend-overlay" />
        
        <div className="max-w-7xl mx-auto px-6 lg:px-12 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Seamless Operations</h2>
            <p className="text-eco-400 max-w-2xl mx-auto text-lg font-light">From detection to resolution in three automated steps.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              { num: "01", icon: Camera, title: "Capture & Detect", text: "Users snap a photo of a bin. The AI immediately analyzes the contents." },
              { num: "02", icon: Zap, title: "Analyze & Dispatch", text: "The system categorizes the urgency and assigns a task to the nearest available worker." },
              { num: "03", icon: CheckCircle, title: "Resolve & Verify", text: "Workers clean the bin and upload a proof image, which the AI verifies before closing the task." }
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

      {/* Footer */}
      <footer className="bg-eco-950 py-12 border-t border-eco-50/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <Leaf className="w-5 h-5 text-eco-500" />
            <span className="font-bold text-lg tracking-[0.1em] text-white uppercase">EcoWatch</span>
          </div>
          <div className="text-xs font-mono text-eco-500">
            &copy; {new Date().getFullYear()} EcoWatch Systems. All rights reserved.
          </div>
          <div className="flex gap-6">
            <a href="#" className="text-xs font-bold tracking-widest uppercase text-eco-400 hover:text-white transition-colors">Privacy</a>
            <a href="#" className="text-xs font-bold tracking-widest uppercase text-eco-400 hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
