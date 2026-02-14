import React from 'react';
import { useAuthContext } from '../hooks/useAuth.jsx';
import useOnboardingLeads from '../hooks/useOnboardingLeads';
import OnboardingLeadCard from '../components/OnboardingLeadCard';
import Topbar from '../components/Topbar';
import Spinner from '../components/Spinner';

export default function ProcesoPage() {
  const { user } = useAuthContext() || {};
  const { onboardingLeads, loading } = useOnboardingLeads(user?.uid);

  return (
    <>
      <Topbar />
      <div className="p-4 md:p-6 bg-gray-50 flex-1">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-gray-800">
          Leads en Proceso de Alta
        </h1>
        {loading ? (
          <Spinner />
        ) : onboardingLeads.length > 0 ? (
          // ✅ Apilado vertical
          <div className="flex flex-col gap-4">
            {onboardingLeads.map(lead => (
              <div key={lead.id} className="w-full">
                <OnboardingLeadCard lead={lead} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 bg-white rounded-lg border">
            <p className="text-gray-500">
              No hay leads en proceso de alta en este momento.
            </p>
          </div>
        )}
      </div>
    </>
  );
}
