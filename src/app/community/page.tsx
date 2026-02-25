import { Metadata } from "next";

import { CommunitiesView } from "@/features/projects/components/communities-view";

export const metadata: Metadata = {
  title: "Community — Aura",
  description: "Discover public projects shared by the Aura community",
};

export default function CommunityPage() {
  return <CommunitiesView />;
}
