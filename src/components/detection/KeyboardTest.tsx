import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface KeyboardTestProps {
  onComplete: (allPassed: boolean, testedCount: number, totalKeys: number) => void;
}

const MAC_KEYBOARD_LAYOUT = [
  ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
  ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
  ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
  ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
  ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'ShiftRight'],
  ['Fn', 'Control', 'Alt', 'Meta', 'Space', 'MetaRight', 'AltRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'],
];

const KEY_DISPLAY_MAP: Record<string, string> = {
  'Escape': 'Esc',
  'Backspace': '⌫',
  'Tab': '⇥',
  'CapsLock': 'Caps',
  'Enter': '⏎',
  'Shift': '⇧',
  'ShiftRight': '⇧',
  'Control': '⌃',
  'Alt': '⌥',
  'AltRight': '⌥',
  'Meta': '⌘',
  'MetaRight': '⌘',
  'Space': '␣',
  'ArrowLeft': '←',
  'ArrowRight': '→',
  'ArrowUp': '↑',
  'ArrowDown': '↓',
  'Fn': 'fn',
};

export function KeyboardTest({ onComplete }: KeyboardTestProps) {
  const { t } = useTranslation();
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());
  
  const totalKeys = MAC_KEYBOARD_LAYOUT.flat().length;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    
    let mappedKey = key;
    if (e.code === 'ShiftRight') mappedKey = 'ShiftRight';
    if (e.code === 'MetaRight') mappedKey = 'MetaRight';
    if (e.code === 'AltRight') mappedKey = 'AltRight';
    
    setPressedKeys(prev => new Set([...prev, mappedKey]));
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleFinish = () => {
    const testedCount = pressedKeys.size;
    const allPassed = testedCount === totalKeys;
    onComplete(allPassed, testedCount, totalKeys);
  };

  const getKeyWidth = (key: string) => {
    if (key === 'Space') return '200px';
    if (key === 'Backspace' || key === 'Tab' || key === 'CapsLock') return '70px';
    if (key === 'Enter' || key === 'Shift' || key === 'ShiftRight') return '80px';
    return '40px';
  };

  return (
    <div className="keyboard-test section">
      <div className="container">
        <div className="card" style={{ maxWidth: '900px', margin: '0 auto', padding: '32px' }}>
          <h2 style={{ marginBottom: '8px', textAlign: 'center' }}>{t('keyboard.title')}</h2>
          <p style={{ marginBottom: '24px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            {t('keyboard.instruction')}
          </p>

          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <span style={{ 
              fontSize: '24px', 
              fontWeight: 'bold',
              color: pressedKeys.size === totalKeys ? 'var(--color-success)' : 'var(--color-primary)'
            }}>
              {pressedKeys.size} / {totalKeys}
            </span>
            <span style={{ marginLeft: '8px', color: 'var(--color-text-secondary)' }}>
              {t('keyboard.tested')}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center', marginBottom: '32px' }}>
            {MAC_KEYBOARD_LAYOUT.map((row, rowIndex) => (
              <div key={rowIndex} style={{ display: 'flex', gap: '4px' }}>
                {row.map((key) => {
                  const isPressed = pressedKeys.has(key);
                  const displayKey = KEY_DISPLAY_MAP[key] || key.toUpperCase();
                  
                  return (
                    <div
                      key={key}
                      style={{
                        width: getKeyWidth(key),
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 500,
                        transition: 'all 0.15s ease',
                        backgroundColor: isPressed ? 'var(--color-success)' : 'var(--color-background)',
                        color: isPressed ? 'white' : 'var(--color-text)',
                        border: isPressed ? 'none' : '1px solid var(--color-border)',
                      }}
                    >
                      {displayKey}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={handleFinish}>
              {t('screen.finish')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
