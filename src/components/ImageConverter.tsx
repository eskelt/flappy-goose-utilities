import React, { useState } from 'react';

const LAG_WARNING_THRESHOLD = 2000;

export const ImageConverter: React.FC = () => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [jsonOutput, setJsonOutput] = useState<string>('');
  const [imageBitmap, setImageBitmap] = useState<ImageBitmap | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [blockCount, setBlockCount] = useState<number | null>(null);
  const [sValue, setSValue] = useState<number>(-0.1);
  const [warning, setWarning] = useState<string | null>(null);
  const [offsetX, setOffsetX] = useState<number>(200);
  const [offsetY, setOffsetY] = useState<number>(300);

  React.useEffect(() => {
    if (imageBitmap) {
      const pixelSpacing = Math.abs(4 * (sValue / -0.1));
      const totalHeight = imageBitmap.height * pixelSpacing;
      // Center vertically around y=300
      setOffsetY(Math.floor(300 - (totalHeight / 2)));
    }
  }, [imageBitmap, sValue]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setWarning(null);
    setBlockCount(null);
    setJsonOutput('');
    
    try {
      const bitmap = await createImageBitmap(file);
      setImageBitmap(bitmap);

      const { width, height } = bitmap;
      const totalBlocks = width * height;

      if (totalBlocks > LAG_WARNING_THRESHOLD) {
          setWarning(`Warning: This image will generate approximately ${totalBlocks} blocks. Levels with more than ${LAG_WARNING_THRESHOLD} blocks may cause lag.`);
      }
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
        const { width, height } = imageBitmap;
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            setIsGenerating(false);
            return;
        }

        ctx.drawImage(imageBitmap, 0, 0, width, height);
        const imgData = ctx.getImageData(0, 0, width, height).data;

        // Calculate pixel spacing based on sValue
        // Base reference: s = -0.1 corresponds to spacing = 4
        const pixelSpacing = Math.abs(4 * (sValue / -0.1));

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
                x: offsetX + (x * pixelSpacing),
                y: offsetY + (y * pixelSpacing),
                color: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
                s: sValue
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

      <div className="input-group" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <label htmlFor="s-value">Block Scale (s):</label>
          <input 
            id="s-value"
            type="number" 
            step="0.01" 
            value={sValue} 
            onChange={(e) => setSValue(parseFloat(e.target.value))}
            style={{ padding: '5px', borderRadius: '4px', border: '1px solid #444', background: '#1a1a1a', color: 'white', width: '80px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label htmlFor="offset-x">Start X:</label>
            <input 
              id="offset-x"
              type="number" 
              value={offsetX} 
              onChange={(e) => setOffsetX(parseFloat(e.target.value))}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #444', background: '#1a1a1a', color: 'white', width: '80px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <label htmlFor="offset-y">Start Y:</label>
            <input 
              id="offset-y"
              type="number" 
              value={offsetY} 
              onChange={(e) => setOffsetY(parseFloat(e.target.value))}
              style={{ padding: '5px', borderRadius: '4px', border: '1px solid #444', background: '#1a1a1a', color: 'white', width: '80px' }}
            />
          </div>
        </div>
      </div>
      
      {previewUrl && (
        <div className="preview">
          <img src={previewUrl} alt="Preview" style={{ maxWidth: '300px', display: 'block', margin: '1em 0' }} />
        </div>
      )}

      {warning && (
        <div style={{ 
          backgroundColor: 'rgba(255, 193, 7, 0.1)', 
          border: '1px solid #ffc107', 
          color: '#ffc107', 
          padding: '10px', 
          borderRadius: '4px', 
          marginBottom: '15px',
          fontSize: '0.9em'
        }}>
          {warning}
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
