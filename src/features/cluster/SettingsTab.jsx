import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Cloud,
  Code2,
  Cpu,
  Maximize2,
  Monitor,
  RotateCcw,
  Save
} from 'lucide-react';
import Toggle from '../../components/ui/Toggle.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import './SettingsTab.css';

/* ============================================================
   Instance settings — per-instance overrides.

   Rebuilt around three "override models" (Display, Memory, Java),
   each a self-contained card that can be toggled on to override
   the launcher-wide default. Follows settings-UX best practice:
   group related controls, use the right control for each value,
   make the global default obvious, and keep resets one click away.
   ============================================================ */

const RES_PRESETS = [
  ['720p', 1280, 720],
  ['1080p', 1920, 1080],
  ['1440p', 2560, 1440],
  ['4K', 3840, 2160]
];

const DISPLAY_MODES = [
  { value: 'windowed', label: 'Windowed' },
  { value: 'borderless', label: 'Borderless window' },
  { value: 'fullscreen', label: 'Fullscreen' }
];

/* Search haystacks so the toolbar search box can filter sections. */
const SECTION_TERMS = {
  display: 'game resolution display fullscreen borderless window size aspect ratio',
  memory: 'allocated memory ram heap gigabytes',
  java: 'java jvm arguments runtime executable garbage collection performance flags'
};

function initialDraft(cluster, global) {
  const ov = cluster.overrides || {};
  return {
    resolution: {
      ...(global.resolution || { width: 854, height: 480, fullscreen: false }),
      ...ov.resolution,
      enabled: !!ov.resolution?.enabled,
      lockAspect: ov.resolution?.lockAspect ?? true,
      borderless: ov.resolution?.borderless ?? false
    },
    memory: {
      ...(global.memory || { min: 1, max: 4 }),
      ...ov.memory,
      enabled: !!ov.memory?.enabled
    },
    jvmEnabled: ov.jvmEnabled ?? !!(ov.jvmArgs || ov.java?.enabled),
    javaPath: ov.java?.path || '',
    jvmArgs: ov.jvmArgs || ''
  };
}

export default function SettingsTab({ cluster, onUpdateCluster, query = '', enabledOnly = false, onDirtyChange }) {
  const [draft, setDraft] = useState(() => initialDraft(cluster, {}));
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialDraft(cluster, {})));
  const [systemRam, setSystemRam] = useState(32);
  const [globals, setGlobals] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ratio = useRef(16 / 9);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError('');
    Promise.all([window.native.settings.load(), window.native.settings.systemMemory()])
      .then(([global, memory]) => {
        if (cancelled) return;
        const next = initialDraft(cluster, global);
        setGlobals(global);
        setSystemRam(Math.max(1, Math.floor(memory.totalGb)));
        setDraft(next);
        setBaseline(JSON.stringify(next));
        ratio.current = next.resolution.width / next.resolution.height || 16 / 9;
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not read settings.');
      });
    return () => {
      cancelled = true;
    };
  }, [cluster.id, retry]);

  const dirty = !!draft && JSON.stringify(draft) !== baseline;
  useEffect(() => {
    onDirtyChange?.(dirty || saving);
  }, [dirty, saving, onDirtyChange]);

  const change = (key, value) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const resolution = (values) => change('resolution', { ...draft.resolution, ...values });
  const memory = (values) => change('memory', { ...draft.memory, ...values });

  const applySize = (width, height) => {
    resolution({ width, height });
    ratio.current = width / height;
  };

  const changeDimension = (key, value) => {
    const next = { [key]: value };
    if (draft.resolution.lockAspect && Number(value) > 0) {
      next[key === 'width' ? 'height' : 'width'] = Math.round(
        key === 'width' ? Number(value) / ratio.current : Number(value) * ratio.current
      );
    }
    resolution(next);
  };

  const setDisplayMode = (mode) =>
    resolution({ fullscreen: mode === 'fullscreen', borderless: mode === 'borderless' });

  const resetAll = () => {
    setSaved(false);
    setDraft((cur) => ({
      ...cur,
      resolution: { ...cur.resolution, enabled: false },
      memory: { ...cur.memory, enabled: false },
      jvmEnabled: false
    }));
  };

  const discard = () => {
    setSaved(false);
    try {
      setDraft(JSON.parse(baseline));
    } catch {
      /* keep current draft if baseline is unreadable */
    }
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const next = {
        ...draft,
        resolution: {
          ...draft.resolution,
          width: Number(draft.resolution.width),
          height: Number(draft.resolution.height)
        }
      };
      if (
        next.resolution.enabled &&
        (!Number.isInteger(next.resolution.width) ||
          !Number.isInteger(next.resolution.height) ||
          next.resolution.width < 320 ||
          next.resolution.width > 7680 ||
          next.resolution.height < 240 ||
          next.resolution.height > 4320)
      ) {
        throw new Error('Resolution must be 320\u20137680 px wide and 240\u20134320 px high.');
      }
      await onUpdateCluster(cluster.id, {
        overrides: {
          ...cluster.overrides,
          resolution: next.resolution,
          memory: { ...next.memory, min: Math.min(next.memory.min || 1, next.memory.max) },
          jvmEnabled: next.jvmEnabled,
          java: { enabled: next.jvmEnabled && !!next.javaPath.trim(), path: next.javaPath.trim() },
          jvmArgs: next.jvmArgs.trim()
        }
      });
      setDraft(next);
      setBaseline(JSON.stringify(next));
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  if (!draft) {
    return (
      <div className="nis-loading">
        {error ? (
          <>
            <AlertCircle size={18} />
            <span role="alert">{error}</span>
            <button type="button" className="nis-btn nis-btn-ghost" onClick={() => setRetry((v) => v + 1)}>
              Retry
            </button>
          </>
        ) : (
          'Loading settings\u2026'
        )}
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const show = (id, enabled) => SECTION_TERMS[id].includes(q) && (!enabledOnly || enabled);

  const r = draft.resolution;
  const m = draft.memory;
  const displayMode = r.fullscreen ? 'fullscreen' : r.borderless ? 'borderless' : 'windowed';
  const sizeLocked = displayMode === 'fullscreen';
  const memWarn = m.enabled && m.max > systemRam;
  const activeOverrides = [r.enabled, m.enabled, draft.jvmEnabled].filter(Boolean).length;
  const memPresets = [2, 4, 8, 16].filter((g) => g <= systemRam);
  const anyVisible = show('display', r.enabled) || show('memory', m.enabled) || show('java', draft.jvmEnabled);

  return (
    <form className="nis" onSubmit={save} noValidate>
      <div className="nis-scroll">
        {/* Caution + override scope banner */}
        <div className="nis-banner" role="note">
          <div className="nis-banner-left">
            <AlertTriangle size={18} className="nis-banner-icon" />
            <span className="nis-banner-text">
              These overrides apply only to <strong>{cluster.name || cluster.version}</strong>. Aggressive changes may make the game unstable.
            </span>
          </div>
          <div className="nis-banner-status">
            <Cloud size={12} />
            <span>{activeOverrides} of 3 overriding global</span>
          </div>
        </div>

        {/* At-a-glance summary */}
        <div className="nis-summary" aria-label="Override summary">
          <div className={`nis-chip ${r.enabled ? 'is-active' : ''}`}>
            <Maximize2 size={14} className="nis-chip-icon" />
            <div className="nis-chip-meta">
              <span className="nis-chip-name">Display</span>
              <span className="nis-chip-value">
                {r.enabled ? (sizeLocked ? 'Fullscreen' : `${r.width} \u00d7 ${r.height}`) : 'Global default'}
              </span>
            </div>
          </div>
          <div className={`nis-chip ${m.enabled ? 'is-active' : ''}`}>
            <Cpu size={14} className="nis-chip-icon" />
            <div className="nis-chip-meta">
              <span className="nis-chip-name">Memory</span>
              <span className="nis-chip-value">{m.enabled ? `${m.max} GB / ${systemRam} GB` : 'Global default'}</span>
            </div>
          </div>
          <div className={`nis-chip ${draft.jvmEnabled ? 'is-active' : ''}`}>
            <Code2 size={14} className="nis-chip-icon" />
            <div className="nis-chip-meta">
              <span className="nis-chip-name">Java</span>
              <span className="nis-chip-value">{draft.jvmEnabled ? 'Custom runtime' : 'Automatic'}</span>
            </div>
          </div>
        </div>

        {/* Section 1 — Display */}
        {show('display', r.enabled) && (
          <section className={`nis-card ${r.enabled ? 'is-active' : ''}`}>
            <header className="nis-card-head">
              <div className="nis-card-id">
                <div className="nis-card-icon">
                  <Maximize2 size={18} />
                </div>
                <div>
                  <h3 className="nis-card-title">Game Resolution</h3>
                  <p className="nis-card-desc">Set a custom launch window size and display mode for this instance.</p>
                </div>
              </div>
              <Toggle checked={r.enabled} onChange={(enabled) => resolution({ enabled })} />
            </header>

            <fieldset className="nis-card-body" disabled={!r.enabled || saving}>
              <div className="nis-field">
                <span className="nis-field-label">Display mode</span>
                <div className="nis-mode">
                  <Dropdown value={displayMode} options={DISPLAY_MODES} onChange={setDisplayMode} disabled={!r.enabled || saving} />
                </div>
              </div>

              <div className="nis-row">
                <label className={`nis-dim ${sizeLocked ? 'is-off' : ''}`}>
                  <span className="nis-dim-label">W</span>
                  <input
                    aria-label="Window width"
                    type="number"
                    min="320"
                    max="7680"
                    disabled={sizeLocked}
                    value={r.width}
                    onChange={(event) => changeDimension('width', event.target.value)}
                  />
                </label>
                <span className="nis-x">\u00d7</span>
                <label className={`nis-dim ${sizeLocked ? 'is-off' : ''}`}>
                  <span className="nis-dim-label">H</span>
                  <input
                    aria-label="Window height"
                    type="number"
                    min="240"
                    max="4320"
                    disabled={sizeLocked}
                    value={r.height}
                    onChange={(event) => changeDimension('height', event.target.value)}
                  />
                </label>

                <div className="nis-toggle-line">
                  <span>Lock aspect ratio</span>
                  <Toggle
                    checked={r.lockAspect}
                    onChange={(lockAspect) => {
                      ratio.current = Number(r.width) / Number(r.height) || 16 / 9;
                      resolution({ lockAspect });
                    }}
                  />
                </div>

                <button
                  type="button"
                  className="nis-reset"
                  title="Reset to global resolution"
                  aria-label="Reset to global resolution"
                  onClick={() => applySize(globals.resolution?.width || 854, globals.resolution?.height || 480)}
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              <div className={`nis-presets ${sizeLocked ? 'is-off' : ''}`}>
                <span className="nis-presets-label">Presets</span>
                {RES_PRESETS.map(([label, width, height]) => (
                  <button
                    type="button"
                    key={label}
                    className={`nis-pill ${Number(r.width) === width && Number(r.height) === height ? 'is-active' : ''}`}
                    disabled={sizeLocked}
                    onClick={() => applySize(width, height)}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className="nis-pill is-native"
                  disabled={sizeLocked}
                  onClick={() =>
                    applySize(
                      Math.round(screen.width * (window.devicePixelRatio || 1)),
                      Math.round(screen.height * (window.devicePixelRatio || 1))
                    )
                  }
                >
                  <Monitor size={12} /> Native display
                </button>
              </div>
            </fieldset>
          </section>
        )}

        {/* Section 2 — Memory */}
        {show('memory', m.enabled) && (
          <section className={`nis-card ${m.enabled ? 'is-active' : ''}`}>
            <header className="nis-card-head">
              <div className="nis-card-id">
                <div className="nis-card-icon">
                  <Cpu size={18} />
                </div>
                <div>
                  <h3 className="nis-card-title">Allocated Memory (RAM)</h3>
                  <p className="nis-card-desc">Override how much RAM the JVM may use for this instance.</p>
                </div>
              </div>
              <Toggle checked={m.enabled} onChange={(enabled) => memory({ enabled })} />
            </header>

            <fieldset className="nis-card-body" disabled={!m.enabled || saving}>
              <div className="nis-mem-head">
                <div className="nis-mem-badge">
                  <strong>{m.max} GB</strong>
                  <span>of {systemRam} GB total</span>
                </div>
                <div className="nis-mem-quick">
                  {memPresets.map((g) => (
                    <button
                      type="button"
                      key={g}
                      className={`nis-pill ${m.max === g ? 'is-active' : ''}`}
                      onClick={() => memory({ max: g })}
                    >
                      {g} GB
                    </button>
                  ))}
                  <button
                    type="button"
                    className="nis-reset"
                    title="Reset to recommended memory"
                    aria-label="Reset to recommended memory"
                    onClick={() => memory({ max: Math.min(globals.memory?.max || 4, systemRam) })}
                  >
                    <RotateCcw size={14} />
                    <span>Recommended</span>
                  </button>
                </div>
              </div>

              <div className="nis-slider-wrap">
                <input
                  aria-label="Allocated memory"
                  type="range"
                  min="1"
                  max={systemRam}
                  step="1"
                  value={m.max}
                  onChange={(event) => memory({ max: Number(event.target.value) })}
                  className="nis-slider"
                />
                <div className="nis-ticks">
                  <span>1 GB</span>
                  <span>{Math.max(2, Math.round(systemRam * 0.25))} GB</span>
                  <span>{Math.max(4, Math.round(systemRam * 0.5))} GB</span>
                  <span>{Math.max(6, Math.round(systemRam * 0.75))} GB</span>
                  <span>{systemRam} GB</span>
                </div>
              </div>

              {memWarn && (
                <p className="nis-note is-warn">
                  <AlertCircle size={13} /> This allocation exceeds your physical system memory.
                </p>
              )}
            </fieldset>
          </section>
        )}

        {/* Section 3 — Java & JVM */}
        {show('java', draft.jvmEnabled) && (
          <section className={`nis-card ${draft.jvmEnabled ? 'is-active' : ''}`}>
            <header className="nis-card-head">
              <div className="nis-card-id">
                <div className="nis-card-icon">
                  <Code2 size={18} />
                </div>
                <div>
                  <h3 className="nis-card-title">Java &amp; JVM Arguments</h3>
                  <p className="nis-card-desc">Point to a custom Java runtime and pass launch flags for GC and performance tuning.</p>
                </div>
              </div>
              <Toggle checked={draft.jvmEnabled} onChange={(value) => change('jvmEnabled', value)} />
            </header>

            <fieldset className="nis-card-body" disabled={!draft.jvmEnabled || saving}>
              <label className="nis-field">
                <span className="nis-field-label">Java executable path</span>
                <input
                  className="nis-input"
                  value={draft.javaPath}
                  onChange={(event) => change('javaPath', event.target.value)}
                  placeholder="Leave empty to use the bundled Java runtime"
                />
              </label>

              <label className="nis-field">
                <span className="nis-field-label">Launch arguments</span>
                <textarea
                  className="nis-textarea"
                  rows={2}
                  value={draft.jvmArgs}
                  onChange={(event) => change('jvmArgs', event.target.value)}
                  placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled"
                  spellCheck={false}
                />
                <span className="nis-field-hint">Separate flags with spaces. Applies on the next launch.</span>
              </label>
            </fieldset>
          </section>
        )}

        {!anyVisible && <div className="nis-empty">No matching settings found.</div>}
      </div>

      {/* Sticky footer */}
      <footer className="nis-footer">
        <span
          className={`nis-status ${error ? 'is-error' : saved ? 'is-saved' : dirty ? 'is-dirty' : ''}`}
          role={error ? 'alert' : 'status'}
        >
          {error ||
            (saved
              ? 'Changes saved \u2014 applies on next launch.'
              : dirty
                ? 'You have unsaved changes.'
                : 'Disabled overrides inherit the global defaults.')}
        </span>

        <div className="nis-footer-actions">
          {activeOverrides > 0 && (
            <button type="button" className="nis-btn nis-btn-ghost" onClick={resetAll} disabled={saving}>
              Reset all to global
            </button>
          )}
          {dirty && (
            <button type="button" className="nis-btn nis-btn-ghost" onClick={discard} disabled={saving}>
              Discard
            </button>
          )}
          <button type="submit" className="nis-btn nis-btn-primary" disabled={saving || !dirty || memWarn}>
            {saved ? <Check size={15} /> : <Save size={15} />}
            <span>{saving ? 'Saving\u2026' : saved ? 'Saved' : 'Save changes'}</span>
          </button>
        </div>
      </footer>
    </form>
  );
}
