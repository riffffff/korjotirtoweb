type StandMeterProps = {
    meterStart?: number;
    meterEnd: number;
    usage?: number;
}

export default function StandMeter({
    meterEnd,
    meterStart,
    usage
}: StandMeterProps) {
    return (
        <div className="border border-neutral-200 rounded-lg p-3">
            <p className="text-xs font-medium text-neutral-400 mb-2">Stand Meter</p>
            <div className="grid grid-cols-3 gap-2 text-center">
                <div className="py-2 bg-neutral-50 rounded-md">
                    <p className="text-[10px] text-neutral-400 mb-0.5">Meter Awal</p>
                    <p className="text-sm font-bold text-neutral-700">{meterStart} m³</p>
                </div>
                <div className="py-2 bg-neutral-50 rounded-md">
                    <p className="text-[10px] text-neutral-400 mb-0.5">Meter Akhir</p>
                    <p className="text-sm font-bold text-neutral-700">{meterEnd} m³</p>
                </div>
                <div className="py-2 bg-blue-50 rounded-md">
                    <p className="text-[10px] text-blue-500 mb-0.5">Penggunaan</p>
                    <p className="text-sm font-bold text-blue-600">{usage} m³</p>
                </div>
            </div>
        </div>
    )
}