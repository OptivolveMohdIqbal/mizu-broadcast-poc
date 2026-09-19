import { PhoneCall, PhoneOff, Radio } from "lucide-react";

export default function SpeakerRow({ speaker, disabled, onAdd, onDisconnect }) {
  const isConnected = speaker.state === "Connected";
  const isBusy =
    speaker.state === "Calling" || speaker.state === "Disconnecting";

  return (
    <div className="speaker-row">
      <div className="speaker-icon">
        <Radio size={19} />
      </div>
      <div className="speaker-info">
        <div className="speaker-name">{speaker.name}</div>
        <div className="speaker-user">SIP {speaker.sipUser}</div>
      </div>
      <span className={`status status-${speaker.state.toLowerCase()}`}>
        {speaker.state}
      </span>
      {isConnected ? (
        <button
          className="btn btn-danger"
          disabled={disabled || isBusy}
          onClick={() => onDisconnect(speaker)}
        >
          <PhoneOff size={16} /> Disconnect
        </button>
      ) : (
        <button
          className="btn btn-secondary"
          disabled={disabled || isBusy}
          onClick={() => onAdd(speaker)}
        >
          <PhoneCall size={16} /> {isBusy ? speaker.state : "Add"}
        </button>
      )}
    </div>
  );
}
