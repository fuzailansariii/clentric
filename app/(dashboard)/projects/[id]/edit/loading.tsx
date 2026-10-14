import {
  DetailHeaderSkeleton,
  FormSkeleton,
  PageSkeleton,
} from "@/components/dashboard/page-skeletons";

export default function EditProjectLoading() {
  return (
    <PageSkeleton header={<DetailHeaderSkeleton />}>
      <FormSkeleton />
    </PageSkeleton>
  );
}
