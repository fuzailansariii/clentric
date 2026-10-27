import {
  DetailHeaderSkeleton,
  PageSkeleton,
  RecordDetailSkeleton,
} from "@/components/dashboard/page-skeletons";

export default function ClientLoading() {
  return (
    <PageSkeleton header={<DetailHeaderSkeleton />}>
      <RecordDetailSkeleton />
    </PageSkeleton>
  );
}
