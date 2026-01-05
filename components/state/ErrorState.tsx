type ErrorStateProps = {
    message: string;
}

export default function ErrorState({
    message
}: ErrorStateProps) {
    return (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <p className="text-lg text-red-600">{message}</p>
        </div>
    );
}
