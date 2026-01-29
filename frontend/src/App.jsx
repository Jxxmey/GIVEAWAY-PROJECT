import { useState, useEffect } from 'react'
import Admin from './Admin' // ✅ Import หน้า Admin เข้ามา
import NotFound from './NotFound' 
import './App.css'
import { Sparkles, Share2, Download, User, Music, Info, CheckCircle2, Heart, Maximize2, X, Twitter } from 'lucide-react'
import confetti from 'canvas-confetti'

function App() {
  // --- ROUTING LOGIC (ตัวจัดการเปลี่ยนหน้า) ---
  const path = window.location.pathname;

  // 1. ✅ เช็คถ้าเข้าผ่านลิงก์ลับ -> ไปหน้า Admin
  if (path === '/@jaiidees_only') {
    return <Admin />;
  }

  // 2. ถ้าไม่ใช่หน้าหลัก (และไม่ใช่ Admin) -> ไปหน้า 404
  if (path !== '/' && path !== '/index.html') {
    return <NotFound />;
  }
  // ----------------------------------------

  const [step, setStep] = useState('landing')
  const [formData, setFormData] = useState({ gender: '', name: '' })
  const [result, setResult] = useState(null)
  const [loadingText, setLoadingText] = useState('Initializing...')
  const [showExample, setShowExample] = useState(false)

  const handleStart = (gender) => {
    setFormData({ ...formData, gender })
    setStep('form')
  }

  const handleSubmit = async () => {
    setStep('animating')
    const texts = ['Connecting...', 'Checking Quota...', 'Generating Gift...', 'Finalizing...']
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
      
      if (data.status === 'success') {
        setTimeout(() => {
          setResult(data.data)
          setStep('result')
          triggerConfetti()
        }, 2000)
      } else if (data.status === 'already_played') {
        setTimeout(() => {
            alert("⚠️ คุณใช้สิทธิ์ร่วมกิจกรรมไปแล้ว\n(จำกัด 1 สิทธิ์ ต่อ 1 ท่าน)\n\nระบบจะแสดงรูปภาพที่คุณได้รับครับ")
            setResult(data.data)
            setStep('result')
        }, 500)
      } else {
        alert("เกิดข้อผิดพลาด กรุณาลองใหม่")
        setStep('landing')
      }
    } catch (err) {
      clearInterval(interval)
      console.error(err)
      alert("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้")
      setStep('landing')
    }
  }

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(function() {
      const timeLeft = animationEnd - Date.now();
      if (timeLeft <= 0) return clearInterval(interval);
      const particleCount = 50 * (timeLeft / duration);
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
      confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
    }, 250);
  }

  const handleShareTwitter = () => {
    const text = `สุ่มกาชา Riser Concert ได้รูปสวยมาก! 🔮✨\n\nมาเล่นกันที่ Fan Project by @Jaiidees\n\n#RiserConcert #JaiideesGiveaway`;
    const url = window.location.href;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
  }

  return (
    <div className="min-h-screen font-sans flex flex-col relative overflow-hidden selection:bg-pink-500/30">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-slate-50">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-400/20 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-purple-400/20 rounded-full blur-[100px] animate-pulse-slow" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-pink-400/20 rounded-full blur-[120px]"></div>
      </div>

      {/* --- HEADER --- */}
      <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-white/50 shadow-sm">
        <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto drop-shadow-md" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-pink-600">
                RISER CONCERT
              </span>
              <span className="text-[8px] text-slate-500 uppercase tracking-widest">
                Fan Project by @Jaiidees
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 w-full max-w-md mx-auto px-6 pt-24 pb-32 flex flex-col justify-center relative z-10 min-h-[100dvh]">

        {/* STEP 1: LANDING & RULES */}
        {step === 'landing' && (
          <div className="space-y-8 animate-fade-in">
            
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-pink-50 border border-purple-100 text-purple-600 text-[10px] font-bold tracking-widest uppercase shadow-sm">
                <Sparkles size={12} className="text-pink-500" />
                <span>Special Giveaway</span>
              </div>
              <h1 className="text-5xl font-black italic leading-tight text-slate-800 drop-shadow-sm">
                THE FIRST<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                  RISE
                </span>
              </h1>
            </div>

            {/* RULES CARD */}
            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-xl shadow-purple-100/50 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
              
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Info size={18} className="text-purple-500" />
                เงื่อนไขและกติกา
              </h2>
              
              <ul className="space-y-3">
                <li className="flex items-start gap-3 text-xs text-slate-600 font-medium leading-relaxed">
                  <CheckCircle2 size={16} className="text-pink-400 flex-shrink-0 mt-0.5" />
                  <span>จำกัดสิทธิ์การร่วมสนุก <strong>1 ท่าน / 1 ครั้ง</strong> เท่านั้น (ระบบตรวจสอบผ่าน IP Address)</span>
                </li>
                <li className="flex items-start gap-3 text-xs text-slate-600 font-medium leading-relaxed">
                   <CheckCircle2 size={16} className="text-pink-400 flex-shrink-0 mt-0.5" />
                   <span>ผู้เล่นสามารถเลือก <strong>ประเภทการ์ด</strong> ที่ต้องการได้ก่อนเริ่มสุ่ม</span>
                </li>
                <li className="flex items-start gap-3 text-xs text-slate-600 font-medium leading-relaxed">
                   <CheckCircle2 size={16} className="text-pink-400 flex-shrink-0 mt-0.5" />
                   <span>ของรางวัลคือภาพ <strong>Wallpaper Exclusive</strong> และคำอวยพรพิเศษจาก AI</span>
                </li>
                 <li className="flex items-start gap-3 text-xs text-slate-600 font-medium leading-relaxed">
                   <CheckCircle2 size={16} className="text-pink-400 flex-shrink-0 mt-0.5" />
                   <span>กิจกรรมนี้เป็น <strong>Fan Project</strong> จัดทำเพื่อความบันเทิง <strong>ไม่มีค่าใช้จ่าย</strong></span>
                </li>
                 <li className="flex items-start gap-3 text-xs text-slate-600 font-medium leading-relaxed">
                   <CheckCircle2 size={16} className="text-pink-400 flex-shrink-0 mt-0.5" />
                   <span>ภาพที่ได้รับถือเป็นลิขสิทธิ์ของกิจกรรม <strong>ห้ามนำไปจำหน่าย</strong></span>
                </li>
              </ul>
            </div>

            {/* Example Image */}
            <div className="space-y-2">
              <p className="text-center text-xs text-slate-400 uppercase tracking-widest font-bold">ตัวอย่างภาพที่จะได้รับ</p>
              <div 
                className="relative w-full aspect-video bg-slate-100 rounded-3xl overflow-hidden shadow-xl shadow-pink-100/50 border border-white group cursor-pointer"
                onClick={() => setShowExample(true)}
              >
                <img
                  src="/jaiidees.png"
                  alt="Example Result"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 text-white">
                    <Maximize2 size={24} />
                  </div>
                </div>
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-pink-600 shadow-sm">
                  Example by @Jaiidees
                </div>
              </div>
              <p className="text-center text-[10px] text-slate-400 opacity-70">(แตะที่รูปเพื่อดูเต็มจอ)</p>
            </div>

            {/* Gender Selection */}
            <div className="space-y-3 pb-6">
               <p className="text-center text-xs text-slate-400 uppercase tracking-widest font-bold">เลือกทีมเพื่อเริ่มสุ่ม</p>
               <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleStart('male')}
                  className="group relative h-36 rounded-3xl overflow-hidden bg-white shadow-lg shadow-blue-100 hover:shadow-blue-200 transition-all duration-300 hover:-translate-y-1 border border-white"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-100 group-hover:opacity-0 transition-opacity"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2">
                    <span className="text-4xl drop-shadow-sm group-hover:scale-110 transition-transform duration-300">🤵</span>
                    <span className="text-xs font-bold tracking-widest text-slate-600 group-hover:text-white transition-colors">BOY SIDE</span>
                  </div>
                </button>

                <button 
                  onClick={() => handleStart('female')}
                  className="group relative h-36 rounded-3xl overflow-hidden bg-white shadow-lg shadow-pink-100 hover:shadow-pink-200 transition-all duration-300 hover:-translate-y-1 border border-white"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-50 to-white opacity-100 group-hover:opacity-0 transition-opacity"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2">
                    <span className="text-4xl drop-shadow-sm group-hover:scale-110 transition-transform duration-300">💃</span>
                    <span className="text-xs font-bold tracking-widest text-slate-600 group-hover:text-white transition-colors">GIRL SIDE</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: FORM */}
        {step === 'form' && (
          <div className="animate-zoom-in relative">
            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-8 shadow-2xl shadow-purple-100/50">
              <h2 className="text-xl font-bold text-center mb-6 text-slate-800">ลงทะเบียน</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-slate-500 ml-1 flex items-center gap-1 font-bold">
                    <User size={12} /> ชื่อเล่น / Account (Optional)
                  </label>
                  <input 
                    type="text" 
                    placeholder="เช่น @riser_fan" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <button 
                  onClick={handleSubmit}
                  className="w-full py-4 rounded-xl font-bold text-white text-sm uppercase tracking-wide bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:brightness-110 transition-all shadow-lg shadow-purple-200 active:scale-95"
                >
                  Start Gacha ✨
                </button>
                <button onClick={() => setStep('landing')} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">
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
              <div className="absolute inset-0 border-4 border-purple-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 border-r-pink-500 rounded-full animate-spin"></div>
              <div className="absolute inset-4 border-4 border-transparent border-l-blue-400 rounded-full animate-spin-slow"></div>
              <div className="text-6xl animate-float filter drop-shadow-md grayscale-0">🔮</div>
            </div>
            <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-pink-500 animate-pulse uppercase tracking-widest">
              {loadingText}
            </p>
          </div>
        )}

        {/* STEP 4: RESULT */}
        {step === 'result' && result && (
          <div className="animate-zoom-in space-y-5">
            <div className="bg-white border border-white rounded-3xl overflow-hidden shadow-2xl shadow-blue-100/50 relative group">
              <div className="relative w-full aspect-video bg-slate-100">
                <img src={result.image_url} alt="Result" className="w-full h-full object-cover" />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md border border-white shadow-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span>
                  <span className="text-[10px] font-bold text-pink-600 tracking-wider">SSR</span>
                </div>
              </div>

              <div className="p-6 bg-white relative">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart size={12} className="text-pink-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Special Message</span>
                  </div>
                  <p className="text-slate-700 text-sm font-medium italic leading-relaxed">
                    "{result.blessing}"
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <a href={result.image_url} download target="_blank" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-colors shadow-lg">
                    <Download size={14} /> SAVE
                  </a>
                  <button 
                    onClick={handleShareTwitter} 
                    className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1D9BF0] border border-[#1D9BF0] text-white text-xs font-bold hover:brightness-110 transition-colors"
                  >
                    <Twitter size={14} /> POST TO X
                  </button>
                </div>
              </div>
            </div>
            
            <div className="text-center pb-6">
               <p className="text-[10px] text-slate-400 opacity-80">
                 ขอบคุณที่ร่วมสนุกกับกิจกรรม Fan Project ครับ (สิทธิ์ของคุณครบแล้ว)
               </p>
            </div>
          </div>
        )}

      </main>
      
      {/* Fullscreen Modal */}
      {showExample && (
        <div 
          className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowExample(false)}
        >
          <div 
            className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/20"
            onClick={(e) => e.stopPropagation()}
          >
            <img src="/jaiidees.png" className="w-full h-full object-contain bg-black" />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-40 select-none">
               <img src="/logo.png" className="w-24 h-auto mb-4 drop-shadow-lg" />
               <span className="text-white text-4xl md:text-6xl font-black tracking-widest -rotate-12 border-2 border-white px-8 py-2 rounded-xl mix-blend-overlay">
                 SAMPLE
               </span>
               <p className="text-white mt-4 font-bold tracking-widest text-lg md:text-2xl drop-shadow-md">
                 Fan Project by @Jaiidees
               </p>
            </div>
            <button onClick={() => setShowExample(false)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-red-500 transition-colors">
              <X size={24} />
            </button>
          </div>
        </div>
      )}

      {/* --- FOOTER --- */}
      <footer className="fixed bottom-0 w-full py-4 bg-white/80 backdrop-blur border-t border-white/50 text-center z-50">
        <div className="flex flex-col items-center gap-1.5">
          <p className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">
            Created by @Jaiidees • AI Generated Content
          </p>
          <a 
            href="https://twitter.com/Jaiidees" 
            target="_blank" 
            rel="noreferrer"
            className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-blue-500 transition-colors bg-white/50 px-3 py-1 rounded-full border border-slate-200"
          >
            Contact <span className="font-black text-slate-800">X</span> : @Jaiidees
          </a>
        </div>
      </footer>
    </div>
  )
}

export default App