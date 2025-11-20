import IntegratedProfileSystem from "@/components/profile/integrated-profile-system";

interface ProfilePageProps {
  userId?: string;
}

export default function ProfilePage({ userId }: ProfilePageProps) {
  return <IntegratedProfileSystem userId={userId} />;
}