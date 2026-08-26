import React, { useState } from "react";

export type MilestoneListItem = {
  id: string;
  title: string;
  status: "completed" | "pending";
  dueDate: string | null;
  createdAt: Date;
};

type MilestonesPanelProps = {
  projectId: string;
  initialMilestones: MilestoneListItem[];
};

export default function MilestonesPanel({
  projectId,
  initialMilestones,
}: MilestonesPanelProps) {
  const [milestones, setMilestones] =
    useState<MilestoneListItem[]>(initialMilestones);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleToggle = () => {};
  const handleDelete = () => {};
  const handleAdd = () => {};

  return <div className="flex px-5 py-3">MilestonesPanel</div>;
}
