import React, { useState } from 'react';
import { GlobalConfig, AuthorizedUser } from '../../types';
import { ShieldCheck, Plus, Trash2, Key, CheckCircle2, XCircle, Pencil } from 'lucide-react';

interface UsersViewProps {
  config: GlobalConfig;
  onChange: (newConfig: GlobalConfig) => void;
  onNotify?: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export function UsersView({ config, onChange, onNotify }: UsersViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthorizedUser | null>(null);
  const [newUser, setNewUser] = useState<Partial<AuthorizedUser>>({
    name: '',
    email: '',
    role: 'visor',
    status: 'ACTIVO'
  });

  const users = config.authorizedUsers || [];

  const handleSaveUser = () => {
    if (!newUser.name || !newUser.email || !newUser.role) {
      if (onNotify) onNotify("Nombre, Email y Rol son requeridos", "error");
      return;
    }

    const user: AuthorizedUser = {
      id: `usr-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role as 'admin' | 'operador' | 'visor',
      status: newUser.status as 'ACTIVO' | 'INACTIVO' || 'ACTIVO',
      createdAt: new Date().toISOString().split('T')[0]
    };

    const newConfig = {
      ...config,
      authorizedUsers: [...users, user]
    };
    onChange(newConfig);
    if (onNotify) onNotify(`Usuario ${user.name} autorizado correctamente`, "success");
    setIsModalOpen(false);
    setNewUser({ name: '', email: '', role: 'visor', status: 'ACTIVO' });
  };

  const handleToggleStatus = (id: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' as 'ACTIVO' | 'INACTIVO' };
      }
      return u;
    });
    onChange({ ...config, authorizedUsers: updatedUsers });
    if (onNotify) onNotify("Estado de usuario actualizado", "success");
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      const updatedUsers = users.filter(u => u.id !== id);
      onChange({ ...config, authorizedUsers: updatedUsers });
      if (onNotify) onNotify("Usuario eliminado", "success");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-mono uppercase">Admin</span>;
      case 'operador': return <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-mono uppercase">Operador</span>;
      default: return <span className="px-2 py-0.5 rounded bg-stone-500/10 text-stone-400 border border-stone-500/20 text-xs font-mono uppercase">Visor</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVO') {
      return (
        <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono">
          <CheckCircle2 className="w-3 h-3" /> Activo
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-mono">
        <XCircle className="w-3 h-3" /> Inactivo
      </span>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-orange-500" />
            Usuarios Autorizados
          </h2>
          <p className="text-sm text-stone-400 mt-1">Control de acceso y roles para el sistema de costos.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-orange-500 text-black font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider hover:bg-orange-400 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Autorizar Usuario
        </button>
      </div>

      <div className="bg-[#110f0e] border border-stone-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-stone-300">
            <thead className="bg-[#1a1715] text-stone-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-4 font-semibold">Nombre</th>
                <th className="px-4 py-4 font-semibold">Email</th>
                <th className="px-4 py-4 font-semibold">Rol</th>
                <th className="px-4 py-4 font-semibold">Estado</th>
                <th className="px-4 py-4 font-semibold">Fecha de Alta</th>
                <th className="px-4 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                    No hay usuarios autorizados registrados.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-stone-900/40 transition-colors">
                    <td className="px-4 py-4 font-medium text-white">{u.name}</td>
                    <td className="px-4 py-4 font-mono text-xs text-stone-400">{u.email}</td>
                    <td className="px-4 py-4">{getRoleBadge(u.role)}</td>
                    <td className="px-4 py-4">{getStatusBadge(u.status)}</td>
                    <td className="px-4 py-4 font-mono text-xs text-stone-500">{u.createdAt}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-orange-400 hover:bg-stone-800 transition-colors"
                          title="Editar Usuario"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleToggleStatus(u.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
                          title={u.status === 'ACTIVO' ? 'Desactivar' : 'Activar'}
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-stone-800 transition-colors"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#110f0e] border border-stone-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Autorizar Nuevo Usuario</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Nombre Completo</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  className="w-full bg-[#1a1715] border border-stone-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="Ej. Juan Pérez"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Email (Google)</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full bg-[#1a1715] border border-stone-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors font-mono"
                  placeholder="usuario@gmail.com"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Rol de Acceso</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  className="w-full bg-[#1a1715] border border-stone-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="admin">Administrador (Control Total)</option>
                  <option value="operador">Operador (Edición Limitada)</option>
                  <option value="visor">Visor (Solo Lectura)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-stone-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-6 py-2 rounded-xl text-sm transition-colors"
              >
                Guardar Usuario
              </button>
            </div>
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#110f0e] border border-stone-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Editar Usuario</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Nombre Completo</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full bg-[#1a1715] border border-stone-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Email (Google)</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-[#1a1715] border border-stone-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Rol de Acceso</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  className="w-full bg-[#1a1715] border border-stone-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="admin">Administrador (Control Total)</option>
                  <option value="operador">Operador (Edición Limitada)</option>
                  <option value="visor">Visor (Solo Lectura)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5 uppercase tracking-wider">Estado</label>
                <select
                  value={editingUser.status}
                  onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                  className="w-full bg-[#1a1715] border border-stone-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors appearance-none cursor-pointer"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="INACTIVO">INACTIVO</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-sm font-medium text-stone-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const updatedUsers = users.map(u => u.id === editingUser.id ? editingUser : u);
                  onChange({ ...config, authorizedUsers: updatedUsers });
                  if (onNotify) onNotify("Usuario actualizado con éxito", "success");
                  setEditingUser(null);
                }}
                className="bg-orange-500 hover:bg-orange-400 text-black font-bold px-6 py-2 rounded-xl text-sm transition-colors"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
