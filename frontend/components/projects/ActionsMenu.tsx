'use client';

import { useEffect, useRef, useState } from 'react';
import { MoreVertical, Pencil, ExternalLink, Trash2 } from 'lucide-react';

interface ActionsMenuProps {
  onOpen: () => void;
  onRenameRequest: () => void;
  onDeleteRequest: () => void;
}

export default function ActionsMenu({ onOpen, onRenameRequest, onDeleteRequest }: ActionsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  function runAndClose(action: () => void) {
    setIsOpen(false);
    action();
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((value) => !value);
        }}
        aria-label="Project actions"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 30,
          borderRadius: 7,
          border: 'none',
          background: isOpen ? 'rgba(148, 163, 184, 0.14)' : 'transparent',
          color: 'rgba(226, 232, 240, 0.65)',
          cursor: 'pointer',
        }}
      >
        <MoreVertical size={16} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          onClick={(event) => event.stopPropagation()}
          style={{
            position: 'absolute',
            right: 0,
            top: 34,
            minWidth: 168,
            borderRadius: 8,
            border: '1px solid rgba(148, 163, 184, 0.18)',
            background: '#0a0c11',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
            padding: 4,
            zIndex: 15,
          }}
        >
          <MenuItem icon={ExternalLink} label="Open project" onClick={() => runAndClose(onOpen)} />
          <MenuItem icon={Pencil} label="Rename" onClick={() => runAndClose(onRenameRequest)} />
          <MenuItem
            icon={Trash2}
            label="Delete"
            danger
            onClick={() => runAndClose(onDeleteRequest)}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="flex items-center"
      style={{
        gap: 9,
        width: '100%',
        padding: '8px 10px',
        borderRadius: 6,
        border: 'none',
        background: 'transparent',
        color: danger ? '#f87171' : 'rgba(226, 232, 240, 0.85)',
        fontSize: 13,
        textAlign: 'left',
        cursor: 'pointer',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.background = 'rgba(148, 163, 184, 0.08)';
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon size={14} aria-hidden="true" />
      {label}
    </button>
  );
}
