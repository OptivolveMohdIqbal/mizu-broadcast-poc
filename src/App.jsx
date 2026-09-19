import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { Mic, MicOff, RadioTower, Square, Pause } from "lucide-react";
import SpeakerRow from "./components/SpeakerRow";
import { createMizuClient, CallState } from "./services/mizuClient";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const initialSpeakers = [
  {
    id: "EP_SFTPHN_USER_1",
    name: "EP_SFTPHN_USER_1",
    sipUser: "EP_SFTPHN_USER_1",
    state: CallState.IDLE,
  },
  {
    id: "EP_SFTPHN_USER_2",
    name: "EP_SFTPHN_USER_2",
    sipUser: "EP_SFTPHN_USER_2",
    state: CallState.IDLE,
  },
  // {
  //   id: "EP_IPSPKR_WSS_1",
  //   name: "EP_IPSPKR_WSS_1",
  //   sipUser: "EP_IPSPKR_WSS_1",
  //   state: CallState.IDLE,
  // },
  // {
  //   id: "EP_IPSPKR_WSS_2",
  //   name: "EP_IPSPKR_WSS_2",
  //   sipUser: "EP_IPSPKR_WSS_2",
  //   state: CallState.IDLE,
  // },
];

export default function App() {
  const [speakers, setSpeakers] = useState(initialSpeakers);
  const [appState, setAppState] = useState("loading");
  const [registration, setRegistration] = useState("initializing");
  const [micMuted, setMicMuted] = useState(false);
  const [holdLine, setHoldLine] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [error, setError] = useState("");
  const clientRef = useRef(null);

  const updateSpeaker = (id, state) => {
    setSpeakers((current) =>
      current.map((s) => (s.id === id ? { ...s, state } : s)),
    );

    if (speakers.filter((s) => s.state === CallState.CONNECTED).length === 0) {
      console.debug(
        `[${dayjs().format("YYYY-MM-DD_HH:mm:ss.SSS")}] - [App.js] Update broadcasting status.`,
      );
      setBroadcasting(false);
    }

    console.debug(
      `[${dayjs().format("YYYY-MM-DD_HH:mm:ss.SSS")}] - [App.js] Update speaker.`,
    );
  };

  const checkConnectedSpeaker = (id, state) => {
    console.debug(
      `[${dayjs().format("YYYY-MM-DD_HH:mm:ss.SSS")}] - [App.js] Check connected speaker.`,
    );
    if (speakers.filter((s) => s.state === CallState.IDLE).length === 0) {
      console.debug(
        `[${dayjs().format("YYYY-MM-DD_HH:mm:ss.SSS")}] - [App.js] Auto mute all connected speakers.`,
      );

      muteAllSpeaker();
    }
  };

  useEffect(() => {
    const client = createMizuClient(
      {
        onAppStateChange: setAppState,
        onRegistrationChange: setRegistration,
        onCallStateChange: updateSpeaker,
        onRawCallState: checkConnectedSpeaker,
        onMicChange: setMicMuted,
        onHoldChange: setHoldLine,
      },
      initialSpeakers,
    );

    clientRef.current = client;

    client.initialize().catch((e) => {
      console.error(e);
      setError(e.message || String(e));
      setAppState("error");
    });
  }, []);

  const connectedCount = useMemo(
    () => speakers.filter((s) => s.state === CallState.CONNECTED).length,
    [speakers],
  );

  async function addSpeaker(speaker) {
    setError("");
    try {
      await clientRef.current.callSpeaker(speaker);
    } catch (e) {
      updateSpeaker(speaker.id, CallState.ERROR);
      setError(e.message || String(e));
    }
  }

  async function disconnectSpeaker(speaker) {
    setError("");
    try {
      await clientRef.current.disconnectSpeaker(speaker);
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  async function startBroadcast() {
    setError("");
    try {
      const idle = speakers.filter((s) => s.state === CallState.IDLE);
      for (const speaker of idle) {
        await clientRef.current.callSpeaker(speaker);
      }
      // await clientRef.current.conferenceAll();
      // await clientRef.current.setMicMuted(false);
      setBroadcasting(true);
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  async function stopBroadcast() {
    setError("");
    try {
      // await clientRef.current.stopAll();
      // setSpeakers((current) =>
      //   current.map((s) => ({ ...s, state: CallState.IDLE })),
      // );
      const connected = speakers.filter((s) => s.state === CallState.CONNECTED);
      for (const speaker of connected) {
        await clientRef.current.disconnectSpeaker(speaker);
      }
      setBroadcasting(false);
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  async function muteAllSpeaker() {
    setError("");

    await delay(5000);

    try {
      const idle = speakers.filter((s) => s.state === CallState.IDLE);

      if (idle.length === 0) {
        await clientRef.current.conferenceAll();
        await clientRef.current.setAllEndUsersMuted(
          true,
          speakers.filter((s) => s.state === CallState.CONNECTED),
        );
      }
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  async function holdAllSpeaker() {
    setError("");
    try {
      const idle = speakers.filter((s) => s.state === CallState.IDLE);
      if (idle.length === 0) {
        await clientRef.current.conferenceAll();
        await clientRef.current.setHoldLine(true);
      }
    } catch (e) {
      setError(e.message || String(e));
    }
  }

  // async function toggleMic() {
  //   try {
  //     await clientRef.current.setMicMuted(!micMuted);
  //   } catch (e) {
  //     setError(e.message || String(e));
  //   }
  // }

  const ready = appState === "loaded" || appState === "started";

  return (
    <main className="page-shell">
      <section className="broadcast-card">
        <header className="topbar">
          <div>
            <p className="eyebrow">PSIM POC</p>
            <h1>Live Speaker Broadcast</h1>
            <p className="subtitle">
              One operator microphone to multiple SIP paging speakers.
            </p>
          </div>
          <div className={`live-chip ${broadcasting ? "is-live" : ""}`}>
            <span className="live-dot" />{" "}
            {broadcasting ? "BROADCASTING" : "STANDBY"}
          </div>
        </header>

        <div className="summary-grid">
          <div className="summary-item">
            <span>WebPhone</span>
            <strong>{appState}</strong>
          </div>
          <div className="summary-item">
            <span>Registration</span>
            <strong>{registration}</strong>
          </div>
          <div className="summary-item">
            <span>Connected speakers</span>
            <strong>{connectedCount}</strong>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        <section className="speaker-panel">
          <div className="section-heading">
            <div>
              <h2>Broadcast endpoints</h2>
              <p>
                Each Hikvision endpoint is expected to have its microphone/input
                volume set to 0.
              </p>
            </div>
          </div>

          <div className="speaker-list">
            {speakers.map((speaker) => (
              <SpeakerRow
                key={speaker.id}
                speaker={speaker}
                disabled={!ready}
                onAdd={addSpeaker}
                onDisconnect={disconnectSpeaker}
              />
            ))}
          </div>
        </section>

        {/* <section className="operator-panel">
            <div className="mic-state">
              <div className={`mic-orb ${micMuted ? "muted" : ""}`}>
                {micMuted ? <MicOff size={25} /> : <Mic size={25} />}
              </div>
              <div>
                <div className="speaker-name">Operator microphone</div>
                <div className="speaker-user">
                  {micMuted ? "Muted" : "Live audio enabled"}
                </div>
              </div>
            </div>
            <button
              className="btn btn-secondary"
              disabled={!ready || !broadcasting}
              onClick={toggleMic}
            >
              {micMuted ? <Mic size={16} /> : <MicOff size={16} />}
              {micMuted ? "Unmute" : "Mute"}
            </button>
          </section> */}

        <footer className="actions">
          <button
            className="btn btn-primary btn-large"
            disabled={!ready || broadcasting}
            onClick={startBroadcast}
          >
            <RadioTower size={19} /> Start Broadcast
          </button>
          <button
            className="btn btn-danger btn-large"
            disabled={!broadcasting}
            onClick={stopBroadcast}
          >
            <Square size={17} /> Stop Broadcast
          </button>
          <button
            className="btn btn-secondary btn-large"
            disabled={!broadcasting}
            onClick={muteAllSpeaker}
          >
            <Mic size={17} /> Mute All
          </button>
          <button
            className="btn btn-secondary btn-large"
            disabled={!broadcasting}
            onClick={holdAllSpeaker}
          >
            <Pause size={17} /> Hold All
          </button>
        </footer>
      </section>
    </main>
  );
}
