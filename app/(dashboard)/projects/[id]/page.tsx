import React from "react";

type ProjectDetailProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetail({ params }: ProjectDetailProps) {
  const { id } = await params;
  console.log("ProjectId: ", id);

  return <div>ProjectDetail</div>;
}
