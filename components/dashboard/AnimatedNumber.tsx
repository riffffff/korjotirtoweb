'use client';

import { useEffect, useState } from 'react';

export default function AnimatedNumber({ value, duration = 300 }: { value: number; duration?: number }) {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        let startTime: number;
        let frame: number;
        const animate = (time: number) => {
            if (!startTime) startTime = time;
            const progress = Math.min((time - startTime) / duration, 1);
            setDisplayValue(Math.floor(progress * value));
            if (progress < 1) frame = requestAnimationFrame(animate);
        };
        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [value, duration]);
    return <span>{displayValue}</span>;
}
