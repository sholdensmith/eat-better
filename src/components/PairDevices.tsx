import QRCode from 'qrcode.react';
import { getOrCreateSyncKey } from '../lib/storage';

export default function PairDevices() {
  const key = getOrCreateSyncKey();
  const link = `${window.location.origin}/#k=${encodeURIComponent(key)}`;
  return (
    <div className="p-4 border rounded-md bg-white">
      <div className="font-medium mb-2">Pair Devices</div>
      <div className="flex items-center gap-4">
        <QRCode value={link} size={128} />
        <div className="text-sm">
          <div>Scan this QR from another device to pair.</div>
          <p className="mt-2 text-gray-600">
            This shares a private pairing key via URL hash (<code>#k=...</code>),
            so it never hits your server logs. The app stores it in localStorage and
            removes the hash, then all requests include an <code>X-Sync-Key</code> header.
            No account or login needed.
          </p>
          <div className="mt-2 break-all text-gray-600 text-xs">{link}</div>
          <button
            className="mt-2 px-2 py-1 border rounded text-sm"
            onClick={() => navigator.clipboard.writeText(link)}
          >Copy link</button>
        </div>
      </div>
    </div>
  );
}
