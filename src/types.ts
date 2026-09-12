export type WalkaroundPoint = {
  x: number;
  y: number;
};

export type WalkaroundMark = {
  id: string;
  points: WalkaroundPoint[];
  color: string;
  width: number;
  metadata?: Record<string, unknown>;
};

export type WalkaroundData = {
  version: 1;
  imageWidth: number;
  imageHeight: number;
  marks: WalkaroundMark[];
};

export type WalkaroundMode = "draw" | "delete" | "view";