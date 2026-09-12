import { useRef, useState } from "react";
import { WalkaroundMarker, parseWalkaround, serializeWalkaround, type WalkaroundData, type WalkaroundMarkerHandle, type WalkaroundMode } from "@oda79/react-walkaround-marker";
import vehicleImage from "./assets/vehicle.png";
import "./App.css";

type PendingDialog = {
  title: string;
  confirmLabel: string;
  confirm: () => void;
  cancel: () => void;
};

export default function App() {
  const [value, setValue] = useState<WalkaroundData | null>(null);
  const [mode, setMode] = useState<WalkaroundMode>("draw");
  const [color, setColor] = useState("#ef4444");
  const [strokeWidth, setStrokeWidth] = useState(10);
  const [json, setJson] = useState("");
  const [error, setError] = useState("");
  const [pendingDialog, setPendingDialog] = useState<PendingDialog | null>(null);
  const markerRef = useRef<WalkaroundMarkerHandle>(null);

  const syncJson = (next: WalkaroundData) => {
    setValue(next);
    setJson(serializeWalkaround(next));
  };

  return (
    <main className="demo">
      <header><h1>Walkaround marker</h1><p>Draw on the vehicle, switch to Remove to select a mark, then try Undo, Redo, and Clear.</p></header>
      <section className="controls" aria-label="Drawing controls">
        <label>Mode <select value={mode} onChange={(event) => setMode(event.target.value as WalkaroundMode)}><option value="draw">Draw</option><option value="delete">Remove</option><option value="view">View</option></select></label>
        <label>Color <input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label>
        <label>Width <input type="number" min="1" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} /> px</label>
        <button type="button" onClick={() => markerRef.current?.undo()}>Undo</button>
        <button type="button" onClick={() => markerRef.current?.redo()}>Redo</button>
        <button type="button" onClick={() => markerRef.current?.clear()} disabled={!value?.marks.length}>Clear</button>
      </section>
      <WalkaroundMarker ref={markerRef} src={vehicleImage} value={value} onChange={syncJson} mode={mode} color={color} strokeWidth={strokeWidth}
        onDeleteRequest={(mark, confirm, cancel) => setPendingDialog({ title: `Remove mark ${mark.id}?`, confirmLabel: "Remove", confirm, cancel })}
        onClearRequest={(confirm, cancel) => setPendingDialog({ title: "Clear all marks?", confirmLabel: "Clear", confirm, cancel })} />
      {pendingDialog && <div className="dialog-backdrop" role="presentation">
        <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <h2 id="confirm-title">{pendingDialog.title}</h2>
          <div>
            <button type="button" onClick={() => { pendingDialog.cancel(); setPendingDialog(null); }}>Cancel</button>
            <button type="button" className="danger" onClick={() => { pendingDialog.confirm(); setPendingDialog(null); }}>{pendingDialog.confirmLabel}</button>
          </div>
        </section>
      </div>}
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
