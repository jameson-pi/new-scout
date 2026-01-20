import { getEventSchedule, getUniqueScouters } from '@/lib/data';
import ScoutForm from './ScoutForm';

export default async function ScoutPage() {
    const schedule = await getEventSchedule();
    const scouters = getUniqueScouters();

    return (
        <ScoutForm
            initialSchedule={schedule}
            initialScouters={scouters}
        />
    );
}
