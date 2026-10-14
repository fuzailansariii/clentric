import {
  ListSkeleton,
  PageSkeleton,
} from "@/components/dashboard/page-skeletons";
import { InvoicesHeader } from "./invoices-header";

export default function InvoicesLoading() {
  return (
    <PageSkeleton header={<InvoicesHeader />}>
      <ListSkeleton summary mark="square" />
    </PageSkeleton>
  );
}
