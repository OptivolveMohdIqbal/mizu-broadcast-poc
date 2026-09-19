# Mizutech Multi-Speaker Broadcast POC

A minimal React/Vite POC for a PSIM operator to call multiple SIP speakers, conference the active lines, mute/unmute the operator microphone, and disconnect individual speakers.

## 1. Run immediately in mock mode

```bash
npm install
cp .env.example .env
npm run dev
```

`VITE_MIZU_MOCK=true` is the default, so no SIP server or WebPhone files are required to exercise the UI.

## 2. Speaker configuration

Edit `initialSpeakers` in `src/App.jsx`:

```js
const initialSpeakers = [
  { id: 'speaker-a', name: 'Speaker A', sipUser: '1001', state: SpeakerState.IDLE },
  { id: 'speaker-b', name: 'Speaker B', sipUser: '1002', state: SpeakerState.IDLE },
];
```

For this POC, the Hikvision speaker microphone/input should remain at volume 0, as already validated in your hardware test.

## 3. Connect the real Mizutech WebPhone

1. Put your Mizutech WebPhone package under `public/mizu/` while preserving any required package assets/directory structure.
2. Ensure `public/mizu/webphone_api.js` exists, or set `VITE_MIZU_SCRIPT` to the correct local path.
3. Change `.env`:

```env
VITE_MIZU_MOCK=false
VITE_MIZU_SERVER=YOUR_SERVER
VITE_MIZU_USERNAME=YOUR_OPERATOR_SIP_USER
VITE_MIZU_PASSWORD=YOUR_PASSWORD
```

4. Restart `npm run dev` after changing `.env`.

> Security: Vite `VITE_*` variables are delivered to the browser. They are appropriate for a local POC, not for protecting production SIP credentials. Production should use an appropriate provisioning/token approach supported by your Mizutech deployment.

## 4. Relevant WebPhone API flow

The real adapter in `src/services/mizuClient.js` uses the documented multiline pattern:

```js
webphone_api.call('1001');
webphone_api.call('1002');
webphone_api.setline(-2);
webphone_api.conference();
```

Per-endpoint disconnect:

```js
webphone_api.setline('1002');
webphone_api.hangup(true);
```

Operator microphone mute across active lines:

```js
webphone_api.setline(-2);
webphone_api.mute(true, 2);
```

The Mizutech documentation says `direction = 2` selects input/microphone muting.

## 5. One deliberate TODO

`onCallStateChange` argument shapes can differ across WebPhone package/version/engine combinations. The skeleton logs the raw callback event in `RealMizuClient.handleCallState()`.

During your first real test:

1. Open browser DevTools.
2. Call Speaker A and Speaker B.
3. Inspect `[Mizu onCallStateChange]` logs.
4. Map the peer SIP number/call ID/line number from that callback to the matching React speaker entry.

This avoids guessing the exact callback signature used by your particular WebPhone build.

## Project layout

```text
src/
  App.jsx
  styles.css
  components/
    SpeakerRow.jsx
  services/
    mizuClient.js
public/
  mizu/
    PLACE_WEBPHONE_FILES_HERE.txt
```
