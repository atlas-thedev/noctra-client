import React, { useEffect, useMemo, useState } from 'react';
import { Check, Download, Layers, PackageOpen, Search, X } from 'lucide-react';
import Dropdown from '../../../components/ui/Dropdown.jsx';

export default function ModpackVersionPrompt({ prompt, onConfirm, onCancel }) {
  const { project, versions = [] } = prompt || {};
  const [selectedVersionId, setSelectedVersionId] = useState(() => versions[0]?.id || null);
  const [selectedMcVersion, setSelectedMcVersion] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  // Extract all unique game_versions from versions array, sorted descending
  const availableMcVersions = useMemo(() => {
    const set = new Set();
    versions.forEach((v) => {
      (v.game_versions || []).forEach((gv) => {
        if (gv) set.add(gv);
      });
    });
    return Array.from(set).sort((a, b) => {
      const pa = a.split('.').map(Number);
      const pb = b.split('.').map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na !== nb) return nb - na;
      }
      return b.localeCompare(a);
    });
  }, [versions]);

  // Options for custom Dropdown component
  const mcVersionOptions = useMemo(() => [
    { value: 'all', label: `All Versions (${versions.length})` },
    ...availableMcVersions.map((v) => ({
      value: v,
      label: `Minecraft ${v}`
    }))
  ], [availableMcVersions, versions.length]);

  // Filter versions by both Minecraft version dropdown and text search
  const filteredVersions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return versions.filter((v) => {
      if (selectedMcVersion !== 'all') {
        const gvs = v.game_versions || [];
        if (!gvs.includes(selectedMcVersion)) return false;
      }
      if (q) {
        const name = (v.name || v.version_number || '').toLowerCase();
        const gameVersions = (v.game_versions || []).join(' ').toLowerCase();
        const loaders = (v.loaders || []).join(' ').toLowerCase();
        return name.includes(q) || gameVersions.includes(q) || loaders.includes(q);
      }
      return true;
    });
  }, [versions, selectedMcVersion, searchQuery]);

  // Auto-select first matching release if selection becomes invalid
  useEffect(() => {
    if (filteredVersions.length > 0) {
      const exists = filteredVersions.some((v) => v.id === selectedVersionId);
      if (!exists) {
        setSelectedVersionId(filteredVersions[0].id);
      }
    } else {
      setSelectedVersionId(null);
    }
  }, [filteredVersions, selectedVersionId]);

  if (!project || !versions || versions.length === 0) return null;

  return (
    <div className="dep-prompt-backdrop" onClick={onCancel} role="presentation">
      <div
        className="dep-prompt-modal modpack-version-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modpack-version-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="dep-prompt-close"
          onClick={onCancel}
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        <div className="dep-prompt-header">
          <div className="dep-prompt-icon">
            <PackageOpen size={22} />
          </div>
          <div>
            <h3 id="modpack-version-title" className="dep-prompt-title">
              Install {project.title}
            </h3>
            <p className="dep-prompt-subtitle">
              Select the Minecraft version and release you want to install
            </p>
          </div>
        </div>

        {/* Dual Controls: Select MC version from dropdown & Type to search */}
        <div className="modpack-version-controls">
          <div className="modpack-version-control-group">
            <label className="modpack-control-label">
              <Layers size={12} />
              <span>Select Version</span>
            </label>
            <Dropdown
              value={selectedMcVersion}
              options={mcVersionOptions}
              onChange={setSelectedMcVersion}
              className="modpack-version-custom-dropdown"
              maxHeight={220}
              placeholder="Select version"
            />
          </div>

          <div className="modpack-version-control-group">
            <label className="modpack-control-label" htmlFor="version-search-input">
              <Search size={12} />
              <span>Type / Search</span>
            </label>
            <div className="modpack-input-wrapper">
              <input
                id="version-search-input"
                type="text"
                className="modpack-version-text-input"
                placeholder="Type version (e.g. 1.20.1)…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="browse-search-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear version search"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="dep-prompt-body" style={{ maxHeight: '340px' }}>
          <div className="dep-prompt-section">
            <h4 className="dep-section-heading">
              Available Releases ({filteredVersions.length})
            </h4>
            <div className="dep-list">
              {filteredVersions.map((v) => {
                const loaders = Array.isArray(v.loaders) ? v.loaders.join(', ') : 'fabric';
                const gameVersions = Array.isArray(v.game_versions) ? v.game_versions.join(', ') : 'Unknown';
                const isSelected = selectedVersionId === v.id;
                const releaseType = v.version_type || 'release';
                return (
                  <div
                    key={v.id}
                    className={`modpack-version-row ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedVersionId(v.id)}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        setSelectedVersionId(v.id);
                      }
                    }}
                  >
                    <div className="modpack-version-radio-wrap">
                      <div className="modpack-version-radio-custom">
                        <div className="modpack-version-radio-dot" />
                      </div>
                    </div>
                    <div className="modpack-version-meta">
                      <div className="modpack-version-header-row">
                        <span className="modpack-version-name">{v.name || v.version_number}</span>
                        <span className={`modpack-version-type-pill ${releaseType}`}>
                          {releaseType}
                        </span>
                      </div>
                      <div className="modpack-version-sub">
                        <span>Minecraft <strong className="modpack-version-mc">{gameVersions}</strong></span>
                        <span>·</span>
                        <span>{loaders}</span>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="dep-badge is-required" style={{ background: '#ffffff', color: '#000000', fontWeight: 650 }}>
                        <Check size={11} strokeWidth={3} /> Selected
                      </span>
                    )}
                  </div>
                );
              })}
              {filteredVersions.length === 0 && (
                <p className="browse-category-empty" style={{ padding: '24px 0' }}>
                  No versions match your selection
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="dep-prompt-footer">
          <button
            type="button"
            className="browse-btn browse-btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="browse-btn browse-btn-install"
            onClick={() => onConfirm(selectedVersionId)}
            disabled={!selectedVersionId}
            style={{ minWidth: '120px' }}
          >
            <Download size={14} />
            <span>Install Version</span>
          </button>
        </div>
      </div>
    </div>
  );
}
