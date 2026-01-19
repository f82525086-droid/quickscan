import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SkipForward } from 'lucide-react';

interface KeyboardTestProps {
  onComplete: (allPassed: boolean, testedCount: number, totalKeys: number) => void;
  onSkip: () => void;
}

const MAC_KEYBOARD_LAYOUT = [
  ['Escape', 'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'],
  ['Backquote', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal', 'Backspace'],
  ['Tab', 'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP', 'BracketLeft', 'BracketRight', 'Backslash'],
  ['CapsLock', 'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL', 'Semicolon', 'Quote', 'Enter'],
  ['ShiftLeft', 'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period', 'Slash', 'ShiftRight'],
  ['ControlLeft', 'AltLeft', 'MetaLeft', 'Space', 'MetaRight', 'AltRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'ArrowRight'],
];

const ALL_KEYS = MAC_KEYBOARD_LAYOUT.flat();
const VALID_KEYS_SET = new Set(ALL_KEYS);
const TOTAL_KEYS = ALL_KEYS.length;

const KEY_DISPLAY_MAP: Record<string, string> = {
  'Escape': 'Esc',
  'Backquote': '`',
  'Digit1': '1', 'Digit2': '2', 'Digit3': '3', 'Digit4': '4', 'Digit5': '5',
  'Digit6': '6', 'Digit7': '7', 'Digit8': '8', 'Digit9': '9', 'Digit0': '0',
  'Minus': '-', 'Equal': '=',
  'Backspace': '⌫',
  'Tab': '⇥',
  'KeyQ': 'Q', 'KeyW': 'W', 'KeyE': 'E', 'KeyR': 'R', 'KeyT': 'T',
  'KeyY': 'Y', 'KeyU': 'U', 'KeyI': 'I', 'KeyO': 'O', 'KeyP': 'P',
  'BracketLeft': '[', 'BracketRight': ']', 'Backslash': '\\',
  'CapsLock': 'Caps',
  'KeyA': 'A', 'KeyS': 'S', 'KeyD': 'D', 'KeyF': 'F', 'KeyG': 'G',
  'KeyH': 'H', 'KeyJ': 'J', 'KeyK': 'K', 'KeyL': 'L',
  'Semicolon': ';', 'Quote': "'",
  'Enter': '⏎',
  'ShiftLeft': '⇧', 'ShiftRight': '⇧',
  'KeyZ': 'Z', 'KeyX': 'X', 'KeyC': 'C', 'KeyV': 'V', 'KeyB': 'B',
  'KeyN': 'N', 'KeyM': 'M',
  'Comma': ',', 'Period': '.', 'Slash': '/',
  'ControlLeft': '⌃',
  'AltLeft': '⌥', 'AltRight': '⌥',
  'MetaLeft': '⌘', 'MetaRight': '⌘',
  'Space': '␣',
  'ArrowLeft': '←', 'ArrowRight': '→', 'ArrowUp': '↑', 'ArrowDown': '↓',
};

export function KeyboardTest({ onComplete, onSkip }: KeyboardTestProps) {
  const { t } = useTranslation();
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(new Set());

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    // 只记录布局中存在的按键
    if (VALID_KEYS_SET.has(e.code)) {
      setPressedKeys(prev => new Set([...prev, e.code]));
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 计算已测试的有效按键数量
  const testedCount = [...pressedKeys].filter(key => VALID_KEYS_SET.has(key)).length;

  const handleFinish = () => {
    const allPassed = testedCount === TOTAL_KEYS;
    onComplete(allPassed, testedCount, TOTAL_KEYS);
  };

  const getKeyWidth = (key: string) => {
    if (key === 'Space') return '200px';
    if (key === 'Backspace' || key === 'Tab' || key === 'CapsLock') return '70px';
    if (key === 'Enter' || key === 'ShiftLeft' || key === 'ShiftRight') return '80px';
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
              color: testedCount === TOTAL_KEYS ? 'var(--color-success)' : 'var(--color-primary)'
            }}>
              {testedCount} / {TOTAL_KEYS}
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

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={handleFinish}>
              {t('screen.finish')}
            </button>
            <button className="btn btn-secondary" onClick={onSkip}>
              <SkipForward size={20} />
              {t('common.skip')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
