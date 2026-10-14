import {
  DetailHeaderSkeleton,
  FormSkeleton,
  PageSkeleton,
} from "@/components/dashboard/page-skeletons";

export default function EditInvoiceLoading() {
  return (
    <PageSkeleton header={<DetailHeaderSkeleton />}>
      <FormSkeleton aside />
    </PageSkeleton>
  );
}
