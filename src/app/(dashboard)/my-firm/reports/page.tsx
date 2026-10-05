import { FirmGuard } from '../_shared/FirmGuard';
import FirmReports from './FirmReports';

export default function Page() {
  return (
    <FirmGuard gate='firm_admin'>
      <FirmReports />
    </FirmGuard>
  );
}
