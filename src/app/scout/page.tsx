import { getEventSchedule, getUniqueScouters } from '@/lib/data';
import ScoutForm from './ScoutForm';

export default async function ScoutPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
    const { event } = await searchParams;
    const eventKey = event || '2026txcle';
    const schedule = await getEventSchedule(eventKey);
    const scouters = await getUniqueScouters(eventKey);

    return (
        <ScoutForm
            initialSchedule={schedule}
            initialScouters={scouters}
            eventKey={eventKey}
        />
    );
}
