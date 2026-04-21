import { redirect } from "next/navigation";

// The dedicated full-page timeline view has moved to /timeline/[projectId].
// This route stays only as a redirect for any old bookmarks or inbound links.
export default async function LegacyTimelineRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/timeline/${id}`);
}
