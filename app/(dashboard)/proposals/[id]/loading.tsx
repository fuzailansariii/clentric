import {
  DetailHeaderSkeleton,
  DocumentDetailSkeleton,
  PageSkeleton,
} from "@/components/dashboard/page-skeletons";

export default function ProposalLoading() {
  return (
    <PageSkeleton header={<DetailHeaderSkeleton subtitle={false} />}>
      <div className="pb-12">
        <DocumentDetailSkeleton />
      </div>
    </PageSkeleton>
  );
}
