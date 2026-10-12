import {
  ListSkeleton,
  PageSkeleton,
} from "@/components/dashboard/page-skeletons";
import { ProjectsHeader } from "./projects-header";

export default function ProjectsLoading() {
  return (
    <PageSkeleton header={<ProjectsHeader />}>
      <ListSkeleton mark="square" />
    </PageSkeleton>
  );
}
