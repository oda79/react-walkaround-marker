import { useState } from "react";
import { WalkaroundMarker, parseWalkaround, serializeWalkaround, type WalkaroundData, type WalkaroundMode } from "@oda79/react-walkaround-marker";
import vehicleImage from "./assets/hero.png";
import "./App.css";

export default function App() {
  const [value, setValue] = useState<WalkaroundData | null>(null);
  const [mode, setMode] = useState<WalkaroundMode>("draw");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(10);
  const [json, setJson] = useState("");
  const [error, setError] = useState("");

  const syncJson = (next: WalkaroundData) => {
    setValue(next);
    setJson(serializeWalkaround(next));
  };

  return (
    <main className="demo">
      <header><h1>Walkaround marker</h1><p>Draw directly on the image; saved points remain in source-image coordinates.</p></header>
      <section className="controls" aria-label="Drawing controls">
        <label>Mode <select value={mode} onChange={(event) => setMode(event.target.value as WalkaroundMode)}><option value="draw">Draw</option><option value="view">View</option></select></label>
        <label>Color <input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
        <label>Width <input type="number" min="1" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} /> px</label>
      </section>
      <WalkaroundMarker src={vehicleImage} value={value} onChange={syncJson} mode={mode} color={color} strokeWidth={strokeWidth} />
      <section className="json-panel">
        <label htmlFor="walkaround-json">Current JSON</label>
        <textarea id="walkaround-json" value={json} onChange={(event) => setJson(event.target.value)} rows={9} spellCheck={false} />
        <div>
          <button type="button" onClick={() => value && setJson(serializeWalkaround(value))}>Export current</button>
          <button type="button" onClick={() => {
            try { const restored = parseWalkaround(json); setValue(restored); setError(""); }
            catch (caught) { setError(caught instanceof Error ? caught.message : "Could not restore JSON."); }
          }}>Restore JSON</button>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
