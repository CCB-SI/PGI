'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const { addToast } = useToast();
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const router = useRouter();
    const API_URL = '/api/v1';

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const formData = new URLSearchParams();
            formData.append('username', credentials.username);
            formData.append('password', credentials.password);

            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formData.toString()
            });

            if (!res.ok) {
                throw new Error('Email ou senha incorretos');
            }

            const data = await res.json();
            login(data.access_token, data.user);
            addToast('Login realizado com sucesso!');
            router.push('/');
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-in" style={{ maxWidth: '400px', margin: '80px auto', padding: '30px', background: 'white', borderRadius: '12px', boxShadow: '0 8px 30px rgba(0,0,0,0.05)' }}>
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{ color: 'var(--primary-color)', fontSize: '1.6rem', marginBottom: '8px' }}>Acesso Restrito</h1>
                <p style={{ color: 'var(--text-secondary)' }}>Faça login para gerenciar a Secretaria</p>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>E-mail</label>
                    <input
                        type="email"
                        name="username"
                        value={credentials.username}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                        placeholder="ex: admin@secretaria.com"
                    />
                </div>
                <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Senha</label>
                    <input
                        type="password"
                        name="password"
                        value={credentials.password}
                        onChange={handleChange}
                        required
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                    style={{ padding: '14px', fontSize: '1.1rem', marginTop: '10px' }}
                >
                    {loading ? 'Acessando...' : 'Entrar'}
                </button>
            </form>
        </div>
    );
}
