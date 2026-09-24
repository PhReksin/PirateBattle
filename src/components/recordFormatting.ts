export function formatDuration(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    return Math.floor(total / 60).toString().padStart(2, '0') + ':' +
        (total % 60).toString().padStart(2, '0');
}

export function formatRecordDate(iso: string) {
    const date = new Date(iso);
    return {
        day: new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' }).format(date).toUpperCase(),
        time: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }).format(date),
        full: date.toUTCString(),
    };
}