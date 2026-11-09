'use client';

import type { DashboardPeriodDTO } from '@/types';
import { useMemo, useState } from 'react';

interface PaymentTrendChartProps {
    periods: DashboardPeriodDTO[];
}

export default function PaymentTrendChart({ periods }: PaymentTrendChartProps) {
    const [range, setRange] = useState<'3' | '6' | '12' | 'all'>('all');
    const chartPeriods = useMemo(() => {
        const chronological = [...periods].reverse();
        if (range === 'all') return chronological;
        return chronological.slice(-Number(range));
    }, [periods, range]);
    const width = 1200;
    const height = 240;
    const padding = { top: 24, right: 20, bottom: 48, left: 42 };
    const maxValue = Math.max(...chartPeriods.map((period) => period.payingCustomerCount), 1);
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    const points = chartPeriods.map((period, index) => {
        const x = chartPeriods.length === 1
            ? padding.left + plotWidth / 2
            : padding.left + (index / (chartPeriods.length - 1)) * plotWidth;
        const y = padding.top + plotHeight - (period.payingCustomerCount / maxValue) * plotHeight;
        return { period, x, y };
    });
    const linePoints = points.map(({ x, y }) => `${x},${y}`).join(' ');
    const areaPoints = `${padding.left},${padding.top + plotHeight} ${linePoints} ${padding.left + plotWidth},${padding.top + plotHeight}`;

    return (
        <section className="rounded-2xl md:rounded-3xl bg-white shadow-sm border border-slate-200 p-3 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3 md:mb-4">
                <div>
                    <h2 className="text-base md:text-lg font-bold text-slate-800">Frekuensi Pembayaran</h2>
                </div>
                <select
                    value={range}
                    onChange={(event) => setRange(event.target.value as typeof range)}
                    className="w-full sm:w-auto min-h-10 px-3 py-2 bg-neutral-100 border-0 rounded-lg text-xs font-medium text-neutral-700 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    aria-label="Rentang grafik pembayaran"
                >
                    <option value="3">3 bulan terakhir</option>
                    <option value="6">6 bulan terakhir</option>
                    <option value="12">12 bulan terakhir</option>
                    <option value="all">Semua periode</option>
                </select>
            </div>

            {chartPeriods.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-sm text-slate-400">
                    Belum ada data pembayaran.
                </div>
            ) : (
                <div className="w-full">
                    <svg
                        viewBox={`0 0 ${width} ${height}`}
                        className="w-full h-44 sm:h-60 md:h-72"
                        role="img"
                        aria-label="Grafik jumlah pelanggan yang membayar per bulan"
                    >
                        <defs>
                            <linearGradient id="payment-trend-fill" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="#29b6f6" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#e6f7ff" stopOpacity="0.04" />
                            </linearGradient>
                        </defs>
                        {[0, 0.5, 1].map((ratio) => {
                            const y = padding.top + plotHeight * ratio;
                            const value = Math.round(maxValue * (1 - ratio));
                            return (
                                <g key={ratio}>
                                    <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
                                    <text x={padding.left - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[11px]">{value}</text>
                                </g>
                            );
                        })}
                        <polygon points={areaPoints} fill="url(#payment-trend-fill)" />
                        <polyline points={linePoints} fill="none" stroke="#0288d1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                        {points.map(({ period, x, y }, index) => {
                            const showLabel = chartPeriods.length <= 6 || index % 2 === 0 || index === points.length - 1;
                            return (
                            <g key={period.period}>
                                <title>{`${period.periodLabel}: ${period.payingCustomerCount} pelanggan`}</title>
                                <circle cx={x} cy={y} r="5" fill="white" stroke="#0288d1" strokeWidth="3" />
                                {showLabel && (
                                    <text x={x} y={height - 18} textAnchor="middle" className="fill-slate-500 text-[11px]">
                                        {period.periodLabel.split(' ')[0].slice(0, 3)}
                                    </text>
                                )}
                            </g>
                            );
                        })}
                    </svg>
                </div>
            )}
        </section>
    );
}
