# Walkaround marker demo

From the repository root, install dependencies and start the demo:

```bash
pnpm install
pnpm --filter demo dev
```

Open `http://<your-computer's-LAN-IP>:5173/` from another device on the same network, or use the local URL printed by Vite on this computer. Vite listens on all network interfaces; if another device cannot connect, allow inbound TCP port 5173 in the computer's firewall. The demo builds the workspace package before starting, so it also works when `dist/` is absent. It uses the package through its `workspace:*` dependency.

Draw on the vehicle image, switch to **Remove** and tap a mark to see its selection highlight and confirmation dialog, then try **Undo**, **Redo**, and **Clear**. The JSON panel shows the saved natural-image coordinates and lets you export or restore a document.

If you edit package source while the demo is running, restart the demo to rebuild the package. To check a production build, run `pnpm --filter demo build` from the repository root.
