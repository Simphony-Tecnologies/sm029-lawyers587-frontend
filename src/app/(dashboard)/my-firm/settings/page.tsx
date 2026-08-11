import { FirmGuard } from '../_shared/FirmGuard';
import Settings from './Settings';

export default function Page() {
  return (
    <FirmGuard gate='firm_admin'>
      <Settings />
    </FirmGuard>
  );
}
