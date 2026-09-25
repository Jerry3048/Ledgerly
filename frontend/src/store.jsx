/* =========================================================
   LabLedger — in-memory application state (React port of
   js/state.js + the loadAll/renderAll flow in js/main.js).
   Nothing persisted client-side except the session cookie.
   ========================================================= */
import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { api } from './api';

const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

export const roleLabels = {
  admin: 'Administrator',
  officer: 'Lab Officer',
  lecturer: 'Lecturer',
  student: 'Student',
};

const SETTERS = {
  categories: 'categories',
  equipment: 'equipment',
  borrows: 'borrows',
  maintenance: 'maintenance',
  users: 'users',
};

export function AppProvider({ children }) {
  const [me, setMe] = useState(null);
  const [categories, setCategories] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [users, setUsers] = useState([]);
  const [toastMsg, setToastMsg] = useState('');
  const toastTimer = useRef(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(''), 2600);
  }, []);

  const isStaff = !!me && (me.role === 'admin' || me.role === 'officer');
  const isAdmin = !!me && me.role === 'admin';
  const isRequester =
    !!me && (me.role === 'lecturer' || me.role === 'student');

  const applySet = useCallback(
    (key, rows) => {
      if (key === 'categories') setCategories(rows);
      else if (key === 'equipment') setEquipment(rows);
      else if (key === 'borrows') setBorrows(rows);
      else if (key === 'maintenance') setMaintenance(rows);
      else if (key === 'users') setUsers(rows);
    },
    []
  );

  /** Fetch the named collections and store them. */
  const reload = useCallback(
    async (keys) => {
      const tasks = keys.map((k) => api('/' + k).then((d) => applySet(k, d)));
      await Promise.all(tasks);
    },
    [applySet]
  );

  /** Initial load after sign-in — staff-only collections gated by role. */
  const loadAll = useCallback(
    async (user) => {
      const u = user || me;
      const staff = !!u && (u.role === 'admin' || u.role === 'officer');
      const admin = !!u && u.role === 'admin';
      const keys = ['categories', 'equipment', 'borrows'];
      if (staff) keys.push('maintenance');
      if (admin) keys.push('users');
      await reload(keys);
    },
    [me, reload]
  );

  const eqById = (id) => equipment.find((e) => e.id === Number(id));
  const catById = (id) => categories.find((c) => c.id === Number(id));
  const catName = (id) => (catById(id) || {}).name || '—';

  const value = {
    me,
    setMe,
    categories,
    equipment,
    borrows,
    maintenance,
    users,
    isStaff,
    isAdmin,
    isRequester,
    eqById,
    catById,
    catName,
    toast,
    toastMsg,
    loadAll,
    reload,
  };
  // Keep SETTERS referenced for future collection additions.
  void SETTERS;

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
