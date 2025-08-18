import React from "react"
import { TokenInsightCard } from "./TokenInsightCard"
import { RiskSignalBadge } from "./RiskSignalBadge"
import { WalletActivityGraph } from "./WalletActivityGraph"
import { WhaleTransferList } from "./WhaleTransferList"
import { AlertBanner } from "./AlertBanner"

export interface AnalyzerDashboardProps {
  alertMessage: string
  tokenData: {
    name: string
    riskLevel: "Low" | "Medium" | "High"
    volume: number
  }
  whaleTransfers: {
    amount: number
    token: string
    address: string
  }[]
  walletActivity: {
    time: string
    value: number
  }[]
}

export const AnalyzerDashboard: React.FC<AnalyzerDashboardProps> = ({
  alertMessage,
  tokenData,
  whaleTransfers,
  walletActivity,
}) => {
  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen">
      <AlertBanner message={alertMessage} />

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TokenInsightCard
          tokenName={tokenData.name}
          riskLevel={tokenData.riskLevel}
          volume={tokenData.volume}
        />
        <div className="flex items-center justify-center">
          <RiskSignalBadge level={tokenData.riskLevel} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="text-white font-semibold mb-2">Wallet Activity</h4>
          <WalletActivityGraph data={walletActivity} />
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <h4 className="text-white font-semibold mb-2">Recent Whale Transfers</h4>
          <WhaleTransferList transfers={whaleTransfers} />
        </div>
      </section>
    </div>
  )
}
