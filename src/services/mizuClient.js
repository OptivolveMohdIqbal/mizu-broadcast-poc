import dayjs from "dayjs";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const CallState = Object.freeze({
  IDLE: "Idle",
  CALLING: "Calling",
  CONNECTED: "Connected",
  DISCONNECTING: "Disconnecting",
  DISCONNECTED: "Disconnected",
  ERROR: "Error",
});

class MockMizuClient {
  constructor(callbacks = {}) {
    this.callbacks = callbacks;
    this.connected = new Map();
    this.micMuted = false;
  }

  async initialize() {
    await delay(350);
    this.callbacks.onAppStateChange?.("loaded");
    this.callbacks.onRegistrationChange?.("registered");
  }

  async callSpeaker(speaker) {
    this.callbacks.onCallStateChange?.(speaker.id, CallState.CALLING);
    await delay(700);
    this.connected.set(speaker.id, speaker);
    this.callbacks.onCallStateChange?.(speaker.id, CallState.CONNECTED);
  }

  async disconnectSpeaker(speaker) {
    this.callbacks.onCallStateChange?.(speaker.id, CallState.DISCONNECTING);
    await delay(350);
    this.connected.delete(speaker.id);
    this.callbacks.onCallStateChange?.(speaker.id, CallState.IDLE);
  }

  async conferenceAll() {
    await delay(250);
  }

  async setMicMuted(muted) {
    this.micMuted = muted;
    this.callbacks.onMicChange?.(muted);
  }

  async stopAll() {
    const speakers = [...this.connected.values()];
    await Promise.all(
      speakers.map((speaker) => this.disconnectSpeaker(speaker)),
    );
  }
}

class RealMizuClient {
  constructor(callbacks = {}, endusers) {
    this.callbacks = callbacks;
    this.allEndusers = endusers;
    this.connected = new Map();
    this.micMuted = false;
    this.api = null;
  }

  async initialize() {
    await loadScript(
      import.meta.env.VITE_MIZU_SCRIPT || "/mizu/webphone_api.js",
    );

    this.api = window.webphone_api;
    if (!this.api) {
      throw new Error(
        "webphone_api was not found on window. Check public/mizu/webphone_api.js.",
      );
    }

    // Mizutech requires API calls only after its "loaded" app-state callback.
    const loaded = new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          reject(new Error("Timed out waiting for Mizutech WebPhone to load.")),
        15000,
      );

      this.api.onAppStateChange((state) => {
        this.callbacks.onAppStateChange?.(state);
        if (String(state).toLowerCase() === "loaded") {
          clearTimeout(timeout);
          resolve();
        }
      });

      this.api.onRegStateChange((state) => {
        this.callbacks.onRegistrationChange?.(state);
      });
    });

    // Keep this adapter deliberately small: wire your package's exact callback signature here.
    if (typeof this.api.onCallStateChange === "function") {
      console.debug(`onCallStateChange - register`);
      this.api.onCallStateChange(
        (event, direction, peername, peerdisplayname, line, callid) =>
          this.handleCallStateChange(
            event,
            direction,
            peername,
            peerdisplayname,
            line,
            callid,
          ),
      );
    }

    await loaded;

    const server = import.meta.env.VITE_MIZU_SERVER;
    const username = import.meta.env.VITE_MIZU_USERNAME;
    const password = import.meta.env.VITE_MIZU_PASSWORD;

    if (server) this.api.setparameter("serveraddress", server);
    if (username) this.api.setparameter("username", username);
    if (password) this.api.setparameter("password", password);

    // Helpful multi-line defaults recommended by Mizutech docs for simultaneous calls.
    this.api.setparameter("usecommdevice", "0");
    this.api.setparameter("aec", "0");
    this.api.setparameter("aec2", "0");
    this.api.setparameter("agc", "0");
    this.api.setparameter("holdtype", "2");

    if (typeof this.api.start === "function") this.api.start();
    if (typeof this.api.register === "function") this.api.register();
  }

  async callSpeaker(speaker) {
    this.currentSpeaker = speaker;
    this.callbacks.onCallStateChange?.(speaker.id, CallState.CALLING);
    this.api.call(speaker.sipUser);
    console.debug(
      `[${dayjs().format("YYYY-MM-DD_HH:mm:ss.SSS")}] - [Mizu Client] Call to: ${speaker.sipUser}`,
    );
  }

  async disconnectSpeaker(speaker) {
    this.callbacks.onCallStateChange?.(speaker.id, CallState.DISCONNECTING);
    this.api.setline(speaker.sipUser);
    this.api.hangup(true);
    this.callbacks.onCallStateChange?.(speaker.id, CallState.IDLE);
  }

  async conferenceAll() {
    console.debug(
      `[${dayjs().format("YYYY-MM-DD_HH:mm:ss.SSS")}] - [Mizu Client] Set conference`,
    );
    this.api.setline(-2);
    this.api.conference();
  }

  async setAllEndUsersMuted(muted, endusers) {
    // console.debug(
    //   `[${dayjs().format("YYYY-MM-DD_HH:mm:ss.SSS")}] - [Mizu Client] Set mic mute for all endusers: ${muted}`,
    // );

    endusers.forEach((speaker) => {
      console.debug(
        `[${dayjs().format("YYYY-MM-DD_HH:mm:ss.SSS")}] - [Mizu Client] Set mic mute for ${speaker.sipUser}: ${muted}`,
      );
      this.api.setline(speaker.sipUser);
      this.api.mute(muted, 1);
    });

    this.callbacks.onMicChange?.(muted);
  }

  async setMicMuted(muted) {
    console.debug(
      `[${dayjs().format("YYYY-MM-DD_HH:mm:ss.SSS")}] - [Mizu Client] Set mic mute: ${muted}`,
    );
    // direction=2 is microphone/input according to Mizutech's API documentation.
    // setline(-2) applies to all active lines where supported.
    this.api.setline(-2);
    this.api.mute(muted, 1);
    this.callbacks.onMicChange?.(muted);
  }

  async setHoldLine(holded) {
    console.debug(
      `[${dayjs().format("YYYY-MM-DD_HH:mm:ss.SSS")}] - [Mizu Client] Set line to hold: ${holded}`,
    );
    // direction=2 is microphone/input according to Mizutech's API documentation.
    // setline(-2) applies to all active lines where supported.
    this.api.setline(-2);
    this.api.hold(holded);
    this.callbacks.onHoldChange?.(holded);
  }

  async stopAll() {
    this.api.setline(-2);
    this.api.hangup(true);
  }

  handleCallStateChange(
    event,
    direction,
    peername,
    peerdisplayname,
    line,
    callid,
  ) {
    // IMPORTANT: WebPhone packages/versions can expose different callback argument shapes.
    // Log the raw event during your POC and map SIP peer/line -> speaker here.
    console.debug(
      `[${dayjs().format("YYYY-MM-DD_HH:mm:ss.SSS")}] - [Mizu Client] handleCallStateChange ${event} - ${peername}`,
    );

    if (event === "connected" || event === "callConnected") {
      console.debug(
        `[${dayjs().format("YYYY-MM-DD_HH:mm:ss.SSS")}] - [Mizu Client] Call is connected to: ${peername}`,
      );
      this.handleCallStateForEachEnduser(peername, CallState.CONNECTED);
    }

    if (event === "disconnected") {
      console.debug(
        `[${dayjs().format("YYYY-MM-DD_HH:mm:ss.SSS")}] - [Mizu Client] Call is disconnected from: ${peername}`,
      );
      this.handleCallStateForEachEnduser(peername, CallState.IDLE);
    }

    // this.callbacks.onRawCallState?.(event);
  }

  handleCallStateForEachEnduser(endUserId, state) {
    var connectedEnduser = this.allEndusers.find((s) => s.id === endUserId);
    connectedEnduser.state = state;

    this.connected.set(endUserId, connectedEnduser);
    this.callbacks.onCallStateChange?.(endUserId, state);
    this.callbacks.onRawCallState?.(endUserId, state);

    this.connected.forEach((value, key) => {
      console.debug(
        `[${dayjs().format("YYYY-MM-DD_HH:mm:ss.SSS")}] - [Mizu Client] Connected end user: ${key}, SIP username: ${value.sipUser}, Call status: ${value.state}`,
      );
    });

    // this.api.setline(-2);
    // this.api.conference();

    // this.allSpeakers.map((speaker) => {
    //   this.api.setline(speaker.sipUser);
    //   console.debug(`[${dayjs().format('YYYY-MM-DD_HH:mm:ss.SSS')}] - [Mizu Client] Hold to: ${speaker.sipUser}, ${state}`);
    //   this.api.hold(true);
    // });
  }
}

function loadScript(src) {
  if (window.webphone_api) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector(
      `script[data-mizu-webphone="true"]`,
    );
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.dataset.mizuWebphone = "true";
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error(`Unable to load Mizutech script: ${src}`));
    document.head.appendChild(script);
  });
}

export function createMizuClient(callbacks, speakers) {
  const mock =
    String(import.meta.env.VITE_MIZU_MOCK ?? "true").toLowerCase() === "true";
  return mock
    ? new MockMizuClient(callbacks)
    : new RealMizuClient(callbacks, speakers);
}
