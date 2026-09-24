import React, { useEffect, useRef, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { ART_ASSETS, getClusterArt } from '../../data/versionsData.js';
import './InstancePickerModal.css';

function ArtThumbnail({ src }) {
  const [url, setUrl] = useState(src);

  useEffect(() => {
    setUrl(src);
  }, [src]);

  return (
    <img
      className="instance-picker-thumb"
      src={url || ART_ASSETS.default}
      alt=""
      loading="lazy"
      onError={() => {
        if (url !== ART_ASSETS.default) {
          setUrl(ART_ASSETS.default);
        }
      }}
    />
  );
}

/* Optional install-time compatibility check for a chosen project/version. */
function isInstanceCompatible(inst, compatFor) {
  const gameVersions = Array.isArray(compatFor.gameVersions) ? compatFor.gameVersions : [];
  const loaders = Array.isArray(compatFor.loaders) ? compatFor.loaders : [];
  const instVersion = inst.mc_version || inst.version;
  const instLoader = String(inst.mc_loader || inst.loader || 'Vanilla').toLowerCase();
  const versionOk = gameVersions.length === 0 || gameVersions.includes(instVersion);
  const loaderOk =
    compatFor.contentType !== 'mod' ||
    loaders.length === 0 ||
    loaders.map((l) => String(l).toLowerCase()).includes(instLoader);
  return versionOk && loaderOk;
}

export default function InstancePickerModal({
  open,
  mode = 'launch', // 'launch' | 'settings'
  version = '',
  loader = '',
  title = null,
  subtitle = null,
  instances = [],
  compatFor = null,
  onClose,
  onSelect,
  onCreateNew
}) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isSettings = mode === 'settings';
  const headerTitle = title || (isSettings ? 'Select Instance' : 'Launch Instance');
  const headerSub = subtitle || `${version} \u2022 ${loader}`;

  return (
    <div
      className="instance-picker-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="instance-picker-box" ref={boxRef}>
        {/* Slim Header */}
        <div className="instance-picker-header">
          <div className="instance-picker-header-title">
            <span className="instance-picker-title">{headerTitle}</span>
            <span className="instance-picker-sub">{headerSub}</span>
          </div>

          <button
            type="button"
            className="instance-picker-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <NativeIcon name="close" size={13} />
          </button>
        </div>

        {/* Clean, Slim List with Thumbnail Art */}
        <div className="instance-picker-list">
          {instances.length === 0 ? (
            <div
              className="instance-picker-empty"
              style={{ padding: '24px', textAlign: 'center', opacity: 0.7, fontSize: '13px' }}
            >
              No instances yet. Create an instance first, then install content into it.
            </div>
          ) : (
            instances.map((inst) => {
              const art = inst.art || getClusterArt(inst);
              const ramText = inst.memoryMb
                ? `${Math.round(inst.memoryMb / 1024)} GB`
                : null;
              const compatible = compatFor ? isInstanceCompatible(inst, compatFor) : null;

              return (
                <button
                  key={inst.id}
                  type="button"
                  className="instance-picker-item"
                  onClick={() => onSelect?.(inst)}
                >
                  <div className="instance-picker-item-left">
                    <div className="instance-picker-item-thumb-wrap">
                      <ArtThumbnail src={art} />
                    </div>
                    <span className="instance-picker-item-name" title={inst.name}>
                      {inst.name}
                    </span>
                  </div>

                  <div className="instance-picker-item-right">
                    {compatible !== null && (
                      <span
                        className={`instance-picker-compat ${compatible ? 'is-match' : 'is-mismatch'}`}
                        style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          letterSpacing: '0.02em',
                          color: compatible ? '#a5e07a' : '#ffb4a2',
                          background: compatible ? 'rgba(129, 188, 6, 0.14)' : 'rgba(255, 120, 90, 0.14)',
                          border: `1px solid ${compatible ? 'rgba(129, 188, 6, 0.4)' : 'rgba(255, 120, 90, 0.4)'}`
                        }}
                      >
                        {compatible ? 'Compatible' : 'Mismatch'}
                      </span>
                    )}
                    {ramText && (
                      <span className="instance-picker-item-ram">{ramText}</span>
                    )}
                    <NativeIcon name="chevron-right" size={12} className="instance-picker-arrow" />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Minimal Footer */}
        {onCreateNew && (
          <div className="instance-picker-footer">
            <button
              type="button"
              className="instance-picker-new-btn"
              onClick={onCreateNew}
            >
              <NativeIcon name="plus" size={12} />
              <span>New instance</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
