import { useReadContract, useReadContracts, useChainId, useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACT_ABI, getContractAddress } from '@/lib/contract';
import { useMemo } from 'react';

interface Survey {
  id: number;
  title: string;
  description: string;
  productCount: bigint;
  productNames: string[];
  endTime: bigint;
  isActive: boolean;
  isFinalized: boolean;
  admin: string;
  totalResponses: bigint;
}

export default function Index() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const contractAddress = getContractAddress(chainId) as `0x${string}`;
  
  // Get survey count
  const { data: surveyCount, isLoading: isLoadingCount } = useReadContract({
    address: contractAddress,
    abi: CONTRACT_ABI,
    functionName: 'getSurveyCount',
    query: {
      enabled: !!contractAddress,
    },
  });

  // Create contracts array for batch reading
  const contracts = useMemo(() => {
    if (!surveyCount || Number(surveyCount) === 0) return [];
    return Array.from({ length: Number(surveyCount) }, (_, i) => ({
      address: contractAddress,
      abi: CONTRACT_ABI,
      functionName: 'getSurvey' as const,
      args: [BigInt(i)] as const,
    }));
  }, [surveyCount, contractAddress]);

  // Batch read all surveys
  const { data: surveysData, isLoading: isLoadingSurveys } = useReadContracts({
    contracts,
  });

  // Transform the data
  const surveys: Survey[] = useMemo(() => {
    if (!surveysData) return [];
    return surveysData
      .map((result, index) => {
        if (!result.data || result.error) return null;
        const [
          title,
          description,
          productCount,
          productNames,
          endTime,
          isActive,
          isFinalized,
          admin,
          totalResponses,
        ] = result.data as [string, string, bigint, string[], bigint, boolean, boolean, string, bigint];
        return {
          id: index,
          title,
          description,
          productCount,
          productNames,
          endTime,
          isActive,
          isFinalized,
          admin,
          totalResponses,
        };
      })
      .filter((s): s is Survey => s !== null);
  }, [surveysData]);

  const activeSurveys = surveys.filter(s => s.isActive);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">Cipher Insights Hub</h1>
            <p className="mt-2 text-gray-600">
              Privacy-preserving product satisfaction surveys using FHE technology
            </p>
          </div>
          <ConnectButton />
        </div>
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Active Surveys</h2>
          {!isConnected ? (
            <div className="border rounded-lg p-6 text-center">
              <p className="text-gray-500 mb-4">Please connect your wallet to view surveys</p>
              <ConnectButton />
            </div>
          ) : isLoadingCount || isLoadingSurveys ? (
            <p className="text-gray-500">Loading surveys...</p>
          ) : activeSurveys.length === 0 ? (
            <p className="text-gray-500">No active surveys available.</p>
          ) : (
            <div className="grid gap-4">
              {activeSurveys.map((survey) => (
                <div key={survey.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-medium text-lg">{survey.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{survey.description}</p>
                  <div className="mt-3 flex gap-4 text-sm text-gray-500">
                    <span>Products: {Number(survey.productCount)}</span>
                    <span>Responses: {Number(survey.totalResponses)}</span>
                    <span>
                      Ends: {new Date(Number(survey.endTime) * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

