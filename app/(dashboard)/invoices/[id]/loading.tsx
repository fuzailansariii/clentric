import {
  DetailHeaderSkeleton,
  DocumentDetailSkeleton,
} from "@/components/dashboard/page-skeletons";

export default function InvoiceLoading() {
  return (
    <div className="@container">
      <DetailHeaderSkeleton />
      <div className="px-4 pt-5 pb-7 @[560px]:px-8 @[560px]:pt-7 @[560px]:pb-10">
        <DocumentDetailSkeleton
          columns="@[900px]:grid-cols-[minmax(0,1fr)_312px] @[1180px]:grid-cols-[minmax(0,1fr)_360px]"
          railCards={4}
        />
      </div>
    </div>
  );
}
