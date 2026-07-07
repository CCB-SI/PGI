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
    const [r, g, b] = rgb.split(',').map((value) => Number(value.trim()));

    const relativeLuminance = (red, green, blue) => {
        const normalize = (channel) => {
            const v = channel / 255;
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        const rn = normalize(red);
        const gn = normalize(green);
        const bn = normalize(blue);
        return 0.2126 * rn + 0.7152 * gn + 0.0722 * bn;
    };

    const darkenHex = (hexCode, factor = 0.35) => {
        const h = hexCode.replace('#', '');
        const fullHex = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
        const rr = parseInt(fullHex.substring(0, 2), 16);
        const gg = parseInt(fullHex.substring(2, 4), 16);
        const bb = parseInt(fullHex.substring(4, 6), 16);

        const darkened = (channel) => Math.max(0, Math.floor(channel * (1 - factor)));
        return `rgb(${darkened(rr)}, ${darkened(gg)}, ${darkened(bb)})`;
    };

    const isLightColor = relativeLuminance(r || 0, g || 0, b || 0) > 0.45;
    const badgeTextColor = isLightColor ? darkenHex(hex) : hex;

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '0.75rem',
            fontWeight: '700',
            backgroundColor: `rgba(${rgb}, 0.18)`,
            color: badgeTextColor,
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            border: `1px solid rgba(${rgb}, 0.28)`,
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
