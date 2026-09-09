/* =========================================================
   LabLedger — root component: session restore + auth gate
   (React port of the DOMContentLoaded bootstrap in js/main.js)
   ========================================================= */
import React, { useEffect, useState } from 'react';
import { api } from './api';
import { AppProvider, useApp } from './store';
import Login from './Login';
import Shell from './Shell';

function Gate() {
  const { me, setMe, loadAll, toastMsg } = useApp();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { user } = await api('/auth/me');
        if (user) {
          setMe(user);
          await loadAll(user);
        }
      } catch (e) {
        /* not signed in — stay on the login screen */
      } finally {
        setChecking(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) return null;

  return (
    <>
      {me ? <Shell /> : <Login />}
      <div className={'toast' + (toastMsg ? ' show' : '')}>{toastMsg}</div>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Gate />
    </AppProvider>
  );
}
