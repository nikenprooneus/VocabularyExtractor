import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchAllProfiles, updateUserRole } from '../services/supabaseService';
import { UserProfile } from '../types';
import { Shield, Users, Calendar, Loader, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { Navigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const loadProfiles = async () => {
    try {
      setIsLoading(true);
      const data = await fetchAllProfiles();
      setProfiles(data);
    } catch {
      toast.error('Failed to load user profiles');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
      loadProfiles();
    }
  }, [user]);

  const handleRoleChange = async (userId: string, currentRole: 'user' | 'admin') => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';

    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }

    setUpdatingUserId(userId);
    try {
      await updateUserRole(userId, newRole);
      setProfiles(profiles.map(p =>
        p.id === userId ? { ...p, role: newRole, updated_at: new Date().toISOString() } : p
      ));
      toast.success(`User role updated to ${newRole}`);
    } catch {
      toast.error('Failed to update user role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (!user || user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const totalUsers = profiles.length;
  const totalAdmins = profiles.filter(p => p.role === 'admin').length;
  const recentSignups = profiles.filter(p => {
    const createdDate = new Date(p.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createdDate > weekAgo;
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Shield className="w-8 h-8 text-amber-600" />
            Admin Dashboard
          </h1>
          <p className="text-slate-600 mt-1">Manage users and system settings</p>
        </div>
        <button
          onClick={loadProfiles}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-8 h-8 opacity-80" />
            <span className="text-3xl font-bold">{totalUsers}</span>
          </div>
          <p className="text-blue-100 font-medium">Total Users</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Shield className="w-8 h-8 opacity-80" />
            <span className="text-3xl font-bold">{totalAdmins}</span>
          </div>
          <p className="text-amber-100 font-medium">Total Admins</p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8 opacity-80" />
            <span className="text-3xl font-bold">{recentSignups}</span>
          </div>
          <p className="text-green-100 font-medium">Recent Signups (7d)</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">User Management</h2>
          <p className="text-sm text-slate-600 mt-1">View and manage all registered users</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {profile.email.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-900">
                        {profile.email}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {profile.role === 'admin' ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                        <Shield size={12} />
                        Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                        User
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {new Date(profile.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleRoleChange(profile.id, profile.role)}
                      disabled={updatingUserId === profile.id || profile.id === user.id}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        profile.role === 'admin'
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {updatingUserId === profile.id ? (
                        <span className="flex items-center gap-2">
                          <Loader size={14} className="animate-spin" />
                          Updating...
                        </span>
                      ) : profile.id === user.id ? (
                        'Current User'
                      ) : profile.role === 'admin' ? (
                        'Demote to User'
                      ) : (
                        'Promote to Admin'
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {profiles.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No users found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
