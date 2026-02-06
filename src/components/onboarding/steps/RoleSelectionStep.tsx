import { Building2, User } from 'lucide-react';

type RoleSelectionStepProps = {
  selectedRole: 'professional' | 'venue' | null;
  isSelectionEnabled: boolean;
  onSelectProfessional: () => void;
  onSelectVenue: () => void;
};

/**
 * Step 0: Role selection for onboarding.
 */
export const RoleSelectionStep = ({
  selectedRole,
  isSelectionEnabled,
  onSelectProfessional,
  onSelectVenue,
}: RoleSelectionStepProps) => (
  <div className="space-y-6">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-white mb-2" data-testid="onboarding-hub-heading">
        What brings you to HospoGo?
      </h2>
      <p className="text-gray-300">Select your role to get started</p>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        type="button"
        data-testid="role-professional"
        onClick={onSelectProfessional}
        className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${
          selectedRole === 'professional'
            ? 'border-brand-neon bg-brand-neon/10 shadow-neon-realistic'
            : 'border-zinc-700 bg-zinc-800/50 hover:border-brand-neon/50'
        } ${isSelectionEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
      >
        <div
          className={`p-4 rounded-full mb-4 ${
            selectedRole === 'professional' ? 'bg-brand-neon text-black' : 'bg-zinc-700 text-white'
          }`}
        >
          <User className="h-8 w-8" />
        </div>
        <h3
          className={`text-lg font-semibold mb-2 ${
            selectedRole === 'professional' ? 'text-brand-neon' : 'text-white'
          }`}
        >
          I'm looking for shifts
        </h3>
        <p className="text-sm text-gray-400 text-center">
          Pick up hospitality shifts and get paid
        </p>
      </button>
      <button
        type="button"
        data-testid="role-business"
        onClick={onSelectVenue}
        className={`flex flex-col items-center p-6 rounded-xl border-2 transition-all ${
          selectedRole === 'venue'
            ? 'border-brand-neon bg-brand-neon/10 shadow-neon-realistic'
            : 'border-zinc-700 bg-zinc-800/50 hover:border-brand-neon/50'
        } ${isSelectionEnabled ? 'cursor-pointer' : 'cursor-not-allowed'}`}
      >
        <div
          className={`p-4 rounded-full mb-4 ${
            selectedRole === 'venue' ? 'bg-brand-neon text-black' : 'bg-zinc-700 text-white'
          }`}
        >
          <Building2 className="h-8 w-8" />
        </div>
        <h3
          className={`text-lg font-semibold mb-2 ${
            selectedRole === 'venue' ? 'text-brand-neon' : 'text-white'
          }`}
        >
          I need to fill shifts
        </h3>
        <p className="text-sm text-gray-400 text-center">
          Post shifts and find reliable staff
        </p>
      </button>
    </div>
  </div>
);
