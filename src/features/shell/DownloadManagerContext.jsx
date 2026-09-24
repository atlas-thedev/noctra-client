import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const DownloadManagerContext = createContext(null);

export function DownloadManagerProvider({ children }) {
  const [downloads, setDownloads] = useState({});

  const updateDownload = useCallback((id, data) => {
    setDownloads((prev) => {
      if (data === null) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      
      const isComplete = data.percent >= 100;
      const next = { ...prev, [id]: { ...prev[id], ...data, done: isComplete } };
      
      if (isComplete) {
        setTimeout(() => {
          setDownloads((current) => {
            const c = { ...current };
            delete c[id];
            return c;
          });
        }, 3000);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const unsubscribers = [];

    if (window.native?.modpacks?.onProgress) {
      unsubscribers.push(window.native.modpacks.onProgress((payload) => {
        if (payload) {
          updateDownload(`modpack-${payload.projectId}`, {
            id: `modpack-${payload.projectId}`,
            type: 'modpack',
            title: 'Modpack Installation',
            percent: payload.percent,
            detail: payload.detail
          });
        }
      }));
    }

    // Individual content installs (mods, shaderpacks, resourcepacks, datapacks)
    // each emit their own mods:progress stream keyed by projectId, so every
    // item \u2014 including dependencies pulled in during a bundle install \u2014
    // shows up in the manager alongside modpacks.
    if (window.native?.mods?.onProgress) {
      unsubscribers.push(window.native.mods.onProgress((payload) => {
        if (payload && payload.projectId) {
          const id = `content-${payload.projectId}`;
          const percent = payload.percent === null || payload.percent === undefined
            ? 0
            : payload.percent;
          updateDownload(id, {
            id,
            type: payload.folder || 'mod',
            title: payload.title || 'Content Installation',
            percent,
            detail: payload.detail
          });
        }
      }));
    }

    if (window.native?.java?.onProgress) {
      unsubscribers.push(window.native.java.onProgress((payload) => {
        if (payload) {
          updateDownload('java', {
            id: 'java',
            type: 'java',
            title: 'Java Runtime Environment',
            percent: payload.percent,
            detail: payload.detail
          });
        }
      }));
    }

    if (window.native?.launcher?.onProgress) {
      unsubscribers.push(window.native.launcher.onProgress((payload) => {
        if (payload) {
          updateDownload('launcher', {
            id: 'launcher',
            type: 'launcher',
            title: 'Minecraft Dependencies',
            percent: payload.percent,
            detail: payload.detail || 'Downloading assets & libraries'
          });
        }
      }));
    }

    return () => unsubscribers.forEach((u) => u && u());
  }, [updateDownload]);

  return (
    <DownloadManagerContext.Provider value={{ downloads }}>
      {children}
    </DownloadManagerContext.Provider>
  );
}

export function useDownloadManager() {
  return useContext(DownloadManagerContext);
}
