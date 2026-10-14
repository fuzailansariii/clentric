import {
  DetailHeaderSkeleton,
  FormSkeleton,
  PageSkeleton,
} from "@/components/dashboard/page-skeletons";

export default function NewProjectLoading() {
  return (
    <PageSkeleton header={<DetailHeaderSkeleton />}>
      <FormSkeleton />
    </PageSkeleton>
  );
}
