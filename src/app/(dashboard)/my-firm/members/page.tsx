import { FirmGuard } from '../_shared/FirmGuard';
import Members from './Members';

export default function Page() {
  return (
    <FirmGuard gate='firm_admin'>
      <Members />
    </FirmGuard>
  );
}
