export { cn } from "cn";

const COLOR_PROPERTIES: Record<string, string> = {
    bg: "background-color",
    text: "color",
    border: "border-top-color",
    outline: "outline-color",
    ring: "--tw-ring-color",
    fill: "fill",
    stroke: "stroke",
    decoration: "text-decoration-color",
    caret: "caret-color",
    accent: "accent-color",
    shadow: "--tw-shadow-color",
};

function oklchToHex(color: string): string | null {
    const match = color.match(/^oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)(?:deg)?(?:\s*\/\s*([\d.]+%?))?\s*\)$/i);
    if (!match) return null;

    const lightness = Number(match[1]) / (color.includes("%") ? 100 : 1);
    const chroma = Number(match[2]);
    const hue = (Number(match[3]) * Math.PI) / 180;
    if (!Number.isFinite(lightness) || !Number.isFinite(chroma) || !Number.isFinite(hue)) return null;

    const a = chroma * Math.cos(hue);
    const b = chroma * Math.sin(hue);
    const l_ = lightness + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = lightness - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = lightness - 0.0894841775 * a - 1.291485548 * b;
    const l = l_ ** 3;
    const m = m_ ** 3;
    const s = s_ ** 3;
    const red = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const green = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const blue = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
    const toSrgb = (channel: number) => {
        const value = Math.max(0, Math.min(1, channel));
        return Math.round((value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055) * 255);
    };

    const hex = `#${[red, green, blue]
        .map(toSrgb)
        .map((channel) => channel.toString(16).padStart(2, "0"))
        .join("")}`;
    if (!match[4]) return hex;

    const alpha = match[4].endsWith("%") ? Number(match[4].slice(0, -1)) / 100 : Number(match[4]);
    if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return null;
    return `${hex}${Math.round(alpha * 255)
        .toString(16)
        .padStart(2, "0")}`;
}

function colorToHex(color: string): string | null {
    if (color.startsWith("oklch(")) return oklchToHex(color);
    const match = color.match(/^rgba?\(\s*([\d.]+)\s*,?\s*([\d.]+)\s*,?\s*([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
    if (!match) return null;

    const channels = match.slice(1, 4).map((channel) => Math.round(Number(channel)));
    if (channels.some((channel) => channel < 0 || channel > 255)) return null;

    const hex = `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
    if (!match[4]) return hex;

    const alpha = match[4].endsWith("%") ? Number(match[4].slice(0, -1)) / 100 : Number(match[4]);
    if (!Number.isFinite(alpha) || alpha < 0 || alpha > 1) return null;
    return `${hex}${Math.round(alpha * 255)
        .toString(16)
        .padStart(2, "0")}`;
}

/** Resolves a Tailwind color utility using the active page theme and returns a hex color. */
export function tailwindColorToHex(className: string, property?: string): string | null {
    if (typeof document === "undefined") return null;

    const utility = className.trim().split(/\s+/).at(-1)?.split(":").at(-1);
    if (!utility) return null;

    const match = utility.match(/^(bg|text|border|outline|ring|fill|stroke|decoration|caret|accent|shadow)-/);
    const cssProperty = property ?? (match ? COLOR_PROPERTIES[match[1]] : undefined);
    if (!cssProperty) return null;

    const element = document.createElement("span");
    element.className = utility;
    element.setAttribute("aria-hidden", "true");
    element.style.position = "fixed";
    element.style.visibility = "hidden";
    document.body.appendChild(element);

    try {
        const color = getComputedStyle(element).getPropertyValue(cssProperty).trim();
        return color ? colorToHex(color) : null;
    } finally {
        element.remove();
    }
}
