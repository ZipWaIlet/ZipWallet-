import React, { useEffect, useState } from "react"
import { Table } from "@/components/ui/table"
import { Card, CardHeader, CardContent } from "@/components/ui/card"
import { ClockIcon, ArrowRightIcon } from "lucide-react"
import { Toast } from "@/components/ui/toast"

interface Tx {
  signature: string
  timestamp: number
  amount: number
  symbol: string
}

export const ZipWalletTransactions: React.FC = () => {
  const [txs, setTxs] = useState<Tx[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const loadTxs = async (page: number = 1) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/wallet/transactions?limit=50&page=${page}`)
      if (!res.ok) throw new Error("Failed to fetch transactions")
      const json = await res.json()
      setTxs(json.transactions)
      setTotal(json.total)
    } catch (err: any) {
      setError(err.message || "Something went wrong.")
    } finally {
      setLoading(false)
    }
  }

  const handleNextPage = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadTxs(nextPage)
  }

  const handlePreviousPage = () => {
    if (page > 1) {
      const prevPage = page - 1
      setPage(prevPage)
      loadTxs(prevPage)
    }
  }

  useEffect(() => {
    loadTxs(page)
  }, [page])

  return (
    <Card className="bg-white">
      <CardHeader className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Recent Transactions</h2>
        <button onClick={() => loadTxs(page)} className="text-sm text-blue-600">
          {loading ? "Loading…" : "Reload"}
        </button>
      </CardHeader>
      <CardContent>
        {error && <Toast message={error} type="error" />}
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

        <div className="flex justify-between mt-4">
          <button
            onClick={handlePreviousPage}
            disabled={page === 1}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
          >
            Previous
          </button>
          <button
            onClick={handleNextPage}
            disabled={page * 50 >= total}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
          >
            Next
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
