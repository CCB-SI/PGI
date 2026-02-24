'use client';
import { getColorForTerm } from '@/utils/colors';

export default function Badge({ text, fallbackColor, style = {}, dot = false }) {
    if (!text) return null;

    const hex = getColorForTerm(text, fallbackColor);

    // Converte hex para RGB para fazer rgba no fundo
    const hexToRgb = (hexCode) => {
        let h = hexCode.replace('#', '');
        if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
        const r = parseInt(h.substring(0, 2), 16);
        const g = parseInt(h.substring(2, 4), 16);
        const b = parseInt(h.substring(4, 6), 16);
        return isNaN(r) ? '26, 77, 143' : `${r}, ${g}, ${b}`; // fallback para primary color
    };

    const rgb = hexToRgb(hex);

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '700',
            backgroundColor: `rgba(${rgb}, 0.12)`,
            color: hex,
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            border: `1px solid rgba(${rgb}, 0.2)`,
            ...style
        }}>
            {dot && (
                <span style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: hex,
                    display: 'inline-block'
                }}></span>
            )}
            {text.toUpperCase()}
        </span>
    );
}
