import { useState, useEffect, useRef } from 'react'
import Admin from './Admin'
import NotFound from './NotFound'
import './App.css'
import { Sparkles, Share2, Download, User, Info, CheckCircle2, Heart, Maximize2, X, Twitter, Gift, Globe, MessageCircle, Send } from 'lucide-react'
import confetti from 'canvas-confetti'

// --- TRANSLATION DICTIONARY ---
const TRANSLATIONS = {
  th: {
    subtitle: "Fan Project by @Jaiidees",
    special_giveaway: "Special Giveaway",
    banner_title: "กิจกรรมพิเศษ! แจกรางวัลส่งถึงบ้าน",
    banner_desc: "เพียงกรอกชื่อเล่น/Account X ก็มีสิทธิ์ลุ้นรับของรางวัลพิเศษจาก @jaiidees",
    banner_date: "ประกาศผล 28 ก.พ. 2569",
    rules_title: "เงื่อนไขและกติกา",
    rule_1: "จำกัดสิทธิ์การร่วมสนุก 1 ท่าน / 1 ครั้ง เท่านั้น (ตรวจสอบ IP)",
    rule_2: "ผู้เล่นสามารถเลือก ประเภทการ์ด ที่ต้องการได้ก่อนเริ่มสุ่ม",
    rule_3: "ของรางวัลคือภาพ Wallpaper Exclusive และคำอวยพรพิเศษจาก AI",
    rule_4: "กิจกรรมนี้เป็น Fan Project จัดทำเพื่อความบันเทิง ไม่มีค่าใช้จ่าย",
    rule_5: "ภาพที่ได้รับถือเป็นลิขสิทธิ์ของกิจกรรม ห้ามนำไปจำหน่าย",
    example_text: "ตัวอย่างภาพที่จะได้รับ",
    select_team: "เลือกทีมเพื่อเริ่มสุ่ม",
    boy_side: "BOY SIDE",
    girl_side: "GIRL SIDE",
    form_title: "ลงทะเบียน",
    form_label: "ชื่อเล่น / Account X",
    start_btn: "Start Gacha ✨",
    cancel_btn: "Cancel",
    loading_texts: ['กำลังเชื่อมต่อ...', 'เช็คสิทธิ์การเล่น...', 'กำลังห่อของขวัญ...', 'เสร็จสิ้น...'],
    ssr_badge: "SSR",
    special_msg: "Special Message",
    save_btn: "SAVE",
    share_btn: "POST TO X",
    footer_thankyou: "ขอบคุณที่ร่วมสนุกกับกิจกรรม Fan Project ครับ (สิทธิ์ของคุณครบแล้ว)",
    alert_name_required: "⚠️ กรุณากรอกชื่อเล่น หรือ Account X",
    alert_played: "⚠️ คุณใช้สิทธิ์ร่วมกิจกรรมไปแล้ว",
    alert_closed: "⛔ กิจกรรมยังไม่เปิดให้ร่วมสนุก",
    share_alert_success: "✅ คัดลอกรูปแล้ว! กด Paste ใน X ได้เลย",
    share_alert_fail: "📸 อย่าลืมแนบรูปที่ Save ไว้ไปอวดเพื่อนๆ นะ!",
    share_text: "สุ่มกาชา Riser Concert ได้รูปสวยมาก! 🔮✨\n\nมาเล่นกันที่ Fan Project by @Jaiidees\n\n#RiserConcert #JaiideesGiveaway",
    chat_title: "แชทกับแอดมิน (Live Chat)",
    chat_placeholder: "พิมพ์ข้อความ...",
    chat_contact: "ชื่อของคุณ",
    chat_send: "ส่ง",
    chat_admin_name: "Admin @Jaiidees"
  },
  en: {
    subtitle: "Fan Project by @Jaiidees",
    special_giveaway: "Special Giveaway",
    banner_title: "Special Event! Home Delivery Rewards",
    banner_desc: "Just enter your Nickname/X Account for a chance to win special rewards from @jaiidees",
    banner_date: "Winner Announcement: Feb 28, 2026",
    rules_title: "Terms & Conditions",
    rule_1: "Limited to 1 person / 1 time only (IP Check).",
    rule_2: "Players can choose their preferred Card Type before starting.",
    rule_3: "Rewards are Exclusive Wallpapers and AI-generated blessings.",
    rule_4: "This is a Fan Project for entertainment purposes only. Free of charge.",
    rule_5: "Images received are copyrighted. Do not sell.",
    example_text: "Example Reward",
    select_team: "Select Team to Start",
    boy_side: "BOY SIDE",
    girl_side: "GIRL SIDE",
    form_title: "Registration",
    form_label: "Nickname / X Account",
    start_btn: "Start Gacha ✨",
    cancel_btn: "Cancel",
    loading_texts: ['Connecting...', 'Checking Quota...', 'Generating Gift...', 'Finalizing...'],
    ssr_badge: "SSR",
    special_msg: "Special Message",
    save_btn: "SAVE",
    share_btn: "POST TO X",
    footer_thankyou: "Thank you for joining our Fan Project! (Quota reached)",
    alert_name_required: "⚠️ Please enter your Nickname",
    alert_played: "⚠️ You have already played.",
    alert_closed: "⛔ The event has not started yet.",
    share_alert_success: "✅ Image copied! Paste it on X.",
    share_alert_fail: "📸 Don't forget to attach your saved image!",
    share_text: "Got this amazing wallpaper from Riser Concert Gacha! 🔮✨\n\nPlay now at Fan Project by @Jaiidees\n\n#RiserConcert #JaiideesGiveaway",
    chat_title: "Chat with Admin",
    chat_placeholder: "Type a message...",
    chat_contact: "Your Name",
    chat_send: "Send",
    chat_admin_name: "Admin"
  }
}

function App() {
  // --- ROUTING LOGIC ---
  let path = window.location.pathname;
  if (path.endsWith('/') && path.length > 1) path = path.slice(0, -1);
  try { path = decodeURIComponent(path); } catch (e) {}

  if (path === '/@jaiidees_only') return <Admin />;
  if (path !== '/' && path !== '/index.html') return <NotFound />;

  // --- STATE ---
  const [lang, setLang] = useState('th')
  const t = TRANSLATIONS[lang]

  const [step, setStep] = useState('landing')
  const [formData, setFormData] = useState({ gender: '', name: '' })
  const [result, setResult] = useState(null)
  const [loadingText, setLoadingText] = useState('Initializing...')
  const [showExample, setShowExample] = useState(false)
  
  // --- CHAT STATE ---
  const [showChat, setShowChat] = useState(false)
  const [chatMsg, setChatMsg] = useState('')
  const [chatHistory, setChatHistory] = useState([])
  const [sessionId, setSessionId] = useState('')
  const chatEndRef = useRef(null)

  // Generate Session ID for Chat (Persistent)
  useEffect(() => {
    let sid = localStorage.getItem('chat_session_id')
    if (!sid) {
        sid = 'sess_' + Math.random().toString(36).substr(2, 9)
        localStorage.setItem('chat_session_id', sid)
    }
    setSessionId(sid)
  }, [])

  // Poll Chat History (Every 3s)
  useEffect(() => {
    if (!showChat) return;
    
    const fetchChat = async () => {
        try {
            const res = await fetch(`/api/chat/history/${sessionId}`)
            const data = await res.json()
            if (data.status === 'success') {
                setChatHistory(data.data)
            }
        } catch (e) {
            console.error("Polling error", e)
        }
    }
    
    // Initial fetch
    fetchChat()
    
    // Interval fetch
    const interval = setInterval(fetchChat, 3000)
    return () => clearInterval(interval)
  }, [showChat, sessionId])

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatHistory, showChat])

  // --- HANDLERS ---
  const toggleLang = () => setLang(prev => prev === 'th' ? 'en' : 'th')
  const handleStart = (gender) => { setFormData({ ...formData, gender }); setStep('form') }

  const handleSubmit = async () => {
    if (!formData.name || formData.name.trim() === '') {
      alert(t.alert_name_required); return;
    }

    setStep('animating')
    let i = 0
    const interval = setInterval(() => {
      setLoadingText(t.loading_texts[i])
      i = (i + 1) % t.loading_texts.length
    }, 800)

    try {
      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, lang: lang }) 
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
        alert(t.alert_played)
        setResult(data.data)
        setStep('result')
      } else if (data.status === 'closed') {
        alert(t.alert_closed)
        setStep('landing')
      } else {
        alert("Error, please try again.")
        setStep('landing')
      }
    } catch (err) {
      clearInterval(interval)
      alert("Server connection failed.")
      setStep('landing')
    }
  }

  const handleSendChat = async () => {
    if (!chatMsg.trim()) return;
    
    // Optimistic Update (Show immediately)
    const tempMsg = { sender: 'user', text: chatMsg, timestamp: new Date().toISOString() }
    setChatHistory([...chatHistory, tempMsg])
    const msgToSend = chatMsg
    setChatMsg('')

    try {
        await fetch('/api/chat/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                session_id: sessionId,
                message: msgToSend, 
                name: formData.name || "Fan" 
            })
        })
    } catch (e) {
        alert("Failed to send message")
    }
  }

  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;
    const interval = setInterval(function() {
      if (Date.now() > end) return clearInterval(interval);
      confetti({ startVelocity: 30, spread: 360, ticks: 60, zIndex: 0, particleCount: 50, origin: { x: Math.random(), y: Math.random() - 0.2 } });
    }, 250);
  }

  const handleShareTwitter = async () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(t.share_text)}&url=${encodeURIComponent(window.location.href)}`;
    if (result && result.image_url) {
        try {
            const response = await fetch(result.image_url);
            const blob = await response.blob();
            await navigator.clipboard.write([ new ClipboardItem({ [blob.type]: blob }) ]);
            alert(t.share_alert_success);
        } catch (e) {
            alert(t.share_alert_fail);
        }
    }
    window.open(url, '_blank');
  }

  return (
    <div className="min-h-screen font-sans flex flex-col relative overflow-hidden selection:bg-pink-500/30">
      
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-slate-50">
        <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-400/20 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute top-1/2 -right-20 w-80 h-80 bg-purple-400/20 rounded-full blur-[100px] animate-pulse-slow" style={{animationDelay: '1s'}}></div>
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-pink-400/20 rounded-full blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-white/50 shadow-sm">
        <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Logo" className="h-8 w-auto drop-shadow-md" />
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-[0.15em] text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-pink-600">
                RISER CONCERT
              </span>
              <span className="text-[8px] text-slate-500 uppercase tracking-widest">
                {t.subtitle}
              </span>
            </div>
          </div>
          <button onClick={toggleLang} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-full text-[10px] font-bold text-slate-600 border border-slate-200">
            <Globe size={12} /> {lang === 'th' ? 'EN' : 'TH'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto px-6 pt-24 pb-32 flex flex-col justify-center relative z-10 min-h-[100dvh]">
        
        {/* LANDING */}
        {step === 'landing' && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-blue-50 to-pink-50 border border-purple-100 text-purple-600 text-[10px] font-bold tracking-widest uppercase shadow-sm">
                <Sparkles size={12} className="text-pink-500" /><span>{t.special_giveaway}</span>
              </div>
              <h1 className="text-5xl font-black italic leading-tight text-slate-800 drop-shadow-sm">
                THE FIRST<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">RISE</span>
              </h1>
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm relative overflow-hidden">
               <div className="absolute -top-6 -right-6 w-16 h-16 bg-yellow-400/20 rounded-full blur-xl"></div>
               <div className="bg-amber-100 p-2 rounded-full text-amber-600 flex-shrink-0 z-10"><Gift size={20} /></div>
               <div className="text-left z-10">
                 <p className="text-xs font-bold text-amber-800 mb-0.5">{t.banner_title}</p>
                 <p className="text-[10px] text-amber-700 leading-relaxed opacity-90">{t.banner_desc} <br/><span className="font-bold underline decoration-amber-400/50">{t.banner_date}</span></p>
               </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-6 shadow-xl shadow-purple-100/50 relative overflow-hidden group hover:scale-[1.01] transition-transform duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Info size={18} className="text-purple-500" />{t.rules_title}</h2>
              <ul className="space-y-3">
                {[t.rule_1, t.rule_2, t.rule_3, t.rule_4, t.rule_5].map((rule, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-xs text-slate-600 font-medium leading-relaxed">
                        <CheckCircle2 size={16} className="text-pink-400 flex-shrink-0 mt-0.5" /><span>{rule}</span>
                    </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-center text-xs text-slate-400 uppercase tracking-widest font-bold">{t.example_text}</p>
              <div className="relative w-full aspect-video bg-slate-100 rounded-3xl overflow-hidden shadow-xl shadow-pink-100/50 border border-white group cursor-pointer" onClick={() => setShowExample(true)}>
                <img src="/jaiidees.png" alt="Example" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="bg-white/20 backdrop-blur-md p-3 rounded-full border border-white/30 text-white"><Maximize2 size={24} /></div>
                </div>
                <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold text-pink-600 shadow-sm">Example by @Jaiidees</div>
              </div>
            </div>

            <div className="space-y-3 pb-6">
               <p className="text-center text-xs text-slate-400 uppercase tracking-widest font-bold">{t.select_team}</p>
               <div className="grid grid-cols-2 gap-4">
                <button onClick={() => handleStart('male')} className="group relative h-36 rounded-3xl overflow-hidden bg-white shadow-lg shadow-blue-100 hover:shadow-blue-200 transition-all border border-white hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2"><span className="text-4xl drop-shadow-sm group-hover:scale-110 transition-transform">🤵</span><span className="text-xs font-bold tracking-widest text-slate-600 group-hover:text-white transition-colors">{t.boy_side}</span></div>
                </button>
                <button onClick={() => handleStart('female')} className="group relative h-36 rounded-3xl overflow-hidden bg-white shadow-lg shadow-pink-100 hover:shadow-pink-200 transition-all border border-white hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-rose-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative z-10 h-full flex flex-col items-center justify-center gap-2"><span className="text-4xl drop-shadow-sm group-hover:scale-110 transition-transform">💃</span><span className="text-xs font-bold tracking-widest text-slate-600 group-hover:text-white transition-colors">{t.girl_side}</span></div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FORM */}
        {step === 'form' && (
          <div className="animate-zoom-in relative">
            <div className="bg-white/80 backdrop-blur-xl border border-white rounded-3xl p-8 shadow-2xl shadow-purple-100/50">
              <h2 className="text-xl font-bold text-center mb-6 text-slate-800">{t.form_title}</h2>
              <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-xs text-slate-500 ml-1 flex items-center gap-1 font-bold"><User size={12} /> {t.form_label} <span className="text-red-500">*</span></label>
                    <input type="text" placeholder="@riser_fan" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-sm focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all" onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <button onClick={handleSubmit} className="w-full py-4 rounded-xl font-bold text-white text-sm uppercase tracking-wide bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:brightness-110 transition-all shadow-lg shadow-purple-200 active:scale-95">{t.start_btn}</button>
                <button onClick={() => setStep('landing')} className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors">{t.cancel_btn}</button>
              </div>
            </div>
          </div>
        )}

        {/* ANIMATING */}
        {step === 'animating' && (
          <div className="flex flex-col items-center justify-center animate-fade-in">
            <div className="relative w-40 h-40 flex items-center justify-center mb-8">
                <div className="absolute inset-0 border-4 border-purple-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-transparent border-t-purple-500 border-r-pink-500 rounded-full animate-spin"></div>
                <div className="absolute inset-4 border-4 border-transparent border-l-blue-400 rounded-full animate-spin-slow"></div>
                <div className="text-6xl animate-float filter drop-shadow-md">🔮</div>
            </div>
            <p className="text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-pink-500 animate-pulse uppercase tracking-widest">{loadingText}</p>
          </div>
        )}

        {/* RESULT */}
        {step === 'result' && result && (
          <div className="animate-zoom-in space-y-5">
            <div className="bg-white border border-white rounded-3xl overflow-hidden shadow-2xl shadow-blue-100/50 relative group">
              <div className="relative w-full aspect-[9/16] bg-slate-100">
                <img src={result.image_url} alt="Result" className="w-full h-full object-cover" />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md border border-white shadow-sm px-3 py-1 rounded-full flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse"></span><span className="text-[10px] font-bold text-pink-600 tracking-wider">{t.ssr_badge}</span>
                </div>
              </div>
              <div className="p-6 bg-white relative">
                <div className="mb-6">
                    <div className="flex items-center gap-2 mb-2"><Heart size={12} className="text-pink-500" /><span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{t.special_msg}</span></div>
                    <p className="text-slate-700 text-sm font-medium italic leading-relaxed">"{result.blessing}"</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <a href={result.image_url} download target="_blank" className="flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700 transition-colors shadow-lg"><Download size={14} /> {t.save_btn}</a>
                    <button onClick={handleShareTwitter} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1D9BF0] border border-[#1D9BF0] text-white text-xs font-bold hover:brightness-110 transition-colors"><Twitter size={14} /> {t.share_btn}</button>
                </div>
              </div>
            </div>
            <div className="text-center pb-6"><p className="text-[10px] text-slate-400 opacity-80">{t.footer_thankyou}</p></div>
          </div>
        )}
      </main>

      {/* --- CHAT BUBBLE & WINDOW (NEW) --- */}
      <div className="fixed bottom-4 right-4 z-[60]">
        {!showChat ? (
          <button 
            onClick={() => setShowChat(true)}
            className="w-12 h-12 bg-gradient-to-tr from-pink-500 to-purple-500 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform"
          >
            <MessageCircle size={24} />
          </button>
        ) : (
            <div className="bg-white rounded-2xl shadow-2xl w-80 h-96 border border-slate-200 overflow-hidden flex flex-col animate-zoom-in">
                {/* Header */}
                <div className="bg-slate-100 p-3 border-b border-slate-200 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700">{t.chat_title}</span>
                    <button onClick={() => setShowChat(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                </div>
                
                {/* Messages List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50">
                    {chatHistory.map((msg, i) => (
                        <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-2 rounded-lg text-xs ${msg.sender === 'user' ? 'bg-pink-500 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>
                                {msg.sender === 'admin' && <div className="font-bold text-[10px] text-pink-600 mb-1">{t.chat_admin_name}</div>}
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    <div ref={chatEndRef}></div>
                </div>
                
                {/* Input Area */}
                <div className="p-2 border-t border-slate-200 bg-white flex gap-2">
                    <input 
                        type="text" 
                        placeholder={t.chat_placeholder} 
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-pink-400"
                        value={chatMsg}
                        onChange={(e) => setChatMsg(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                    />
                    <button onClick={handleSendChat} className="bg-pink-500 text-white p-2 rounded-lg hover:bg-pink-600 transition-colors">
                        <Send size={16} />
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* Example Modal */}
      {showExample && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowExample(false)}>
            <div className="relative w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/20" onClick={(e) => e.stopPropagation()}>
                <img src="/jaiidees.png" className="w-full h-full object-contain bg-black" />
                <button onClick={() => setShowExample(false)} className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-red-500 transition-colors"><X size={24} /></button>
            </div>
        </div>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 w-full py-4 bg-white/80 backdrop-blur border-t border-white/50 text-center z-50">
        <div className="flex flex-col items-center gap-1.5">
            <p className="text-[8px] text-slate-400 uppercase tracking-widest font-bold">Created by @Jaiidees • AI Generated Content</p>
            <a href="https://twitter.com/Jaiidees" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-blue-500 transition-colors bg-white/50 px-3 py-1 rounded-full border border-slate-200">Contact <span className="font-black text-slate-800">X</span> : @Jaiidees</a>
        </div>
      </footer>
    </div>
  )
}
export default App