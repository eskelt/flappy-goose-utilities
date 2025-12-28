import { useState } from 'react'
import './App.css'
import { ImageConverter } from './components/ImageConverter'
import { MidiConverter } from './components/MidiConverter'

function App() {
  const [mode, setMode] = useState<'image' | 'midi'>('image');

  return (
    <div className="app-container">
      <h1>Level Generator</h1>
      
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
        <button 
          onClick={() => setMode('image')}
          style={{ 
            backgroundColor: mode === 'image' ? '#646cff' : '#333',
            color: 'white'
          }}
        >
          Image to Level
        </button>
        <button 
          onClick={() => setMode('midi')}
          style={{ 
            backgroundColor: mode === 'midi' ? '#646cff' : '#333',
            color: 'white'
          }}
        >
          Midi to Level
        </button>
      </div>

      {mode === 'image' ? <ImageConverter /> : <MidiConverter />}
    </div>
  )
}

export default App
