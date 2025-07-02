import React, { useEffect, useState } from "react"
import { Table } from "@/components/ui/table"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { ClockIcon, ArrowRightIcon } from "lucide-react"

interface Tx {
  signature: string
  timestamp: number
  amount: number
  symbol: string
}

export const ZipWalletTransactions: React.FC = () => {
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(false)

  const loadTxs = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/wallet/transactions?limit=50")
      const json = await res.json()
      setTxs(json.transactions)
    } catch {
      // handle
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTxs()
  }, [])

  return (
    <Card className="bg-white">
      <CardHeader className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Recent Transactions</h2>
        <button onClick={loadTxs} className="text-sm text-blue-600">
          {loading ? "Loading…" : "Reload"}
        </button>
      </CardHeader>
      <CardContent>
        <Table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Amount</th>
              <th>Token</th>
              <th>Signature</th>
            </tr>
          </thead>
          <tbody>
            {txs.map(tx => (
              <tr key={tx.signature}>
                <td className="flex items-center">
                  <ClockIcon className="mr-1 w-4 h-4" />
                  {new Date(tx.timestamp).toLocaleTimeString()}
                </td>
                <td className="flex items-center">
                  <ArrowRightIcon className="mr-1 w-4 h-4" />
                  {tx.amount.toFixed(4)}
                </td>
                <td>{tx.symbol}</td>
                <td className="truncate max-w-xs">{tx.signature}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </CardContent>
    </Card>
  )
}
