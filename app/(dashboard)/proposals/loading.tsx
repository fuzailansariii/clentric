import {
  ListSkeleton,
  PageSkeleton,
} from "@/components/dashboard/page-skeletons";
import { ProposalsHeader } from "./proposals-header";

export default function ProposalsLoading() {
  return (
    <PageSkeleton header={<ProposalsHeader />}>
      <ListSkeleton summary mark="square" />
    </PageSkeleton>
  );
}
