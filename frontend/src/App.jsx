import { useState } from 'react'
import './App.css'

function App() {
  const [step, setStep] = useState('landing') // landing, form, animating, result
  const [formData, setFormData] = useState({ gender: '', name: '' })
  const [result, setResult] = useState(null)

  // เริ่มเลือกเพศ
  const handleStart = (gender) => {
    setFormData({ ...formData, gender })
    setStep('form')
  }

  // กดสุ่ม
  const handleSubmit = async () => {
    setStep('animating')
    try {
      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      
      // หน่วงเวลา 3.5 วิ ให้ดูขลัง
      if (data.status === 'success' || data.status === 'already_played') {
        setTimeout(() => {
          setResult(data.data)
          setStep('result')
        }, 3500)
      } else {
        alert("Server Error Please try again.")
        setStep('landing')
      }
    } catch (err) {
      console.error(err)
      alert("Connection Failed")
      setStep('landing')
    }
  }

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-amber-500/50 flex flex-col relative overflow-hidden">
      
      {/* Background Ambience (แสงฟุ้งๆ ด้านหลัง) */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-20%] w-[600px] h-[600px] bg-amber-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-20%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[100px]"></div>
      </div>

      {/* --- HEADER --- */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Event Name */}
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-600">
                RISER CONCERT
              </span>
              <span className="text-[9px] text-neutral-500 uppercase tracking-widest">
                The First Rise
              </span>
            </div>
          </div>
          {/* Creator Badge */}
          <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-medium text-neutral-400">
            By @Jaiidees
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 w-full max-w-md mx-auto px-6 pt-28 pb-12 flex flex-col justify-center relative z-10">

        {/* STEP 1: LANDING */}
        {step === 'landing' && (
          <div className="space-y-10 animate-fade-in">
            
            {/* Title Section */}
            <div className="text-center space-y-4">
              <div className="inline-block px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 text-amber-400 text-[10px] font-bold tracking-[0.3em] uppercase">
                Fan Project Giveaway
              </div>
              <h1 className="text-5xl font-black italic text-white leading-tight drop-shadow-2xl">
                UNLOCK<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-500 to-amber-700">
                  YOUR IDOL
                </span>
              </h1>
              <p className="text-sm text-neutral-400 font-light max-w-xs mx-auto">
                สุ่มรับ Digital Wallpaper พิเศษพร้อมคำอวยพร<br/>
                สร้างสรรค์ด้วย AI โดย <strong className="text-white">@Jaiidees</strong>
              </p>
            </div>

            {/* Selection Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Card Boy */}
              <button 
                onClick={() => handleStart('male')}
                className="group relative h-44 rounded-3xl overflow-hidden border border-white/10 transition-all duration-500 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.2)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-black group-hover:scale-110 transition-transform duration-700"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/40 to-transparent opacity-50"></div>
                
                <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center text-3xl shadow-lg group-hover:-translate-y-2 transition-transform duration-300">
                    🤵
                  </div>
                  <span className="text-xs font-bold tracking-widest text-blue-200 group-hover:text-white">BOY SIDE</span>
                </div>
              </button>

              {/* Card Girl */}
              <button 
                onClick={() => handleStart('female')}
                className="group relative h-44 rounded-3xl overflow-hidden border border-white/10 transition-all duration-500 hover:border-pink-500/50 hover:shadow-[0_0_30px_rgba(236,72,153,0.2)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-neutral-900 to-black group-hover:scale-110 transition-transform duration-700"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-pink-900/40 to-transparent opacity-50"></div>
                
                <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-white/5 backdrop-blur-md flex items-center justify-center text-3xl shadow-lg group-hover:-translate-y-2 transition-transform duration-300">
                    💃
                  </div>
                  <span className="text-xs font-bold tracking-widest text-pink-200 group-hover:text-white">GIRL SIDE</span>
                </div>
              </button>
            </div>

            {/* Rules */}
            <div className="text-center">
               <p className="text-[10px] text-neutral-600">
                 *1 สิทธิ์ ต่อ 1 ท่าน (IP Check) • AI Generated Image
               </p>
            </div>
          </div>
        )}

        {/* STEP 2: FORM */}
        {step === 'form' && (
          <div className="animate-zoom-in relative">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/20 rounded-full blur-[50px]"></div>
            
            <div className="bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <h2 className="text-2xl font-bold text-center mb-2 bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
                REGISTER
              </h2>
              <p className="text-center text-neutral-500 text-xs mb-8">
                กรอกชื่อเพื่อรับคำอวยพร (ไม่บังคับ)
              </p>

              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="ชื่อเล่น / X Account" 
                  className="w-full bg-black/50 border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-neutral-600 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all text-sm"
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />

                <button 
                  onClick={handleSubmit}
                  className="w-full py-4 rounded-2xl font-bold text-black text-sm uppercase tracking-wider bg-gradient-to-r from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 transform transition-all hover:scale-[1.02] shadow-[0_0_20px_rgba(251,191,36,0.3)]"
                >
                  Start Gacha 🔮
                </button>
                
                <button 
                  onClick={() => setStep('landing')}
                  className="w-full py-2 text-xs text-neutral-500 hover:text-white transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ANIMATION */}
        {step === 'animating' && (
          <div className="flex flex-col items-center justify-center animate-fade-in min-h-[50vh]">
            <div className="relative w-56 h-56 flex items-center justify-center mb-10">
              {/* Rings Animation */}
              <div className="absolute inset-0 border border-amber-500/20 rounded-full animate-[spin_4s_linear_infinite]"></div>
              <div className="absolute inset-4 border border-white/10 rounded-full animate-[spin_3s_linear_infinite_reverse]"></div>
              <div className="absolute inset-0 bg-amber-500/10 blur-[60px] rounded-full animate-pulse"></div>
              
              {/* Floating Emoji */}
              <div className="text-[7rem] animate-float drop-shadow-[0_0_30px_rgba(251,191,36,0.6)] filter contrast-125">
                💎
              </div>
            </div>
            
            <h3 className="text-xl font-bold text-white tracking-[0.2em] animate-pulse">
              SUMMONING...
            </h3>
            <p className="text-[10px] text-amber-500/70 mt-2 font-mono uppercase">
              Connecting to Gemini AI Neural Network
            </p>
          </div>
        )}

        {/* STEP 4: RESULT */}
        {step === 'result' && result && (
          <div className="animate-zoom-in space-y-6">
            
            {/* The Card */}
            <div className="bg-black rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(251,191,36,0.15)] border border-white/10 relative group">
              
              {/* Image */}
              <div className="relative aspect-[3/4]">
                <img 
                  src={result.image_url} 
                  alt="Result" 
                  className="w-full h-full object-cover transition-transform duration-[2s] group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                
                {/* Rarity Badge */}
                <div className="absolute top-4 right-4">
                  <div className="px-3 py-1 bg-black/40 backdrop-blur-md border border-amber-500/30 rounded-full flex items-center gap-1 shadow-lg">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span className="text-[9px] font-bold text-amber-400 tracking-wider">SSR</span>
                  </div>
                </div>
              </div>

              {/* Text Content */}
              <div className="absolute bottom-0 left-0 w-full p-6">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2 opacity-70">
                    <img src="/logo.png" className="h-4 w-auto grayscale" />
                    <span className="text-[9px] text-neutral-400 uppercase tracking-widest">Official AI Blessing</span>
                  </div>
                  <p className="text-white text-sm font-light leading-relaxed drop-shadow-md italic">
                    "{result.blessing}"
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <a 
                    href={result.image_url} 
                    download 
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black text-xs font-bold hover:bg-amber-400 transition-colors"
                  >
                    <span>📥</span> SAVE IMAGE
                  </a>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      alert("Link Copied! Share with your friends.");
                    }}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-white hover:bg-white/20 transition-colors"
                  >
                    <span>🔗</span> SHARE
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Text */}
            <div className="text-center space-y-1">
              <p className="text-[10px] text-neutral-500">
                Fan Project by <span className="text-amber-500 cursor-pointer hover:underline">@Jaiidees</span>
              </p>
              <p className="text-[9px] text-neutral-700">
                *Non-commercial use only. Images generated by AI.
              </p>
            </div>
          </div>
        )}

      </main>
    </div>
  )
}

export default App