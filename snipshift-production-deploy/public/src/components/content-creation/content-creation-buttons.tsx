import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Edit } from "lucide-react";
import JobPostingModal from "./job-posting-modal";
import SocialPostingModal from "./social-posting-modal";

interface ContentCreationButtonsProps {
  userRole: "hub" | "professional" | "brand" | "trainer";
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export default function ContentCreationButtons({ 
  userRole, 
  variant = "default", 
  size = "default" 
}: ContentCreationButtonsProps) {
  const [showJobModal, setShowJobModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState(false);

  const handlePostJob = () => {
    setShowJobModal(true);
  };

  const handleCreateSocialPost = () => {
    setShowSocialModal(true);
  };

  return (
    <>
      {userRole === "hub" && (
        <Button
          onClick={handlePostJob}
          variant={variant}
          size={size}
          data-testid="button-post-job"
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Post a Job
        </Button>
      )}

      {(userRole === "brand" || userRole === "trainer") && (
        <Button
          onClick={handleCreateSocialPost}
          variant={variant}
          size={size}
          data-testid="button-create-post"
          className="bg-primary hover:bg-primary/90"
        >
          <Edit className="mr-2 h-4 w-4" />
          Create Post
        </Button>
      )}

      <JobPostingModal
        isOpen={showJobModal}
        onClose={() => setShowJobModal(false)}
      />

      <SocialPostingModal
        isOpen={showSocialModal}
        onClose={() => setShowSocialModal(false)}
      />
    </>
  );
}