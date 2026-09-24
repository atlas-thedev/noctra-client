import React, { useState, useRef, useEffect } from 'react';
import { Download, CheckCircle2, Loader2 } from 'lucide-react';
import { useDownloadManager } from './DownloadManagerContext.jsx';
import './DownloadManagerButton.css';

export default function DownloadManagerButton() {
  const { downloads } = useDownloadManager();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const downloadList = Object.values(downloads);
  const activeCount = downloadList.filter(d => !d.done).length;
  const isVisible = downloadList.length > 0;

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isVisible) return null;

  const totalPercent = downloadList.reduce((acc, d) => acc + (d.percent || 0), 0) / downloadList.length;

  return (
    <div className="dl-manager" ref={containerRef}>
      <button 
        className={`dl-manager-pill ${activeCount > 0 ? 'is-active' : 'is-done'}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Downloads"
      >
        <div className="dl-manager-icon">
          {activeCount > 0 ? (
            <Download size={14} className="dl-pulse" />
          ) : (
            <CheckCircle2 size={14} />
          )}
        </div>
        {activeCount > 0 && (
          <div className="dl-manager-progress-bg">
            <div className="dl-manager-progress-fill" style={{ width: `${Math.max(5, totalPercent)}%` }} />
          </div>
        )}
      </button>

      {isOpen && (
        <div className="dl-manager-popover">
          <div className="dl-manager-header">
            <h3>Downloads</h3>
            <span>{activeCount} Active</span>
          </div>
          <div className="dl-manager-list">
            {downloadList.map((dl) => (
              <div key={dl.id} className="dl-manager-item">
                <div className="dl-manager-item-icon">
                  {dl.done ? <CheckCircle2 size={16} className="text-success" /> : <Loader2 size={16} className="dl-spin" />}
                </div>
                <div className="dl-manager-item-info">
                  <div className="dl-manager-item-title">{dl.title}</div>
                  <div className="dl-manager-item-detail">{dl.detail || 'Processing...'}</div>
                  {!dl.done && (
                    <div className="dl-manager-item-bar">
                      <div className="dl-manager-item-bar-fill" style={{ width: `${Math.max(2, dl.percent || 0)}%` }} />
                    </div>
                  )}
                </div>
                {!dl.done && dl.percent > 0 && (
                  <div className="dl-manager-item-pct">{Math.round(dl.percent)}%</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
