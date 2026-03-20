'use client';
import { useEffect, useMemo, useState } from 'react';

const WEEKDAY_RRULE = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const WEEKDAY_PT   = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function buildRecurrenceOptions(startTimeStr) {
    const base = [
        { label: 'Sem recorrência (evento único)', value: '' },
        { label: 'Toda semana (mesmo dia)', value: 'FREQ=WEEKLY' },
        { label: 'Todo mês (mesmo dia do mês)', value: 'FREQ=MONTHLY' },
        { label: 'Todo ano', value: 'FREQ=YEARLY' },
    ];

    if (startTimeStr) {
        const d = new Date(startTimeStr);
        if (!Number.isNaN(d.getTime())) {
            const wd = d.getDay(); // 0=Sun … 6=Sat
            const byday = WEEKDAY_RRULE[wd];
            const dayPt = WEEKDAY_PT[wd];
            const ordinals = [
                { label: `1ª ${dayPt} do mês`, pos: 1 },
                { label: `2ª ${dayPt} do mês`, pos: 2 },
                { label: `3ª ${dayPt} do mês`, pos: 3 },
                { label: `4ª ${dayPt} do mês`, pos: 4 },
                { label: `Última ${dayPt} do mês`, pos: -1 },
            ];
            ordinals.forEach(({ label, pos }) =>
                base.splice(-1, 0, { label, value: `FREQ=MONTHLY;BYDAY=${byday};BYSETPOS=${pos}` })
            );
        }
    }

    base.push({ label: 'Personalizada (RRULE manual)', value: '__custom__' });
    return base;
}

function RecurrenceField({ value, startTime, onChange }) {
    const options = useMemo(() => buildRecurrenceOptions(startTime), [startTime]);
    const knownValues = useMemo(() => new Set(options.map((o) => o.value)), [options]);

    // If the current value is a known option OR empty, drive via select; else show custom input
    const isCustom = value && !knownValues.has(value);
    const selectValue = isCustom ? '__custom__' : (value || '');

    const handleSelectChange = (e) => {
        const v = e.target.value;
        if (v === '__custom__') {
            // Switch to custom mode but keep current text or reset
            onChange(isCustom ? value : '');
        } else {
            onChange(v);
        }
    };

    return (
        <>
            <select value={selectValue} onChange={handleSelectChange}>
                {options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
            {(selectValue === '__custom__') && (
                <input
                    style={{ marginTop: '6px' }}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Ex: FREQ=MONTHLY;BYDAY=WE;BYSETPOS=3"
                />
            )}
        </>
    );
}

const DEFAULT_FORM = {
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    category_id: '',
    event_type: 'RMA',
    agenda_scope: 'Administrativa',
    target_audience: 'Ministerial',
    location_id: '',
    space_name: '',
    estimated_people: '',
    duration_minutes: '',
    serve_meals: false,
    is_online: false,
    recurrence_rule: '',
    instructions: '',
    image_url: '',
    category: 'Administrativo',
};

function toDateTimeLocal(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offsetMs = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - offsetMs);
    return local.toISOString().slice(0, 16);
}

function toLocalApiDateTime(value) {
    if (!value) return null;
    // Keep local wall-clock time from datetime-local input (no UTC conversion).
    return value.length === 16 ? `${value}:00` : value;
}

export default function EventModal({
    eventData,
    categories,
    locations,
    eventTypes,
    onSave,
    onClose,
    onCreateCategory,
}) {
    const [form, setForm] = useState(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);
    const [generalError, setGeneralError] = useState('');
    const [fieldErrors, setFieldErrors] = useState({});
    const [newCategoryName, setNewCategoryName] = useState('');
    const [creatingCategory, setCreatingCategory] = useState(false);

    const selectedLocation = useMemo(
        () => locations.find((loc) => String(loc.id) === String(form.location_id)),
        [locations, form.location_id]
    );

    const isGeofenceCity = useMemo(() => {
        const city = (selectedLocation?.city || '').toLowerCase();
        return ['santa isabel', 'arujá', 'aruja', 'igaratá', 'igarata'].includes(city);
    }, [selectedLocation]);

    useEffect(() => {
        if (eventData) {
            setForm({
                title: eventData.title || '',
                description: eventData.description || '',
                start_time: toDateTimeLocal(eventData.start_time),
                end_time: toDateTimeLocal(eventData.end_time),
                category_id: eventData.category_id ? String(eventData.category_id) : '',
                event_type: eventData.event_type || 'RMA',
                agenda_scope: eventData.agenda_scope || 'Administrativa',
                target_audience: eventData.target_audience || 'Ministerial',
                location_id: eventData.location_id ? String(eventData.location_id) : '',
                space_name: eventData.space_name || '',
                estimated_people: eventData.estimated_people ?? '',
                duration_minutes: eventData.duration_minutes ?? '',
                serve_meals: Boolean(eventData.serve_meals),
                is_online: Boolean(eventData.is_online),
                recurrence_rule: eventData.recurrence_rule || '',
                instructions: eventData.instructions || '',
                image_url: eventData.image_url || '',
                category: eventData.category || 'Administrativo',
            });
            return;
        }

        setForm((prev) => ({
            ...DEFAULT_FORM,
            category_id: categories[0] ? String(categories[0].id) : '',
            event_type: eventTypes.administrative?.[0] || DEFAULT_FORM.event_type,
        }));
    }, [eventData, categories, eventTypes]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));

        if (generalError) setGeneralError('');
        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const handleCreateCategory = async () => {
        if (!onCreateCategory) {
            setGeneralError('Cadastro de categoria não disponível neste contexto.');
            return;
        }

        const name = newCategoryName.trim();
        if (!name) {
            setGeneralError('Informe o nome da categoria.');
            return;
        }

        setCreatingCategory(true);
        setGeneralError('');
        try {
            const created = await onCreateCategory(name);
            if (created?.id) {
                setForm((prev) => ({
                    ...prev,
                    category_id: String(created.id),
                    category: created.name || prev.category,
                }));
            }
            setNewCategoryName('');
        } catch (error) {
            const message = error?.message || 'Não foi possível criar a categoria.';
            setGeneralError(message);
        } finally {
            setCreatingCategory(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const nextErrors = {};
        setGeneralError('');

        if (!form.category_id) {
            nextErrors.category_id = 'Selecione uma categoria.';
        }
        if (!form.location_id) {
            nextErrors.location_id = 'Selecione um local.';
        }
        if (isGeofenceCity) {
            if (form.serve_meals && !form.estimated_people) {
                nextErrors.estimated_people = 'Obrigatório quando Servir Refeições estiver marcado.';
            }
            if (!form.duration_minutes) {
                nextErrors.duration_minutes = 'Obrigatório para programação da cozinha nas cidades atendidas.';
            }
        }
        if (form.is_online && !form.space_name.trim()) {
            nextErrors.space_name = 'Eventos online exigem espaço físico informado.';
        }

        if (!form.start_time) {
            nextErrors.start_time = 'Informe a data/hora de início.';
        }

        if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            return;
        }
        setFieldErrors({});

        const payload = {
            title: form.title.trim(),
            description: form.description.trim(),
            start_time: toLocalApiDateTime(form.start_time),
            end_time: toLocalApiDateTime(form.end_time),
            image_url: form.image_url?.trim() || null,
            category: form.category,
            category_id: Number(form.category_id),
            event_type: form.event_type,
            agenda_scope: form.agenda_scope,
            location_id: Number(form.location_id),
            target_audience: form.target_audience,
            instructions: form.instructions?.trim() || null,
            space_name: form.space_name?.trim() || null,
            estimated_people: form.estimated_people ? Number(form.estimated_people) : null,
            duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
            serve_meals: Boolean(form.serve_meals),
            is_online: Boolean(form.is_online),
            recurrence_rule: form.recurrence_rule?.trim() || null,
        };

        setSaving(true);
        try {
            await onSave(payload, eventData?.id);
        } catch (error) {
            const message = error?.message || 'Não foi possível salvar o evento.';
            setGeneralError(message);

            if (message.includes('Conflito de ocupação')) {
                setFieldErrors((prev) => ({
                    ...prev,
                    start_time: 'Conflito de horário para este local/espaço.',
                    space_name: 'Conflito de horário para este local/espaço.',
                }));
            }

            if (message.includes('excede a capacidade')) {
                setFieldErrors((prev) => ({
                    ...prev,
                    estimated_people: message,
                }));
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal-content modal-large">
                <button className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
                <h2 className="modal-title">{eventData ? 'Editar Evento' : 'Novo Evento'}</h2>

                {generalError && (
                    <div style={{
                        marginBottom: '16px',
                        padding: '10px 12px',
                        borderRadius: 'var(--border-radius-sm)',
                        border: '1px solid var(--warning-color)',
                        color: 'var(--text-primary)',
                        background: 'var(--surface-color)',
                        fontSize: '0.9rem',
                    }}>
                        {generalError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="comum-form">
                    <div className="form-grid">
                        <div className="form-group full-width">
                            <label>Título *</label>
                            <input name="title" value={form.title} onChange={handleChange} required />
                        </div>

                        <div className="form-group full-width">
                            <label>Descrição *</label>
                            <textarea name="description" rows="3" value={form.description} onChange={handleChange} required />
                        </div>

                        <div className="form-group">
                            <label>Início *</label>
                            <input type="datetime-local" name="start_time" value={form.start_time} onChange={handleChange} required />
                            {fieldErrors.start_time && <small style={{ color: 'var(--warning-color)' }}>{fieldErrors.start_time}</small>}
                        </div>

                        <div className="form-group">
                            <label>Fim</label>
                            <input type="datetime-local" name="end_time" value={form.end_time} onChange={handleChange} />
                        </div>

                        <div className="form-group">
                            <label>Tipo de Evento *</label>
                            <select name="event_type" value={form.event_type} onChange={handleChange} required>
                                {(eventTypes.all || []).map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Escopo *</label>
                            <select name="agenda_scope" value={form.agenda_scope} onChange={handleChange}>
                                <option value="Administrativa">Administrativa</option>
                                <option value="Espiritual/Geral">Espiritual/Geral</option>
                                <option value="Ministerial">Ministerial</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Público-alvo *</label>
                            <select name="target_audience" value={form.target_audience} onChange={handleChange}>
                                <option value="Público">Público</option>
                                <option value="Ministerial">Ministerial</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Categoria *</label>
                            <select name="category_id" value={form.category_id} onChange={handleChange} required>
                                {categories.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            {fieldErrors.category_id && <small style={{ color: 'var(--warning-color)' }}>{fieldErrors.category_id}</small>}

                            <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                                <input
                                    value={newCategoryName}
                                    onChange={(e) => setNewCategoryName(e.target.value)}
                                    placeholder="Nova categoria"
                                />
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={handleCreateCategory}
                                    disabled={creatingCategory || !onCreateCategory}
                                >
                                    {creatingCategory ? 'Criando...' : '+ Categoria'}
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Local *</label>
                            <select name="location_id" value={form.location_id} onChange={handleChange} required>
                                <option value="">Selecione...</option>
                                {locations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>{loc.name} ({loc.city})</option>
                                ))}
                            </select>
                            {fieldErrors.location_id && <small style={{ color: 'var(--warning-color)' }}>{fieldErrors.location_id}</small>}
                        </div>

                        <div className="form-group">
                            <label>Espaço físico</label>
                            <input name="space_name" value={form.space_name} onChange={handleChange} placeholder="Ex: Salão Principal" />
                            {fieldErrors.space_name && <small style={{ color: 'var(--warning-color)' }}>{fieldErrors.space_name}</small>}
                        </div>

                        <div className="form-group">
                            <label>Quantidade estimada</label>
                            <input type="number" min="1" name="estimated_people" value={form.estimated_people} onChange={handleChange} />
                            {fieldErrors.estimated_people && <small style={{ color: 'var(--warning-color)' }}>{fieldErrors.estimated_people}</small>}
                        </div>

                        <div className="form-group">
                            <label>Duração (min)</label>
                            <input type="number" min="1" name="duration_minutes" value={form.duration_minutes} onChange={handleChange} />
                            {fieldErrors.duration_minutes && <small style={{ color: 'var(--warning-color)' }}>{fieldErrors.duration_minutes}</small>}
                        </div>

                        <div className="form-group full-width" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input id="serve_meals" type="checkbox" name="serve_meals" checked={form.serve_meals} onChange={handleChange} />
                            <label htmlFor="serve_meals" style={{ margin: 0 }}>Servir refeições</label>
                        </div>

                        <div className="form-group full-width">
                            <label>Recorrência</label>
                            <RecurrenceField
                                value={form.recurrence_rule}
                                startTime={form.start_time}
                                onChange={(val) => setForm((prev) => ({ ...prev, recurrence_rule: val }))}
                            />
                        </div>

                        <div className="form-group full-width" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input id="is_online" type="checkbox" name="is_online" checked={form.is_online} onChange={handleChange} />
                            <label htmlFor="is_online" style={{ margin: 0 }}>Evento online (reserva física obrigatória)</label>
                        </div>

                        <div className="form-group full-width">
                            <label>Instruções</label>
                            <textarea name="instructions" rows="2" value={form.instructions} onChange={handleChange} placeholder="Orientações adicionais" />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? 'Salvando...' : (eventData ? 'Atualizar' : 'Criar Evento')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
