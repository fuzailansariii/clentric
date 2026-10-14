import {
  DetailHeaderSkeleton,
  FormSkeleton,
  PageSkeleton,
} from "@/components/dashboard/page-skeletons";

export default function EditClientLoading() {
  return (
    <PageSkeleton header={<DetailHeaderSkeleton />}>
      <FormSkeleton />
    </PageSkeleton>
  );
}
