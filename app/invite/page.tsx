import { Suspense } from "react";
import { InviteContent } from "@/components/invite-content";

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteContent />
    </Suspense>
  );
}
