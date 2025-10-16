import React from 'react'

export default function IconButton({ icon, handleClick, size = 42, bg = "#fff" }) {
  return (
    <button
      onClick={handleClick}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: bg,
        border: "1.5px solid #ddd",
        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f9f9f9")}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = bg)}
    >
      <span style={{ fontSize: 18, color: "#333", fontWeight: 500 }}>
        {icon}
      </span>
    </button>
  );
}
