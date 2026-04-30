import { Metadata } from "next";

import { CommunitiesView } from "@/features/projects/components/communities-view";

export const metadata: Metadata = {
  title: "Community — Codura",
  description: "Discover public projects shared by the Codura community",
};

export default function CommunityPage() {
  return <CommunitiesView />;
}
