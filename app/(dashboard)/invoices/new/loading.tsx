import {
  DetailHeaderSkeleton,
  FormSkeleton,
  PageSkeleton,
} from "@/components/dashboard/page-skeletons";

export default function NewInvoiceLoading() {
  return (
    <PageSkeleton header={<DetailHeaderSkeleton />}>
      <FormSkeleton aside />
    </PageSkeleton>
  );
}
