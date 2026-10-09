import {
  ListSkeleton,
  PageSkeleton,
} from "@/components/dashboard/page-skeletons";
import { ClientsHeader } from "./clients-header";

export default function ClientsLoading() {
  return (
    <PageSkeleton header={<ClientsHeader />}>
      <ListSkeleton />
    </PageSkeleton>
  );
}
