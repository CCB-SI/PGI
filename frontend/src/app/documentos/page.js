'use client';
import { useState, useEffect, useCallback } from 'react';
import { fetchLocations, fetchDocumentTemplates } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useRouter } from 'next/navigation';
import Badge from '@/components/Badge';
import { Files, FileEdit, File, FolderOpen, Upload } from 'lucide-react';

export default function DocumentManagement() {
    const { user, loading: authLoading } = useAuth();
    const { addToast } = useToast();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [locations, setLocations] = useState([]);

    // States for Document Generation
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [docCandidateName, setDocCandidateName] = useState('');
    const [docCandidateRole, setDocCandidateRole] = useState('');
    const [docLocationId, setDocLocationId] = useState('');
    const [docLoading, setDocLoading] = useState(false);

    // States for Template Upload
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateFile, setNewTemplateFile] = useState(null);
    const [templateLoading, setTemplateLoading] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [locationsData, templatesData] = await Promise.all([
                fetchLocations(),
                fetchDocumentTemplates().catch(() => [])
            ]);

            setLocations(locationsData);
            setTemplates(templatesData);
            if (templatesData && templatesData.length > 0) {
                setSelectedTemplate(templatesData[0].id.toString());
            }
        } catch (err) {
            console.error(err);
            addToast('Erro ao carregar os dados de documentos', 'error');
        } finally {
            setLoading(false);
        }
    }, [addToast]);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            router.push('/login');
        } else {
            // Apenas Admin e Editor tem acesso à gestão de documentos interativa
            if (user.role !== 'admin' && user.role !== 'editor') {
                router.push('/');
                addToast('Acesso negado. Apenas coordenadores podem gerar documentos.', 'error');
            } else {
                loadData();
            }
        }
    }, [user, authLoading, router, addToast, loadData]);

    if (authLoading || (!user && !authLoading)) return <p style={{ padding: '40px', textAlign: 'center' }}>Carregando...</p>;

    const handleGenerateDoc = async () => {
        if (!selectedTemplate || !docCandidateName.trim() || !docLocationId) {
            addToast('Preencha os dados do candidato e o modelo do documento.', 'warning');
            return;
        }
        setDocLoading(true);
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const res = await fetch(`${API_URL}/documents/generate_custom/${selectedTemplate}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
            },
            body: JSON.stringify({
                candidate_name: docCandidateName.trim(),
                candidate_role: docCandidateRole,
                location_id: docLocationId
            })
        });

        if (!res.ok) {
            let errMsg = 'Erro ao gerar documento';
            try {
                const err = await res.json();
                errMsg = err.detail || errMsg;
            } catch (e) { }
            throw new Error(errMsg);
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => window.URL.revokeObjectURL(url), 1000);

        setDocCandidateName('');
        setDocLocationId('');

        addToast('Documento gerado com sucesso!');
    } catch (err) {
        addToast(err.message || 'Erro ao gerar documento', 'error');
    } finally {
        setDocLoading(false);
    }
};

const handleUploadTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateFile) {
        addToast('Preencha o nome de exibição e selecione o arquivo PDF.', 'warning');
        return;
    }
    setTemplateLoading(true);
    try {
        const formData = new FormData();
        formData.append('name', newTemplateName);
        formData.append('file', newTemplateFile);
        formData.append('version', '1.0');

        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
        const res = await fetch(`${API_URL}/documents/templates`, {
            method: 'POST',
            headers: {
                ...(typeof window !== 'undefined' && localStorage.getItem('token') ? { 'Authorization': `Bearer ${localStorage.getItem('token')}` } : {})
            },
            body: formData
        });

        if (!res.ok) {
            let errMsg = 'Erro ao fazer upload do modelo';
            try {
                const err = await res.json();
                errMsg = err.detail || errMsg;
            } catch (e) { }
            throw new Error(errMsg);
        }

        addToast('Novo modelo cadastrado com sucesso!');
        setNewTemplateName('');
        setNewTemplateFile(null);
        document.getElementById('templateFileInput').value = '';
        await loadData();
    } catch (err) {
        addToast(err.message || 'Erro no upload', 'error');
    } finally {
        setTemplateLoading(false);
    }
};

return (
    <div className="animate-in">
        <div style={{ background: '#f8f9fa', padding: '30px', borderRadius: '8px', marginBottom: '40px', borderLeft: '5px solid #2196F3' }}>
            <h1 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Files size={28} /> Gestão de Documentos
            </h1>
            <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>
                Cadastre novos modelos de PDF Interativo e gere documentos preenchidos automaticamente.
            </p>
        </div>

        {loading ? (
            <div className="skeleton" style={{ height: '300px', width: '100%' }} />
        ) : (
            <div style={{ display: 'grid', gap: '40px' }}>

                {/* Emissão de Documentos */}
                <section>
                    <div style={{ marginBottom: '20px' }}>
                        <h2 style={{ margin: '0 0 10px 0' }}>Emissão de Documentos (M02, M03, etc)</h2>
                        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                            Preenchimento automático de formulários ministeriais. Selecione o modelo abaixo e use o gerador Automático ou Manual.
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start', background: 'var(--surface-color)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                        <div style={{ flex: '2 1 300px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Candidato (Nome Completo)</label>
                            <input
                                type="text"
                                value={docCandidateName}
                                onChange={(e) => setDocCandidateName(e.target.value)}
                                placeholder="Ex: João da Silva"
                                style={{ width: '100%', padding: '10px' }}
                            />
                        </div>

                        <div style={{ flex: '1 1 150px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Cargo Almejado</label>
                            <input
                                type="text"
                                value={docCandidateRole}
                                onChange={(e) => setDocCandidateRole(e.target.value)}
                                placeholder="Ex: Músico, Organista"
                                style={{ width: '100%', padding: '10px' }}
                            />
                        </div>

                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Comum Congregação</label>
                            <select
                                value={docLocationId}
                                onChange={(e) => setDocLocationId(e.target.value)}
                                style={{ width: '100%', padding: '10px' }}
                            >
                                <option value="">-- Selecione --</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name} - {loc.city}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', background: 'var(--surface-color)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)', borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0, flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Modelo do Documento</label>
                            <select
                                value={selectedTemplate}
                                onChange={(e) => setSelectedTemplate(e.target.value)}
                                style={{ width: '100%', padding: '10px' }}
                                disabled={templates.length === 0}
                            >
                                {templates.length === 0 && <option value="">Nenhum modelo cadastrado</option>}
                                {templates.map(t => (
                                    <option key={t.id} value={t.id}>{t.name} (v{t.version})</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                className="btn-secondary"
                                onClick={() => {
                                    if (!selectedTemplate) return;
                                    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
                                    window.open(`${API_URL}/documents/templates/${selectedTemplate}/view`, '_blank');
                                }}
                                disabled={!selectedTemplate}
                                style={{ height: '42px', padding: '0 15px' }}
                                title="Abre o formulário em branco para preencher manualmente no navegador"
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileEdit size={16} /> Preencher Manualmente</span>
                            </button>

                            <button
                                className="btn-primary"
                                onClick={handleGenerateDoc}
                                disabled={docLoading || !docCandidateName.trim() || !docLocationId || !selectedTemplate}
                                style={{ height: '42px', minWidth: '150px', background: '#2196F3' }}
                            >
                                {docLoading ? 'Gerando...' : <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><File size={16} /> Gerar PDF (Auto)</span>}
                            </button>
                        </div>
                    </div>
                </section>

                {/* Cadastrar/Upload de Novos Modelos de PDF (Admin Only) */}
                {user?.role === 'admin' && (
                    <section style={{ marginTop: '20px', paddingTop: '40px', borderTop: '2px solid #ddd' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '8px' }}><FolderOpen size={24} /> Upload de Novos Modelos</h2>
                                <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.9rem' }}>
                                    Faça upload de PDFs interativos (AcroForm) para padronizar e automatizar a emissão de novos documentos.
                                </p>
                            </div>
                            <Badge text="ADMIN" style={{ background: '#f44336', color: 'white', border: 'none' }} />
                        </div>

                        <form onSubmit={handleUploadTemplate} className="form-group" style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', background: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd', flexWrap: 'wrap' }}>
                            <div style={{ flex: '2 1 250px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Nome do Formulário/Documento</label>
                                <input
                                    type="text"
                                    value={newTemplateName}
                                    onChange={e => setNewTemplateName(e.target.value)}
                                    placeholder="Ex: M03 - Pedido de Mudança"
                                    required
                                    style={{ width: '100%', padding: '10px' }}
                                />
                            </div>
                            <div style={{ flex: '2 1 250px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Arquivo PDF Interativo</label>
                                <input
                                    id="templateFileInput"
                                    type="file"
                                    accept="application/pdf"
                                    onChange={e => setNewTemplateFile(e.target.files[0])}
                                    required
                                    style={{ width: '100%', padding: '7px', background: 'white', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                            </div>
                            <button
                                type="submit"
                                className="btn-primary"
                                disabled={templateLoading || !newTemplateName || !newTemplateFile}
                                style={{ height: '42px', minWidth: '150px', background: '#2196F3' }}
                            >
                                {templateLoading ? 'Enviando...' : <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Upload size={16} /> Fazer Upload</span>}
                            </button>
                        </form>
                    </section>
                )}

            </div>
        )}
    </div>
);
}
