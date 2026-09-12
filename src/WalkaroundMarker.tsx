import type { WalkaroundData, WalkaroundMode } from "./types";

export type WalkaroundMarkerProps = {
  src: string;
  value: WalkaroundData | null;
  onChange?: (data: WalkaroundData) => void;

  mode?: WalkaroundMode;
  color?: string;
  strokeWidth?: number;

  className?: string;
  disabled?: boolean;
};

export function WalkaroundMarker({
  src,
  className
}: WalkaroundMarkerProps) {
  return (
    <div className={className}>
      <img src={src} alt="" />
    </div>
  );
}