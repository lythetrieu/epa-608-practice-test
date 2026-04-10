'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'

type UserRow = {
  id: string
  email: string
  tier: string
  lifetime_access: boolean
  created_at: string
  total_tests: number
  last_test_date: string | null
}

type SortKey = 'email' | 'tier' | 'created_at' | 'total_tests' | 'last_test_date'

export function UsersAdminClient({ users }: { users: UserRow[] }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortAsc, setSortAsc] = useState(false)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    let list = q ? users.filter((u) => u.email.toLowerCase().includes(q)) : users

    list = [...list].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'email':
          cmp = a.email.localeCompare(b.email)
          break
        case 'tier':
          cmp = a.tier.localeCompare(b.tier)
          break
        case 'created_at':
          cmp = a.created_at.localeCompare(b.created_at)
          break
        case 'total_tests':
          cmp = a.total_tests - b.total_tests
          break
        case 'last_test_date':
          cmp = (a.last_test_date ?? '').localeCompare(b.last_test_date ?? '')
          break
      }
      return sortAsc ? cmp : -cmp
    })

    return list
  }, [users, search, sortKey, sortAsc])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(key === 'email')
    }
  }

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return ''
    return sortAsc ? ' \u2191' : ' \u2193'
  }

  const tierBadge = (tier: string, lifetime: boolean) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-100 text-gray-600',
      starter: 'bg-blue-100 text-blue-700',
      ultimate: 'bg-amber-100 text-amber-700',
    }
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[tier] ?? colors.free}`}>
        {tier}{lifetime ? ' (LT)' : ''}
      </span>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 text-sm mt-1">
          {users.length} total users &middot; Admin tool for refund verification
        </p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-800 focus:border-transparent"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th
                  className="px-6 py-3 text-left font-medium cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => handleSort('email')}
                >
                  Email{sortIcon('email')}
                </th>
                <th
                  className="px-6 py-3 text-left font-medium cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => handleSort('tier')}
                >
                  Tier{sortIcon('tier')}
                </th>
                <th
                  className="px-6 py-3 text-left font-medium cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => handleSort('created_at')}
                >
                  Joined{sortIcon('created_at')}
                </th>
                <th
                  className="px-6 py-3 text-left font-medium cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => handleSort('total_tests')}
                >
                  Tests{sortIcon('total_tests')}
                </th>
                <th
                  className="px-6 py-3 text-left font-medium cursor-pointer hover:text-gray-700 select-none"
                  onClick={() => handleSort('last_test_date')}
                >
                  Last Test{sortIcon('last_test_date')}
                </th>
                <th className="px-6 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    {search ? 'No users match your search.' : 'No users found.'}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-800 font-medium">{u.email}</td>
                    <td className="px-6 py-3">{tierBadge(u.tier, u.lifetime_access)}</td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-gray-500">{u.total_tests}</td>
                    <td className="px-6 py-3 text-gray-400">
                      {u.last_test_date
                        ? new Date(u.last_test_date).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-3">
                      <Link
                        href={`/admin/users/${u.id}`}
                        className="text-blue-800 hover:text-blue-900 text-sm font-medium hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>
    </div>
  )
}
