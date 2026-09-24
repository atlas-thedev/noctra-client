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
