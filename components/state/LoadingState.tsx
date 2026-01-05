type LoadingStateProps = {
    message?: string;
}

export default function LoadingState({
    message = "Memuat data..."
}: LoadingStateProps) {
    return (
        <div className="flex justify-center items-center py-20">
            <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-lg text-primary-600">{message}</p>
            </div>
        </div>
    );
}
