import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface AutoFillButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function AutoFillButton({ onClick, disabled, isLoading }: AutoFillButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || isLoading}
      size="sm"
      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
      data-testid="button-smart-fill"
    >
      <Sparkles className="mr-2 h-4 w-4" />
      Smart Fill Roster
    </Button>
  );
}

