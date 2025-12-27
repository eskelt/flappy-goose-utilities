import React, { useState } from 'react';

const MAX_BLOCKS = 2000;
const PIXEL_SPACING = 5;

export const ImageConverter: React.FC = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [jsonOutput, setJsonOutput] = useState<string>('');
  const [imageBitmap, setImageBitmap] = useState<ImageBitmap | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [blockCount, setBlockCount] = useState<number | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    
    try {
      const bitmap = await createImageBitmap(file);
      setImageBitmap(bitmap);
    } catch (error) {
      console.error("Error creating image bitmap:", error);
    }
  };

  const generateJson = () => {
    if (!imageBitmap) return;
    setIsGenerating(true);

    // Use setTimeout to allow UI to update
    setTimeout(() => {
        const canvas = document.createElement('canvas');
        let { width, height } = imageBitmap;
        let scale = 1;
        
        if (width > MAX_BLOCKS || height > MAX_BLOCKS) {
            scale = Math.min(MAX_BLOCKS / width, MAX_BLOCKS / height);
            width = Math.floor(width * scale);
            height = Math.floor(height * scale);
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setIsGenerating(false);
            return;
        }

        ctx.drawImage(imageBitmap, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height).data;

        const genericObjects = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = imgData[idx];
            const g = imgData[idx + 1];
            const b = imgData[idx + 2];
            const a = imgData[idx + 3];
            
            if (a === 0) continue;
            
            genericObjects.push({
                type: 'colorBlock',
                x: x * PIXEL_SPACING,
                y: y * PIXEL_SPACING,
                color: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
                s: -0.1
            });
            }
        }

        const level = {
            name: 'My Custom Level',
            description: '',
            version: 1.702,
            scrollSpeed: 2.4,
            gravity: 0.4,
            antigravity: false,
            yTrack: false,
            gradientTopColor: '#009dff',
            gradientBottomColor: '#c2ccff',
            disableBackgroundMusic: false,
            midiConfig: {
            restartOnDeath: false,
            volume: 100
            },
            birdStartX: 100,
            birdStartY: 300,
            pipes: [],
            bullets: [],
            bulletTriggers: [],
            layers: {
            currentLayer: 1,
            maxLayers: 3
            },
            genericObjects,
            finishLineX: 1559,
            completionRequirement: {
            type: 'crossFinishLine'
            },
            propelFlap: false,
            propelFlapForceX: 8,
            propelFlapForceY: -8,
            floor: false
        };

        const jsonStr = JSON.stringify(level, null, 2);
        setJsonOutput(jsonStr);
        setBlockCount(genericObjects.length);
        
        setIsGenerating(false);
    }, 100);
  };

  const downloadJson = () => {
    if (!jsonOutput) return;
    const blob = new Blob([jsonOutput], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'level.json';
    a.click();
  };

  const copyToClipboard = () => {
    if (!jsonOutput) return;
    navigator.clipboard.writeText(jsonOutput).then(() => {
        // Optional: Show a toast or small notification
    }).catch(err => {
        console.error('Failed to copy: ', err);
    });
  };

  return (
    <div className="converter-container">
      <h2>Convert Image to Json level</h2>
      <div className="input-group">
        <input type="file" accept="image/*" onChange={handleFileChange} />
      </div>
      
      {previewUrl && (
        <div className="preview">
          <img src={previewUrl} alt="Preview" style={{ maxWidth: '300px', display: 'block', margin: '1em 0' }} />
        </div>
      )}

      <button 
        onClick={generateJson} 
        disabled={!imageBitmap || isGenerating}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
      >
        {isGenerating ? 'Generating...' : 'Generate JSON'}
      </button>

      {blockCount !== null && (
        <p style={{ margin: '10px 0', color: '#aaa' }}>Generated {blockCount} blocks</p>
      )}

      {jsonOutput && (
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', justifyContent: 'center' }}>
          <button 
            onClick={copyToClipboard}
            style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', backgroundColor: '#4CAF50' }}
          >
            Copy to Clipboard
          </button>
          <button 
            onClick={downloadJson}
            style={{ padding: '8px 16px', fontSize: '14px', cursor: 'pointer', backgroundColor: '#2196F3' }}
          >
            Download JSON
          </button>
        </div>
      )}

      <div className="output-area" style={{ marginTop: '20px' }}>
        <textarea 
            value={jsonOutput} 
            readOnly 
            placeholder="JSON will appear here..." 
            style={{ width: '100%', height: '200px' }}
        />
      </div>
    </div>
  );
};
