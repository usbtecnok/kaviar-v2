import { useState, useEffect } from 'react';
import { api } from '../api/client';

export function PassengerProfile() {
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const res = await api.get('/passengers/me/profile');
    if (res.data.success) {
      setProfile(res.data.profile);
      setName(res.data.profile.name);
      setPhone(res.data.profile.phone);
    }
  };

  const save = async () => {
    await api.put('/passengers/me/profile', { name, phone });
    setEditing(false);
    loadProfile();
  };

  if (!profile) return <div>Carregando...</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Meu Perfil</h2>
      
      {!editing ? (
        <div>
          <p><strong>Nome:</strong> {profile.name}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Telefone:</strong> {profile.phone}</p>
          <button onClick={() => setEditing(true)} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
            Editar
          </button>
        </div>
      ) : (
        <div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nome" className="border p-2 w-full mb-2" />
          <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Telefone" className="border p-2 w-full mb-2" />
          <button onClick={save} className="bg-green-500 text-white px-4 py-2 rounded mr-2">Salvar</button>
          <button onClick={() => setEditing(false)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancelar</button>
        </div>
      )}
    </div>
  );
}
