import { useState, useEffect } from 'react'
import './App.css'
import { Sparkles, Share2, Download, RefreshCw, User, Music } from 'lucide-react'

function App() {
  const [step, setStep] = useState('landing')
  const [formData, setFormData] = useState({ gender: '', name: '' })
  const [result, setResult] = useState(null)
  const [loadingText, setLoadingText] = useState('Initializing...')

  const handleStart = (gender) => {
    setFormData({ ...formData, gender })
    setStep('form')
  }

  const handleSubmit = async () => {
    setStep('animating')
    const texts = ['Connecting to Gemini...', 'Analyzing Aura...', 'Generating Blessing...', 'Finalizing Gift...']
    let i = 0
    const interval = setInterval(() => {
      setLoadingText(texts[i])
      i = (i + 1) % texts.length
    }, 800)

    try {
      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      
      clearInterval(interval)
      
      if (data.status === 'success' || data.status === 'already_played') {
        setTimeout(() => {
          setResult(data.data)
          setStep('result')
        }, 2000) // รอ Animation นิดนึง
      } else {
        alert("Server Error. Please try again.")
        setStep('landing')
      }
    } catch (err) {
      clearInterval(interval)
      console.error(err)
      alert("Connection Failed")
      setStep('landing')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col relative overflow-hidden selection:bg-amber-500/30">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-amber-600/20 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-blue-900/20 rounded-full blur-[100px] animate-pulse-slow" style={{animationDelay: '1s'}}></div>
      </div>

      {/* --- HEADER --- */}
      <header className="fixed top-0 w-full z-50 bg-black/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-600">
                RISER CONCERT
              </span>
              <span className="text-[8px] text-neutral-500 uppercase tracking-widest">
                Fan Project by @Jaiidees
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 w-full max-w-md mx-auto px-6 pt-24 pb-12 flex flex-col justify-center relative z-10 min-h-[100dvh]">

        {/* STEP 1: LANDING */}
        {step === 'landing' && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold tracking-widest uppercase">
                <Sparkles size={10} />
                <span>Special Giveaway</span>
              </div>
              <h1 className="text-5xl font-black italic leading-tight">
                THE FIRST<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-600">
                  RISE
                </span>
              </h1>
              <p className="text-sm text-neutral-400 font-light px-4">
                สุ่มรับ Digital Wallpaper สุด Exclusive พร้อมคำอวยพรจาก AI
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {['male', 'female'].map((g) => (
                <button 
                  key={g}
                  onClick={() => handleStart(g)}
                  className="group relative h-40 rounded-3xl overflow-hidden border border-white/10 hover:border-amber-500/50 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${g === 'male' ? 'from-blue-900/40' : 'from-pink-900/40'} to-black group-hover:scale-110 transition-transform duration-700`}></div>
                  <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg">
                      {g === 'male' ? '🤵' : '💃'}
                    </div>
                    <span className="text-xs font-bold tracking-widest text-white/80 group-hover:text-white">
                      {g === 'male' ? 'BOY SIDE' : 'GIRL SIDE'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: FORM */}
        {step === 'form' && (
          <div className="animate-zoom-in relative">
            <div className="bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
              <h2 className="text-xl font-bold text-center mb-6">ลงทะเบียน</h2>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-neutral-400 ml-1 flex items-center gap-1">
                    <User size={12} /> ชื่อเล่น / Account (Optional)
                  </label>
                  <input 
                    type="text" 
                    placeholder="เช่น @riser_fan" 
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500/50 transition-all"
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>

                <button 
                  onClick={handleSubmit}
                  className="w-full py-4 rounded-xl font-bold text-black text-sm uppercase tracking-wide bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)] active:scale-95"
                >
                  Start Gacha ✨
                </button>
                <button onClick={() => setStep('landing')} className="w-full py-2 text-xs text-neutral-500 hover:text-white">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ANIMATION */}
        {step === 'animating' && (
          <div className="flex flex-col items-center justify-center animate-fade-in">
            <div className="relative w-40 h-40 flex items-center justify-center mb-8">
              <div className="absolute inset-0 border-2 border-amber-500/30 rounded-full border-t-amber-500 animate-spin"></div>
              <div className="absolute inset-4 border-2 border-white/10 rounded-full border-b-white/50 animate-spin-slow"></div>
              <div className="text-6xl animate-float filter drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]">
                🔮
              </div>
            </div>
            <p className="text-xs font-mono text-amber-500 animate-pulse uppercase tracking-widest">
              {loadingText}
            </p>
          </div>
        )}

        {/* STEP 4: RESULT */}
        {step === 'result' && result && (
          <div className="animate-zoom-in space-y-5">
            <div className="bg-black border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative group">
              <div className="relative aspect-[3/4]">
                <img src={result.image_url} alt="Result" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90"></div>
                
                {/* SSR Badge */}
                <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-amber-400 tracking-wider">SSR</span>
                </div>
              </div>

              <div className="absolute bottom-0 w-full p-6">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2 opacity-70">
                    <Music size={10} className="text-amber-500" />
                    <span className="text-[9px] text-neutral-400 uppercase tracking-widest">Gemini Blessing</span>
                  </div>
                  <p className="text-white text-sm font-light italic leading-relaxed">
                    "{result.blessing}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <a href={result.image_url} download target="_blank" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-xs font-bold hover:bg-neutral-200 transition-colors">
                    <Download size={14} /> SAVE
                  </a>
                  <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert("Link Copied!"); }} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 border border-white/10 text-white text-xs font-bold hover:bg-white/20 transition-colors">
                    <Share2 size={14} /> SHARE
                  </button>
                </div>
              </div>
            </div>
            
            <div className="text-center">
               <button onClick={() => setStep('landing')} className="text-[10px] text-neutral-500 flex items-center justify-center gap-1 mx-auto hover:text-white transition-colors">
                 <RefreshCw size={10} /> Play Again (Reset)
               </button>
            </div>
          </div>
        )}

      </main>
      
      <footer className="fixed bottom-0 w-full py-3 bg-black/90 backdrop-blur border-t border-white/5 text-center z-50">
        <p className="text-[8px] text-neutral-600 uppercase tracking-widest">
          Created by @Jaiidees • AI Generated Content
        </p>
      </footer>
    </div>
  )
}

export default App