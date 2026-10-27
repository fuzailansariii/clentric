import {
  DetailHeaderSkeleton,
  PageSkeleton,
  RecordDetailSkeleton,
} from "@/components/dashboard/page-skeletons";

export default function ProjectLoading() {
  return (
    <PageSkeleton header={<DetailHeaderSkeleton />}>
      <RecordDetailSkeleton />
    </PageSkeleton>
  );
}
