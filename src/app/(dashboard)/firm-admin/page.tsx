import { FirmGuard } from '../my-firm/_shared/FirmGuard';
import FirmAdmin from './FirmAdmin';

export default function Page() {
  return (
    <FirmGuard gate='global_admin'>
      <FirmAdmin />
    </FirmGuard>
  );
}
