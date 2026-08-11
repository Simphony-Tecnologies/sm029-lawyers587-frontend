import { FirmGuard } from '../_shared/FirmGuard';
import FirmLeads from './FirmLeads';

export default function Page() {
  return (
    <FirmGuard gate='firm_admin'>
      <FirmLeads />
    </FirmGuard>
  );
}
