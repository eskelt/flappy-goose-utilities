import React, { useState } from 'react';
import { Midi } from '@tonejs/midi';

interface MusicBlock {
  type: 'musicBlock';
  x: number;
  y: number;
  musicalNote: string;
  instrumentType: string;
  bF: number;
  s: number;
}

const BASE_QUARTER_NOTE_BF = 5.94;
const BASE_QUARTER_NOTE_SPACING = 63.44;

export const MidiConverter: React.FC = () => {
  const [midiData, setMidiData] = useState<Midi | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [jsonOutput, setJsonOutput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration
  const [instrumentType, setInstrumentType] = useState('piano');
  const [startX, setStartX] = useState(191);
  const [startY, setStartY] = useState(331);
  const [trackIndex, setTrackIndex] = useState<number>(-1); // -1 means auto-select (most notes)
  const [baseBf, setBaseBf] = useState(BASE_QUARTER_NOTE_BF);
  const [baseSpacing, setBaseSpacing] = useState(BASE_QUARTER_NOTE_SPACING);
  const [blockScale, setBlockScale] = useState(0.5);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setJsonOutput('');
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const midi = new Midi(arrayBuffer);
      setMidiData(midi);
      
      // Auto-select track with most notes
      let maxNotes = 0;
      let bestTrack = 0;
      midi.tracks.forEach((track, index) => {
        if (track.notes.length > maxNotes) {
          maxNotes = track.notes.length;
          bestTrack = index;
        }
      });
      setTrackIndex(bestTrack);
      
    } catch (err) {
      console.error("Error parsing MIDI:", err);
      setError("Failed to parse MIDI file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const generateLevel = () => {
    if (!midiData) return;

    const track = midiData.tracks[trackIndex];
    if (!track || track.notes.length === 0) {
      setError("Selected track has no notes.");
      return;
    }

    // Sort notes by time just in case
    const sortedNotes = [...track.notes].sort((a, b) => a.time - b.time);

    // Filter for monophonic melody (remove overlaps/chords)
    // We keep the highest pitch note if they start at the same time (melody usually on top)
    const melodyNotes: typeof sortedNotes = [];
    
    // Group by start time (approximate)
    const notesByTime = new Map<string, typeof sortedNotes>();
    
    sortedNotes.forEach(note => {
      const timeKey = note.time.toFixed(3); // Group within 1ms
      if (!notesByTime.has(timeKey)) {
        notesByTime.set(timeKey, []);
      }
      notesByTime.get(timeKey)?.push(note);
    });

    // Select one note per time slot
    const uniqueTimes = Array.from(notesByTime.keys()).sort((a, b) => parseFloat(a) - parseFloat(b));
    
    uniqueTimes.forEach(timeKey => {
      const notes = notesByTime.get(timeKey)!;
      // Pick highest pitch
      const bestNote = notes.reduce((prev, current) => (current.midi > prev.midi ? current : prev));
      melodyNotes.push(bestNote);
    });

    // Calculate blocks
    const blocks: MusicBlock[] = [];
    let currentX = startX;
    
    // Get BPM for timing calculations
    // Use the first tempo marking or default to 120
    const bpm = midiData.header.tempos[0]?.bpm || 120;
    const secondsPerQuarter = 60 / bpm;

    for (let i = 0; i < melodyNotes.length; i++) {
      const note = melodyNotes[i];
      const nextNote = melodyNotes[i + 1];
      
      // Calculate duration to next note (or use note duration if last)
      // For auto-levels, the spacing depends on when the NEXT note happens
      let durationToNext = 0;
      
      if (nextNote) {
        durationToNext = nextNote.time - note.time;
      } else {
        // Last note: use its own duration or a default
        durationToNext = note.duration; 
      }

      // Calculate ratio based on quarter note
      const ratio = durationToNext / secondsPerQuarter;
      
      // Calculate physics values
      // bF determines how high/long the jump is to reach the next block
      const bF = parseFloat((baseBf * ratio).toFixed(2));
      
      // Spacing to next block
      // Note: The X position of the CURRENT block is known. 
      // The spacing determines where the NEXT block will be.
      // But we are generating the current block here.
      
      blocks.push({
        type: 'musicBlock',
        x: parseFloat(currentX.toFixed(2)),
        y: startY, // Constant Y for now as discussed
        musicalNote: note.name,
        instrumentType: instrumentType,
        bF: bF,
        s: blockScale
      });

      // Update X for the next block
      currentX += baseSpacing * ratio;
    }

    (blocks as any[]).push({
      type: "tinyMushroom",
      x: 114,
      y: 298,
      sF: 1
    });

    const levelData = {
      "name": fileName ? fileName.replace(/\.[^/.]+$/, "") : "My Custom Level",
      "description": "Generated from MIDI",
      "version": 1.702,
      "scrollSpeed": 2.4,
      "gravity": 0.4,
      "antigravity": false,
      "yTrack": true,
      "gradientTopColor": "#009dff",
      "gradientBottomColor": "#c2ccff",
      "disableBackgroundMusic": false,
      "midiConfig": {
        "restartOnDeath": false,
        "volume": 100
      },
      "birdStartX": 100,
      "birdStartY": 300,
      "pipes": [],
      "bullets": [],
      "bulletTriggers": [],
      "layers": {
        "currentLayer": 1,
        "maxLayers": 3
      },
      "genericObjects": blocks,
      "finishLineX": Math.ceil(currentX + 200),
      "completionRequirement": {
        "type": "crossFinishLine"
      }
    };

    setJsonOutput(JSON.stringify(levelData, null, 2));
  };


  const copyToClipboard = async () => {
    if (!jsonOutput) return;
    try {
      await navigator.clipboard.writeText(jsonOutput);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard');
    }
  };

  const downloadJson = () => {
    if (!jsonOutput) return;
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName ? `${fileName.replace(/\.[^/.]+$/, "")}.json` : 'level.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', textAlign: 'center' }}>
      <h2>Midi to Level Converter</h2>
      
      <div style={{ marginBottom: '20px', padding: '20px', border: '2px dashed #444', borderRadius: '8px' }}>
        <input 
          type="file" 
          accept=".mid,.midi" 
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="midi-file-input"
        />
        <label 
          htmlFor="midi-file-input" 
          style={{ 
            cursor: 'pointer', 
            padding: '10px 20px', 
            background: '#646cff', 
            color: 'white', 
            borderRadius: '4px',
            display: 'inline-block'
          }}
        >
          Choose MIDI File
        </label>
        {fileName && <p style={{ marginTop: '10px' }}>Selected: {fileName}</p>}
      </div>

      {error && (
        <div style={{ 
          backgroundColor: 'rgba(244, 67, 54, 0.1)', 
          border: '1px solid #f44336', 
          color: '#f44336', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '15px'
        }}>
          {error}
        </div>
      )}

      {midiData && (
        <div style={{ marginBottom: '20px', textAlign: 'left', background: '#1a1a1a', padding: '15px', borderRadius: '8px' }}>
          <h3>Midi Info</h3>
          <p><strong>Name:</strong> {midiData.name || 'Untitled'}</p>
          <p><strong>Duration:</strong> {midiData.duration.toFixed(2)}s</p>
          <p><strong>Tracks:</strong> {midiData.tracks.length}</p>
          <p><strong>BPM:</strong> {midiData.header.tempos[0]?.bpm.toFixed(0) || '120 (Default)'}</p>
          
          <div style={{ marginTop: '15px', borderTop: '1px solid #444', paddingTop: '15px' }}>
            <h4>Configuration</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Instrument:</label>
                <input 
                  type="text" 
                  value={instrumentType} 
                  onChange={(e) => setInstrumentType(e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Track:</label>
                <select 
                  value={trackIndex} 
                  onChange={(e) => setTrackIndex(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                >
                  {midiData.tracks.map((t, i) => (
                    <option key={i} value={i}>
                      Track {i} ({t.notes.length} notes, {t.instrument.name || 'Unknown'})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Start X:</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={startX} 
                  onChange={(e) => setStartX(parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Start Y:</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={startY} 
                  onChange={(e) => setStartY(parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Base Bounce Force (bF):</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={baseBf} 
                  onChange={(e) => setBaseBf(parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Base Spacing (X):</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={baseSpacing} 
                  onChange={(e) => setBaseSpacing(parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Block Scale (s):</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={blockScale} 
                  onChange={(e) => setBlockScale(parseFloat(e.target.value))}
                  style={{ width: '100%', padding: '8px', background: '#333', border: '1px solid #555', color: 'white', borderRadius: '4px' }}
                />
              </div>
            </div>
            
            <button 
              onClick={generateLevel}
              style={{ 
                marginTop: '20px', 
                width: '100%', 
                padding: '12px', 
                background: '#646cff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px', 
                fontSize: '16px', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Generate Level JSON
            </button>
          </div>
        </div>
      )}

      {jsonOutput && (
        <>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '10px' }}>
            <button 
              onClick={copyToClipboard}
              style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Copy JSON
            </button>
            <button 
              onClick={downloadJson}
              style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' }}
            >
              Download JSON
            </button>
          </div>

          <textarea 
            value={jsonOutput} 
            readOnly 
            placeholder="JSON output will appear here..." 
            style={{ width: '100%', height: '300px', background: '#1a1a1a', color: '#eee', padding: '10px', borderRadius: '4px', border: '1px solid #444' }}
          />
        </>
      )}
    </div>
  );
};
