import { useState } from 'react'
import './App.css'

function App() {
  const [step, setStep] = useState('landing') // landing, form, loading, result
  const [formData, setFormData] = useState({ gender: '', name: '' })
  const [result, setResult] = useState(null)

  const handleStart = (gender) => {
    setFormData({ ...formData, gender })
    setStep('form')
  }

  const handleSubmit = async () => {
    setStep('loading')
    
    try {
      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      const data = await res.json()
      
      // Delay เล็กน้อยให้ดูเหมือนกำลังสุ่ม
      setTimeout(() => {
        setResult(data.data)
        setStep('result')
      }, 2000)
      
    } catch (err) {
      alert("Error connecting to server")
      setStep('landing')
    }
  }

  return (
    <div className="container">
      <header>
        <h1>Riser Concert : The First Rise</h1>
      </header>

      {step === 'landing' && (
        <div className="card">
          <h2>เลือกเพศศิลปินที่คุณชื่นชอบ</h2>
          <button onClick={() => handleStart('male')}>Boy</button>
          <button onClick={() => handleStart('female')}>Girl</button>
        </div>
      )}

      {step === 'form' && (
        <div className="card">
          <h2>ใส่ชื่อของคุณ (Optional)</h2>
          <input 
            type="text" 
            placeholder="ชื่อเล่น / X Account" 
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <button onClick={handleSubmit}>สุ่มกาชา!</button>
        </div>
      )}

      {step === 'loading' && (
        <div className="card">
          <h2>กำลังเชื่อมต่อกับ Gemini AI...</h2>
          <div className="spinner">🔄</div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="card result-card">
          <img src={result.image_url} alt="Gacha Result" />
          <p className="blessing">"{result.blessing}"</p>
          <a href={result.image_url} download target="_blank">
            <button>Download Wallpaper</button>
          </a>
        </div>
      )}
      
      <footer>
        <p>AI Generated Image | For Riser Concert Event Only</p>
      </footer>
    </div>
  )
}

export default App