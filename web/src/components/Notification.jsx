import React, { useEffect, useState } from 'react';

export default function Notification({ notif, setNotif }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notif) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => setNotif(null), 300); // Wait for fade out
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notif, setNotif]);

  if (!notif) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 1000,
        background: '#ecfeff',
        border: '1px solid #a5f3fc',
        color: '#0e7490',
        padding: '16px 20px',
        borderRadius: 16,
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: 16,
        alignItems: 'center',
        minWidth: 320,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.3s ease-out',
      }}
    >
      <div>
        <div style={{ fontWeight: 900, fontSize: 14 }}>{notif.title}</div>
        <div style={{ fontSize: 13, marginTop: 4, opacity: 0.8 }}>{notif.body}</div>
      </div>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => setNotif(null), 300);
        }}
        style={{
          border: 'none',
          background: 'rgba(0,0,0,0.05)',
          color: '#0e7490',
          borderRadius: 8,
          padding: '4px 8px',
          fontWeight: 800,
          cursor: 'pointer',
          fontSize: 12
        }}
      >
        ✕
      </button>
    </div>
  );
}
