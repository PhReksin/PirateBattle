import { SOUNDS, soundUrl } from './sounds';
import type { SoundName } from './sounds';

export interface AudioSettings { muted: boolean; volume: number }
export interface AudioScope { active: boolean }
interface Voice {
    source: AudioBufferSourceNode;
    gain: GainNode;
    scope?: AudioScope;
}

export function createAudioEngine(initial: AudioSettings) {
    let settings = initial;
    let context: AudioContext | undefined;
    let master: GainNode | undefined;
    let unlocked = false;
    let audible = true;
    let destroyed = false;
    let battleRunning = false;
    let ocean: Voice | undefined;
    let oceanPending = false;
    let epoch = 0;
    const controller = new AbortController();
    const bytes = new Map<SoundName, Promise<ArrayBuffer | null>>();
    const buffers = new Map<SoundName, AudioBuffer>();
    const decoding = new Map<SoundName, Promise<AudioBuffer | null>>();
    const voices = new Set<Voice>();
    const lastPlayed = new Map<SoundName, number>();

    function fetchSound(name: SoundName) {
        let pending = bytes.get(name);
        if (!pending) {
            pending = fetch(soundUrl(name), { signal: controller.signal })
                .then((response) => response.ok ? response.arrayBuffer() : null)
                .catch(() => null);
            bytes.set(name, pending);
        }
        return pending;
    }
    function load(name: SoundName): Promise<AudioBuffer | null> {
        const cached = buffers.get(name);
        if (cached) return Promise.resolve(cached);
        const current = context;
        if (!current || destroyed) return Promise.resolve(null);
        let pending = decoding.get(name);
        if (!pending) {
            pending = fetchSound(name).then(async (data) => {
                if (!data || destroyed) return null;
                const buffer = await current.decodeAudioData(data.slice(0));
                if (destroyed) return null;
                buffers.set(name, buffer);
                return buffer;
            }).catch(() => null);
            decoding.set(name, pending);
        }
        return pending;
    }
    function release(voice: Voice) {
        voices.delete(voice);
        voice.source.disconnect();
        voice.gain.disconnect();
        if (ocean === voice) ocean = undefined;
    }
    function stop(voice: Voice) {
        voice.source.onended = null;
        try { voice.source.stop(); } catch { /* Already stopped. */ }
        release(voice);
    }
    function stopAll() {
        epoch++;
        for (const voice of [...voices]) stop(voice);
        if (ocean) stop(ocean);
    }
    function ready() {
        return !destroyed && audible && unlocked && !settings.muted && settings.volume > 0 && context?.state === 'running';
    }
    function start(name: SoundName, buffer: AudioBuffer, scope?: AudioScope) {
        if (!ready() || !context || !master || scope?.active === false) return;
        if (name !== 'ocean' && voices.size >= 20) {
            const oldest = voices.values().next().value;
            if (oldest) stop(oldest);
        }
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffer;
        source.loop = name === 'ocean';
        gain.gain.value = SOUNDS[name].gain * (name === 'ocean' && !battleRunning ? 0.5 : 1);
        source.connect(gain);
        gain.connect(master);
        const voice: Voice = { source, gain, scope };
        source.onended = () => release(voice);
        try {
            source.start();
            if (name === 'ocean') ocean = voice;
            else voices.add(voice);
        } catch { release(voice); }
    }
    function syncOcean() {
        if (!ready() || !context) return;
        if (ocean) {
            ocean.gain.gain.setTargetAtTime(SOUNDS.ocean.gain * (battleRunning ? 1 : 0.5), context.currentTime, 0.15);
            return;
        }
        if (oceanPending) return;
        oceanPending = true;
        const requestedEpoch = epoch;
        void load('ocean').then((buffer) => {
            oceanPending = false;
            if (buffer && ready() && !ocean) {
                // A hide/mute cycle during loading must not create a stale loop.
                if (requestedEpoch === epoch) start('ocean', buffer);
                else syncOcean();
            }
        });
    }
    function unlock() {
        if (destroyed || !audible) return;
        try {
            if (!context) {
                context = new AudioContext();
                master = context.createGain();
                master.gain.value = settings.muted ? 0 : settings.volume;
                master.connect(context.destination);
                for (const name of Object.keys(SOUNDS) as SoundName[]) void load(name);
            }
            unlocked = true;
            if (context.state === 'running') syncOcean();
            else void context.resume().then(() => {
                if (destroyed) return;
                if (!audible) { void context?.suspend().catch(() => { }); return; }
                syncOcean();
            }).catch(() => { /* The next user gesture can retry browser permission. */ });
        } catch { /* Audio is optional; an unavailable device cannot stop gameplay. */ }
    }
    return {
        preload() { for (const name of Object.keys(SOUNDS) as SoundName[]) void fetchSound(name); },
        unlock,
        play(name: Exclude<SoundName, 'ocean'>, scope?: AudioScope) {
            if (destroyed || !audible || !unlocked || settings.muted || settings.volume <= 0 || scope?.active === false) return;
            const now = performance.now();
            if (now - (lastPlayed.get(name) ?? -Infinity) < SOUNDS[name].gap * 1000) return;
            lastPlayed.set(name, now);
            const cached = buffers.get(name);
            if (cached && ready()) { start(name, cached, scope); return; }
            const requestedEpoch = epoch;
            void load(name).then((buffer) => {
                // Never replay a backlog of shots after loading, mute, pause or navigation.
                if (buffer && epoch === requestedEpoch && performance.now() - now < 250) start(name, buffer, scope);
            });
        },
        stopScope(scope: AudioScope) {
            scope.active = false;
            for (const voice of [...voices]) if (voice.scope === scope) stop(voice);
        },
        setBattleRunning(running: boolean) { battleRunning = running; syncOcean(); },
        setSettings(next: AudioSettings) {
            settings = next;
            if (context && master) master.gain.setTargetAtTime(next.muted ? 0 : next.volume, context.currentTime, 0.02);
            if (next.muted || next.volume <= 0) stopAll();
            else syncOcean();
        },
        setAudible(value: boolean) {
            audible = value;
            if (!value) { stopAll(); void context?.suspend().catch(() => { }); }
            else if (unlocked) unlock();
        },
        destroy() {
            if (destroyed) return;
            destroyed = true;
            stopAll(); controller.abort();
            master?.disconnect();
            void context?.close().catch(() => { });
            bytes.clear(); buffers.clear(); decoding.clear(); lastPlayed.clear();
        },
    };
}