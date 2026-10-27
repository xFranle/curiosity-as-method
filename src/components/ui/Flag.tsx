import type { Locale } from "@/config";

/** Flag drawn as inline SVG (emoji flags render as plain letters on Windows). English → USA, Spanish → Argentina. */
export default function Flag({ locale, className = "" }: { locale: Locale; className?: string }) {
    return (
        <svg
            viewBox="0 0 24 16"
            aria-hidden="true"
            focusable="false"
            className={`block w-6 h-4 rounded-[3px] ring-1 ring-black/25 dark:ring-white/35 ${className}`}
        >
            {locale === "es" ? <Argentina /> : <UnitedStates />}
        </svg>
    );
}

function Argentina() {
    return (
        <>
            <rect width="24" height="16" fill="#74ACDF" />
            <rect y="5.33" width="24" height="5.34" fill="#FFFFFF" />
            <circle cx="12" cy="8" r="1.7" fill="#F6B40E" />
        </>
    );
}

const STRIPE = 16 / 13;
const STARS = [0, 1, 2].flatMap((row) => [0, 1, 2, 3].map((col) => ({ row, col })));

function UnitedStates() {
    return (
        <>
            <rect width="24" height="16" fill="#FFFFFF" />
            {[0, 2, 4, 6, 8, 10, 12].map((i) => (
                <rect key={i} y={i * STRIPE} width="24" height={STRIPE} fill="#B22234" />
            ))}
            <rect width="9.6" height={STRIPE * 7} fill="#3C3B6E" />
            {STARS.map(({ row, col }) => (
                <circle key={`${row}-${col}`} cx={1.5 + col * 2.2} cy={1.5 + row * 2.4} r="0.55" fill="#FFFFFF" />
            ))}
        </>
    );
}
