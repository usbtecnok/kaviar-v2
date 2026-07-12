import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Add, CheckCircleOutline, DeleteOutline, Edit, Email, RadioButtonUnchecked } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import api from '../../api';

const STATUS_OPTIONS = [
  'NOT_STARTED',
  'CONTACTED',
  'WAITING_RESPONSE',
  'RESPONSE_RECEIVED',
  'DOCUMENTS_REQUESTED',
  'READY_TO_PROTOCOL',
  'PROTOCOL_SENT',
  'APPROVED',
  'REJECTED',
  'PAUSED',
];

const STATUS_LABELS = {
  NOT_STARTED: 'Não iniciado',
  CONTACTED: 'Contatado',
  WAITING_RESPONSE: 'Aguardando resposta',
  RESPONSE_RECEIVED: 'Resposta recebida',
  DOCUMENTS_REQUESTED: 'Documentos solicitados',
  READY_TO_PROTOCOL: 'Pronto para protocolo',
  PROTOCOL_SENT: 'Protocolo enviado',
  APPROVED: 'Aprovado',
  REJECTED: 'Indeferido',
  PAUSED: 'Pausado',
};

const STATUS_COLORS = {
  NOT_STARTED: { bg: '#F3F4F6', color: '#374151' },
  CONTACTED: { bg: '#DBEAFE', color: '#1E40AF' },
  WAITING_RESPONSE: { bg: '#FEF3C7', color: '#92400E' },
  RESPONSE_RECEIVED: { bg: '#DCFCE7', color: '#166534' },
  DOCUMENTS_REQUESTED: { bg: '#FCE7F3', color: '#9D174D' },
  READY_TO_PROTOCOL: { bg: '#EDE9FE', color: '#5B21B6' },
  PROTOCOL_SENT: { bg: '#CCFBF1', color: '#0F766E' },
  APPROVED: { bg: '#D1FAE5', color: '#065F46' },
  REJECTED: { bg: '#FEE2E2', color: '#991B1B' },
  PAUSED: { bg: '#E5E7EB', color: '#374151' },
};

const CHECKLIST_STATUS_OPTIONS = ['PENDING', 'IN_PROGRESS', 'DONE', 'NOT_APPLICABLE'];

const CHECKLIST_STATUS_LABELS = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  DONE: 'Concluído',
  NOT_APPLICABLE: 'Não aplicável',
};

const CHECKLIST_STATUS_COLORS = {
  PENDING: { bg: '#F3F4F6', color: '#374151' },
  IN_PROGRESS: { bg: '#FEF3C7', color: '#92400E' },
  DONE: { bg: '#DCFCE7', color: '#166534' },
  NOT_APPLICABLE: { bg: '#E5E7EB', color: '#374151' },
};

const DRIVER_PROTOCOL_STATUS_OPTIONS = [
  'PREPARING',
  'READY_TO_SUBMIT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'REJECTED',
  'NEEDS_COMPLEMENT',
];

const DRIVER_PROTOCOL_STATUS_LABELS = {
  PREPARING: 'Preparando documentação',
  READY_TO_SUBMIT: 'Pronto para protocolar',
  SUBMITTED: 'Protocolado',
  UNDER_REVIEW: 'Em análise',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  NEEDS_COMPLEMENT: 'Exige complementação',
};

const DRIVER_PROTOCOL_STATUS_COLORS = {
  PREPARING: { bg: '#E2E8F0', color: '#334155' },
  READY_TO_SUBMIT: { bg: '#DBEAFE', color: '#1E40AF' },
  SUBMITTED: { bg: '#CCFBF1', color: '#0F766E' },
  UNDER_REVIEW: { bg: '#FEF3C7', color: '#92400E' },
  APPROVED: { bg: '#DCFCE7', color: '#166534' },
  REJECTED: { bg: '#FEE2E2', color: '#991B1B' },
  NEEDS_COMPLEMENT: { bg: '#FCE7F3', color: '#9D174D' },
};

const MUNICIPAL_MODALITY_OPTIONS = ['CAR', 'MOTO_PASSENGER', 'MOTO_DELIVERY', 'TAXI', 'VAN'];

const MUNICIPAL_MODALITY_LABELS = {
  CAR: 'CAR',
  MOTO_PASSENGER: 'MOTO_PASSENGER',
  MOTO_DELIVERY: 'MOTO_DELIVERY',
  TAXI: 'TAXI',
  VAN: 'VAN',
};

const AUTHORIZATION_OPERATIONAL_LABELS = {
  NOT_GENERATED: 'Autorização ainda não gerada',
  ACTIVE: 'Autorização municipal ativa',
  EXPIRING_SOON: 'Autorização vence em breve',
  EXPIRED: 'Autorização municipal vencida',
  REVIEW_REQUIRED: 'Autorização exige revisão',
};

const AUTHORIZATION_OPERATIONAL_COLORS = {
  NOT_GENERATED: { bg: 'rgba(148,163,184,0.2)', color: '#E2E8F0' },
  ACTIVE: { bg: 'rgba(16,185,129,0.22)', color: '#A7F3D0' },
  EXPIRING_SOON: { bg: 'rgba(245,158,11,0.25)', color: '#FDE68A' },
  EXPIRED: { bg: 'rgba(239,68,68,0.24)', color: '#FECACA' },
  REVIEW_REQUIRED: { bg: 'rgba(245,158,11,0.25)', color: '#FDE68A' },
};

const COMPATIBILITY_LABELS = {
  COMPATIBLE: 'Compatível com esta cidade',
  INCOMPATIBLE: 'Incompatível',
  REVIEW_REQUIRED: 'Revisão necessária',
};

const COMPATIBILITY_COLORS = {
  COMPATIBLE: { bg: 'rgba(16,185,129,0.22)', color: '#A7F3D0' },
  INCOMPATIBLE: { bg: 'rgba(239,68,68,0.24)', color: '#FECACA' },
  REVIEW_REQUIRED: { bg: 'rgba(245,158,11,0.25)', color: '#FDE68A' },
};

const PAGE_SIZE = 12;

const EMPTY_FORM = {
  city: '',
  state: '',
  status: 'NOT_STARTED',
  department_name: '',
  contact_name: '',
  contact_email: '',
  contact_phone: '',
  last_sent_at: '',
  last_response_at: '',
  next_follow_up_at: '',
  next_action: '',
  notes: '',
};

const EMPTY_COMMUNICATIONS = {
  city: null,
  contactEmail: null,
  sent: [],
  received: [],
};

const EMPTY_CHECKLIST = {
  city: null,
  items: [],
};

const EMPTY_DRIVER_PROTOCOLS = {
  city: null,
  items: [],
};

const EMPTY_DRIVER_PROTOCOL_FORM = {
  driver_name: '',
  cpf_last4: '',
  service_modality: '',
  vehicle_plate: '',
  vehicle_type: '',
  protocol_number: '',
  status: 'PREPARING',
  next_action: '',
  notes: '',
  submitted_at: '',
  approved_at: '',
  rejected_at: '',
  next_follow_up_at: '',
};

const INLINE_DARK_FIELD_SX = {
  '& .MuiInputBase-root': {
    color: '#F8FAFC',
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  '& .MuiInputLabel-root': {
    color: '#CBD5E1',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#E2E8F0',
  },
  '& .MuiOutlinedInput-root .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(148,163,184,0.35)',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(148,163,184,0.55)',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#B8942E',
  },
  '& .MuiInputBase-input::placeholder': {
    color: 'rgba(203,213,225,0.72)',
    opacity: 1,
  },
  '& .MuiSvgIcon-root': {
    color: '#CBD5E1',
  },
};

function toDatetimeLocal(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function toPayloadDatetime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('pt-BR');
}

function getCommunicationDate(item) {
  return item?.receivedAt || item?.sentAt || item?.createdAt || null;
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function formatDateOnly(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();

  return `${day}/${month}/${year}`;
}

function ChecklistStatusTag({ status }) {
  const cfg = CHECKLIST_STATUS_COLORS[status] || { bg: '#F3F4F6', color: '#374151' };
  return (
    <Chip
      size="small"
      icon={status === 'DONE' ? <CheckCircleOutline fontSize="small" /> : <RadioButtonUnchecked fontSize="small" />}
      label={CHECKLIST_STATUS_LABELS[status] || status}
      sx={{
        fontWeight: 700,
        backgroundColor: cfg.bg,
        color: cfg.color,
        borderRadius: '8px',
      }}
    />
  );
}

function StatusTag({ status }) {
  const cfg = STATUS_COLORS[status] || { bg: '#F3F4F6', color: '#374151' };
  return (
    <Chip
      size="small"
      label={STATUS_LABELS[status] || status}
      sx={{
        fontWeight: 700,
        backgroundColor: cfg.bg,
        color: cfg.color,
        borderRadius: '8px',
      }}
    />
  );
}

function DriverProtocolStatusTag({ status }) {
  const cfg = DRIVER_PROTOCOL_STATUS_COLORS[status] || { bg: '#E2E8F0', color: '#334155' };
  return (
    <Chip
      size="small"
      label={DRIVER_PROTOCOL_STATUS_LABELS[status] || status}
      sx={{
        fontWeight: 700,
        backgroundColor: cfg.bg,
        color: cfg.color,
        borderRadius: '8px',
      }}
    />
  );
}

function CompatibilityTag({ status }) {
  const normalizedStatus = status || 'REVIEW_REQUIRED';
  const cfg = COMPATIBILITY_COLORS[normalizedStatus] || COMPATIBILITY_COLORS.REVIEW_REQUIRED;
  return (
    <Chip
      size="small"
      label={COMPATIBILITY_LABELS[normalizedStatus] || COMPATIBILITY_LABELS.REVIEW_REQUIRED}
      sx={{
        fontWeight: 700,
        backgroundColor: cfg.bg,
        color: cfg.color,
        borderRadius: '8px',
        width: 'fit-content',
      }}
    />
  );
}

function AuthorizationOperationalTag({ state }) {
  const normalizedState = state || 'NOT_GENERATED';
  const cfg = AUTHORIZATION_OPERATIONAL_COLORS[normalizedState] || AUTHORIZATION_OPERATIONAL_COLORS.NOT_GENERATED;

  return (
    <Chip
      size="small"
      label={AUTHORIZATION_OPERATIONAL_LABELS[normalizedState] || AUTHORIZATION_OPERATIONAL_LABELS.NOT_GENERATED}
      sx={{
        fontWeight: 700,
        backgroundColor: cfg.bg,
        color: cfg.color,
        borderRadius: '8px',
        width: 'fit-content',
      }}
    />
  );
}

function formatCompatibilityReason(reason, documentSummary) {
  if (reason === 'Motorista possui documentos obrigatórios pendentes para esta cidade.') {
    const missing = Number(documentSummary?.missing || 0);
    if (missing > 0) {
      return `${missing} documento${missing > 1 ? 's' : ''} obrigatório${missing > 1 ? 's' : ''} ausente${missing > 1 ? 's' : ''}`;
    }
  }

  return reason;
}

export default function RegulatoryCitiesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState({
    q: '',
    city: '',
    state: '',
    status: 'ALL',
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [expandedCommunicationsId, setExpandedCommunicationsId] = useState(null);
  const [communicationsByCity, setCommunicationsByCity] = useState({});
  const [communicationsLoadingId, setCommunicationsLoadingId] = useState(null);
  const [communicationsErrors, setCommunicationsErrors] = useState({});
  const [expandedChecklistId, setExpandedChecklistId] = useState(null);
  const [checklistByCity, setChecklistByCity] = useState({});
  const [checklistLoadingByCity, setChecklistLoadingByCity] = useState({});
  const [checklistLoadedByCity, setChecklistLoadedByCity] = useState({});
  const [checklistErrors, setChecklistErrors] = useState({});
  const [checklistFormOpen, setChecklistFormOpen] = useState(false);
  const [checklistEditing, setChecklistEditing] = useState(null);
  const [checklistForm, setChecklistForm] = useState({
    title: '',
    description: '',
    category: '',
    status: 'PENDING',
    required: true,
    sort_order: 0,
    notes: '',
    due_date: '',
  });
  const [checklistSaving, setChecklistSaving] = useState(false);
  const [checklistActionId, setChecklistActionId] = useState(null);
  const [checklistStatusSavingId, setChecklistStatusSavingId] = useState(null);
  const [checklistSavedByItem, setChecklistSavedByItem] = useState({});
  const [inlineChecklistEditing, setInlineChecklistEditing] = useState(null);
  const [inlineChecklistForm, setInlineChecklistForm] = useState({
    title: '',
    description: '',
    category: '',
    status: 'PENDING',
    required: true,
    sort_order: 0,
    notes: '',
    due_date: '',
  });
  const [inlineChecklistSaving, setInlineChecklistSaving] = useState(false);
  const [expandedProtocolsId, setExpandedProtocolsId] = useState(null);
  const [protocolsByCity, setProtocolsByCity] = useState({});
  const [protocolsLoadingByCity, setProtocolsLoadingByCity] = useState({});
  const [protocolsLoadedByCity, setProtocolsLoadedByCity] = useState({});
  const [protocolsErrors, setProtocolsErrors] = useState({});
  const [protocolCreateCityId, setProtocolCreateCityId] = useState(null);
  const [protocolForm, setProtocolForm] = useState(EMPTY_DRIVER_PROTOCOL_FORM);
  const [protocolEditing, setProtocolEditing] = useState(null);
  const [inlineProtocolForm, setInlineProtocolForm] = useState(EMPTY_DRIVER_PROTOCOL_FORM);
  const [protocolSaving, setProtocolSaving] = useState(false);
  const [protocolActionId, setProtocolActionId] = useState(null);
  const [protocolSavedByItem, setProtocolSavedByItem] = useState({});
  const [candidatePanelByCity, setCandidatePanelByCity] = useState({});
  const [candidateByCity, setCandidateByCity] = useState({});
  const [candidateLoadingByCity, setCandidateLoadingByCity] = useState({});
  const [candidateLoadedByCity, setCandidateLoadedByCity] = useState({});
  const [candidateErrorsByCity, setCandidateErrorsByCity] = useState({});
  const [candidateQueryByCity, setCandidateQueryByCity] = useState({});
  const [candidateActionByCity, setCandidateActionByCity] = useState({});
  const [candidateSuccessByCity, setCandidateSuccessByCity] = useState({});
  const [candidateServiceModalityByDriver, setCandidateServiceModalityByDriver] = useState({});
  const [protocolAuthorizationActionByItem, setProtocolAuthorizationActionByItem] = useState({});

  const params = useMemo(() => {
    const next = {
      page,
      limit: PAGE_SIZE,
    };

    if (filters.q.trim()) next.q = filters.q.trim();
    if (filters.city.trim()) next.city = filters.city.trim();
    if (filters.state.trim()) next.state = filters.state.trim().toUpperCase();
    if (filters.status !== 'ALL') next.status = filters.status;

    return next;
  }, [filters, page]);

  const loadCases = async (targetPage = 1) => {
    setLoading(true);
    setErrorMessage('');

    try {
      const response = await api.get('/api/admin/regulatory/cities', {
        params: {
          ...params,
          page: targetPage,
        },
      });

      const list = Array.isArray(response.data?.data) ? response.data.data : [];
      const pages = Number(response.data?.pagination?.totalPages || 1);
      const current = Number(response.data?.pagination?.page || targetPage);

      setItems(list);
      setTotalPages(Math.max(1, pages));
      setPage(current);
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível carregar os casos regulatórios.';
      setErrorMessage(message);
      setItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases(1);
  }, [filters]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      city: item.city || '',
      state: item.state || '',
      status: item.status || 'NOT_STARTED',
      department_name: item.department_name || '',
      contact_name: item.contact_name || '',
      contact_email: item.contact_email || '',
      contact_phone: item.contact_phone || '',
      last_sent_at: toDatetimeLocal(item.last_sent_at),
      last_response_at: toDatetimeLocal(item.last_response_at),
      next_follow_up_at: toDatetimeLocal(item.next_follow_up_at),
      next_action: item.next_action || '',
      notes: item.notes || '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;
    setDialogOpen(false);
  };

  const submitForm = async () => {
    setSaving(true);
    setErrorMessage('');

    try {
      const payload = {
        city: form.city.trim(),
        state: form.state.trim().toUpperCase(),
        status: form.status,
        department_name: form.department_name || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        last_sent_at: toPayloadDatetime(form.last_sent_at),
        last_response_at: toPayloadDatetime(form.last_response_at),
        next_follow_up_at: toPayloadDatetime(form.next_follow_up_at),
        next_action: form.next_action || null,
        notes: form.notes || null,
      };

      if (editingId) {
        await api.patch(`/api/admin/regulatory/cities/${editingId}`, payload);
      } else {
        await api.post('/api/admin/regulatory/cities', payload);
      }

      setDialogOpen(false);
      await loadCases(page);
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível salvar o caso regulatório.';
      setErrorMessage(message);
    } finally {
      setSaving(false);
    }
  };

  const loadCommunications = async (cityId) => {
    setCommunicationsLoadingId(cityId);
    setCommunicationsErrors((prev) => ({ ...prev, [cityId]: '' }));

    try {
      const response = await api.get(`/api/admin/regulatory/cities/${cityId}/communications`);
      setCommunicationsByCity((prev) => ({
        ...prev,
        [cityId]: response.data?.data || EMPTY_COMMUNICATIONS,
      }));
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível carregar as comunicações vinculadas.';
      setCommunicationsErrors((prev) => ({ ...prev, [cityId]: message }));
    } finally {
      setCommunicationsLoadingId((current) => (current === cityId ? null : current));
    }
  };

  const loadChecklist = async (cityId) => {
    setChecklistLoadingByCity((prev) => ({ ...prev, [cityId]: true }));
    setChecklistErrors((prev) => ({ ...prev, [cityId]: '' }));

    try {
      const response = await api.get(`/api/admin/regulatory/cities/${cityId}/checklist`);
      setChecklistByCity((prev) => ({
        ...prev,
        [cityId]: response.data?.data || EMPTY_CHECKLIST,
      }));
      setChecklistLoadedByCity((prev) => ({ ...prev, [cityId]: true }));
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível carregar o checklist municipal.';
      setChecklistErrors((prev) => ({ ...prev, [cityId]: message }));
    } finally {
      setChecklistLoadingByCity((prev) => ({ ...prev, [cityId]: false }));
    }
  };

  const toggleChecklist = async (cityId) => {
    if (expandedChecklistId === cityId) {
      setExpandedChecklistId(null);
      return;
    }

    setExpandedChecklistId(cityId);
    if (!checklistByCity[cityId]) {
      await loadChecklist(cityId);
    }
  };

  const openChecklistCreate = (cityId, currentList = []) => {
    const nextSortOrder = currentList.length ? Math.max(...currentList.map((item) => Number(item.sort_order || 0))) + 1 : 0;
    setChecklistEditing({ cityId, itemId: null });
    setChecklistForm({
      title: '',
      description: '',
      category: '',
      status: 'PENDING',
      required: true,
      sort_order: nextSortOrder,
      notes: '',
      due_date: '',
    });
    setChecklistFormOpen(true);
  };

  const startInlineChecklistEdit = (cityId, item) => {
    setInlineChecklistEditing({ cityId, itemId: item.id });
    setInlineChecklistForm({
      title: item.title || '',
      description: item.description || '',
      category: item.category || '',
      status: item.status || 'PENDING',
      required: item.required ?? true,
      sort_order: Number(item.sort_order || 0),
      notes: item.notes || '',
      due_date: toDatetimeLocal(item.due_date),
    });
  };

  const cancelInlineChecklistEdit = () => {
    if (inlineChecklistSaving) return;
    setInlineChecklistEditing(null);
  };

  const markChecklistSaved = (itemId) => {
    setChecklistSavedByItem((prev) => ({ ...prev, [itemId]: true }));
    setTimeout(() => {
      setChecklistSavedByItem((prev) => ({ ...prev, [itemId]: false }));
    }, 1800);
  };

  const patchChecklistItemLocally = (cityId, updatedItem) => {
    setChecklistByCity((prev) => {
      const cityChecklist = prev[cityId];
      if (!cityChecklist) return prev;

      const nextItems = cityChecklist.items.map((currentItem) =>
        currentItem.id === updatedItem.id ? updatedItem : currentItem,
      );

      return {
        ...prev,
        [cityId]: {
          ...cityChecklist,
          items: nextItems,
        },
      };
    });
  };

  const closeChecklistForm = () => {
    if (checklistSaving) return;
    setChecklistFormOpen(false);
  };

  const submitChecklistForm = async () => {
    if (!checklistEditing?.cityId) return;

    setChecklistSaving(true);
    setErrorMessage('');

    const payload = {
      title: checklistForm.title.trim(),
      description: checklistForm.description || null,
      category: checklistForm.category || null,
      status: checklistForm.status,
      required: checklistForm.required,
      sort_order: checklistForm.sort_order,
      notes: checklistForm.notes || null,
      due_date: toPayloadDatetime(checklistForm.due_date),
    };

    try {
      await api.post(`/api/admin/regulatory/cities/${checklistEditing.cityId}/checklist`, payload);

      setChecklistFormOpen(false);
      await loadChecklist(checklistEditing.cityId);
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível salvar o item do checklist.';
      setErrorMessage(message);
    } finally {
      setChecklistSaving(false);
    }
  };

  const saveInlineChecklistItem = async (cityId, itemId) => {
    setInlineChecklistSaving(true);
    setChecklistErrors((prev) => ({ ...prev, [cityId]: '' }));

    const payload = {
      title: inlineChecklistForm.title.trim(),
      description: inlineChecklistForm.description || null,
      category: inlineChecklistForm.category || null,
      status: inlineChecklistForm.status,
      required: inlineChecklistForm.required,
      sort_order: Number(inlineChecklistForm.sort_order) || 0,
      notes: inlineChecklistForm.notes || null,
      due_date: toPayloadDatetime(inlineChecklistForm.due_date),
    };

    try {
      const response = await api.patch(`/api/admin/regulatory/cities/${cityId}/checklist/${itemId}`, payload);
      const updatedItem = response?.data?.data;

      if (updatedItem?.id) {
        patchChecklistItemLocally(cityId, updatedItem);
      } else {
        await loadChecklist(cityId);
      }

      setInlineChecklistEditing(null);
      markChecklistSaved(itemId);
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível salvar o item.';
      setChecklistErrors((prev) => ({ ...prev, [cityId]: message }));
    } finally {
      setInlineChecklistSaving(false);
    }
  };

  const updateChecklistStatus = async (cityId, item, status) => {
    setChecklistActionId(item.id);
    setChecklistStatusSavingId(item.id);
    setChecklistErrors((prev) => ({ ...prev, [cityId]: '' }));

    try {
      const response = await api.patch(`/api/admin/regulatory/cities/${cityId}/checklist/${item.id}`, { status });
      const updatedItem = response?.data?.data;

      if (updatedItem?.id) {
        patchChecklistItemLocally(cityId, updatedItem);
      } else {
        await loadChecklist(cityId);
      }

      markChecklistSaved(item.id);
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível atualizar o status.';
      setChecklistErrors((prev) => ({ ...prev, [cityId]: message }));
    } finally {
      setChecklistActionId(null);
      setChecklistStatusSavingId((current) => (current === item.id ? null : current));
    }
  };

  const deleteChecklistItem = async (cityId, item) => {
    if (!window.confirm(`Excluir o item "${item.title}"?`)) return;

    setChecklistActionId(item.id);

    try {
      await api.delete(`/api/admin/regulatory/cities/${cityId}/checklist/${item.id}`);
      await loadChecklist(cityId);
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível excluir o item do checklist.';
      setChecklistErrors((prev) => ({ ...prev, [cityId]: message }));
    } finally {
      setChecklistActionId(null);
    }
  };

  const applyChecklistTemplate = async (cityId) => {
    setChecklistLoadingByCity((prev) => ({ ...prev, [cityId]: true }));
    setChecklistErrors((prev) => ({ ...prev, [cityId]: '' }));

    try {
      await api.post(`/api/admin/regulatory/cities/${cityId}/checklist/template/app-transport`);
      await loadChecklist(cityId);
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível aplicar o modelo de checklist.';
      setChecklistErrors((prev) => ({ ...prev, [cityId]: message }));
    } finally {
      setChecklistLoadingByCity((prev) => ({ ...prev, [cityId]: false }));
    }
  };

  const loadDriverProtocols = async (cityId) => {
    setProtocolsLoadingByCity((prev) => ({ ...prev, [cityId]: true }));
    setProtocolsErrors((prev) => ({ ...prev, [cityId]: '' }));

    try {
      const response = await api.get(`/api/admin/regulatory/cities/${cityId}/driver-protocols`);
      setProtocolsByCity((prev) => ({
        ...prev,
        [cityId]: response.data?.data || EMPTY_DRIVER_PROTOCOLS,
      }));
      setProtocolsLoadedByCity((prev) => ({ ...prev, [cityId]: true }));
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível carregar os protocolos por motorista.';
      setProtocolsErrors((prev) => ({ ...prev, [cityId]: message }));
    } finally {
      setProtocolsLoadingByCity((prev) => ({ ...prev, [cityId]: false }));
    }
  };

  const toggleDriverProtocols = async (cityId) => {
    if (expandedProtocolsId === cityId) {
      setExpandedProtocolsId(null);
      return;
    }

    setExpandedProtocolsId(cityId);
    if (!protocolsByCity[cityId]) {
      await loadDriverProtocols(cityId);
    }
  };

  const normalizeCpfLast4 = (value) => value.replace(/\D/g, '').slice(0, 4);

  const toDriverProtocolPayload = (source) => ({
    driver_name: source.driver_name.trim(),
    cpf_last4: normalizeCpfLast4(source.cpf_last4) || null,
    service_modality: source.service_modality || null,
    vehicle_plate: source.vehicle_plate.trim() || null,
    vehicle_type: source.vehicle_type.trim() || null,
    protocol_number: source.protocol_number.trim() || null,
    status: source.status,
    next_action: source.next_action.trim() || null,
    notes: source.notes.trim() || null,
    submitted_at: toPayloadDatetime(source.submitted_at),
    approved_at: toPayloadDatetime(source.approved_at),
    rejected_at: toPayloadDatetime(source.rejected_at),
    next_follow_up_at: toPayloadDatetime(source.next_follow_up_at),
  });

  const patchDriverProtocolLocally = (cityId, updatedItem) => {
    setProtocolsByCity((prev) => {
      const cityProtocols = prev[cityId];
      if (!cityProtocols) return prev;

      const nextItems = cityProtocols.items.map((currentItem) =>
        currentItem.id === updatedItem.id ? updatedItem : currentItem,
      );

      return {
        ...prev,
        [cityId]: {
          ...cityProtocols,
          items: nextItems,
        },
      };
    });
  };

  const markDriverProtocolSaved = (itemId) => {
    setProtocolSavedByItem((prev) => ({ ...prev, [itemId]: true }));
    setTimeout(() => {
      setProtocolSavedByItem((prev) => ({ ...prev, [itemId]: false }));
    }, 1800);
  };

  const openDriverProtocolCreate = (cityId) => {
    setProtocolCreateCityId(cityId);
    setProtocolForm(EMPTY_DRIVER_PROTOCOL_FORM);
  };

  const cancelDriverProtocolCreate = () => {
    if (protocolSaving) return;
    setProtocolCreateCityId(null);
    setProtocolForm(EMPTY_DRIVER_PROTOCOL_FORM);
  };

  const submitDriverProtocolForm = async (cityId) => {
    setProtocolSaving(true);
    setProtocolsErrors((prev) => ({ ...prev, [cityId]: '' }));

    try {
      const payload = toDriverProtocolPayload(protocolForm);
      await api.post(`/api/admin/regulatory/cities/${cityId}/driver-protocols`, payload);
      setProtocolCreateCityId(null);
      setProtocolForm(EMPTY_DRIVER_PROTOCOL_FORM);
      await loadDriverProtocols(cityId);
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível salvar o protocolo.';
      setProtocolsErrors((prev) => ({ ...prev, [cityId]: message }));
    } finally {
      setProtocolSaving(false);
    }
  };

  const startInlineProtocolEdit = (cityId, protocolItem) => {
    setProtocolEditing({ cityId, itemId: protocolItem.id });
    setInlineProtocolForm({
      driver_name: protocolItem.driver_name || '',
      cpf_last4: protocolItem.cpf_last4 || '',
      service_modality: protocolItem.service_modality || '',
      vehicle_plate: protocolItem.vehicle_plate || '',
      vehicle_type: protocolItem.vehicle_type || '',
      protocol_number: protocolItem.protocol_number || '',
      status: protocolItem.status || 'PREPARING',
      next_action: protocolItem.next_action || '',
      notes: protocolItem.notes || '',
      submitted_at: toDatetimeLocal(protocolItem.submitted_at),
      approved_at: toDatetimeLocal(protocolItem.approved_at),
      rejected_at: toDatetimeLocal(protocolItem.rejected_at),
      next_follow_up_at: toDatetimeLocal(protocolItem.next_follow_up_at),
    });
  };

  const cancelInlineProtocolEdit = () => {
    if (protocolSaving) return;
    setProtocolEditing(null);
  };

  const saveInlineDriverProtocol = async (cityId, itemId) => {
    setProtocolSaving(true);
    setProtocolActionId(itemId);
    setProtocolsErrors((prev) => ({ ...prev, [cityId]: '' }));

    try {
      const payload = toDriverProtocolPayload(inlineProtocolForm);
      const response = await api.patch(`/api/admin/regulatory/cities/${cityId}/driver-protocols/${itemId}`, payload);
      const updatedItem = response?.data?.data;

      if (updatedItem?.id) {
        patchDriverProtocolLocally(cityId, updatedItem);
      } else {
        await loadDriverProtocols(cityId);
      }

      setProtocolEditing(null);
      markDriverProtocolSaved(itemId);
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível salvar o protocolo.';
      setProtocolsErrors((prev) => ({ ...prev, [cityId]: message }));
    } finally {
      setProtocolSaving(false);
      setProtocolActionId(null);
    }
  };

  const deleteDriverProtocol = async (cityId, protocolItem) => {
    if (!window.confirm(`Excluir protocolo de ${protocolItem.driver_name}?`)) return;

    setProtocolActionId(protocolItem.id);
    setProtocolsErrors((prev) => ({ ...prev, [cityId]: '' }));

    try {
      await api.delete(`/api/admin/regulatory/cities/${cityId}/driver-protocols/${protocolItem.id}`);
      await loadDriverProtocols(cityId);
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível excluir protocolo de motorista.';
      setProtocolsErrors((prev) => ({ ...prev, [cityId]: message }));
    } finally {
      setProtocolActionId(null);
    }
  };

  const loadDriverCandidates = async (cityId, queryValue = '') => {
    setCandidateLoadingByCity((prev) => ({ ...prev, [cityId]: true }));
    setCandidateErrorsByCity((prev) => ({ ...prev, [cityId]: '' }));

    try {
      const params = { limit: 25 };
      if (queryValue.trim()) params.q = queryValue.trim();

      const response = await api.get(`/api/admin/regulatory/cities/${cityId}/driver-candidates`, { params });
      const payload = response?.data?.data;
      setCandidateByCity((prev) => ({ ...prev, [cityId]: payload || { items: [] } }));
      setCandidateLoadedByCity((prev) => ({ ...prev, [cityId]: true }));
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível buscar motoristas do cadastro KAVIAR.';
      setCandidateErrorsByCity((prev) => ({ ...prev, [cityId]: message }));
    } finally {
      setCandidateLoadingByCity((prev) => ({ ...prev, [cityId]: false }));
    }
  };

  const toggleDriverCandidatesPanel = async (cityId) => {
    const isOpen = Boolean(candidatePanelByCity[cityId]);
    setCandidatePanelByCity((prev) => ({ ...prev, [cityId]: !isOpen }));
  };

  const searchDriverCandidates = async (cityId) => {
    const query = (candidateQueryByCity[cityId] || '').trim();
    if (query.length < 3) {
      setCandidateErrorsByCity((prev) => ({ ...prev, [cityId]: 'Digite pelo menos 3 caracteres para buscar.' }));
      setCandidateLoadedByCity((prev) => ({ ...prev, [cityId]: false }));
      return;
    }

    await loadDriverCandidates(cityId, query);
  };

  const createProtocolFromDriver = async (cityId, driverId, compatibleModalities = []) => {
    setCandidateActionByCity((prev) => ({ ...prev, [cityId]: driverId }));
    setCandidateErrorsByCity((prev) => ({ ...prev, [cityId]: '' }));
    setCandidateSuccessByCity((prev) => ({ ...prev, [cityId]: '' }));

    try {
      const driverKey = `${cityId}:${driverId}`;
      const selectedServiceModality = candidateServiceModalityByDriver[driverKey] || null;

      if (compatibleModalities.length > 1 && !selectedServiceModality) {
        setCandidateErrorsByCity((prev) => ({
          ...prev,
          [cityId]: 'Selecione a modalidade municipal para gerar o protocolo deste motorista.',
        }));
        return;
      }

      await api.post(`/api/admin/regulatory/cities/${cityId}/driver-protocols/from-driver`, {
        driverId,
        serviceModality: selectedServiceModality || undefined,
      });

      await Promise.all([
        loadDriverProtocols(cityId),
        loadDriverCandidates(cityId, candidateQueryByCity[cityId] || ''),
      ]);

      setCandidateSuccessByCity((prev) => ({
        ...prev,
        [cityId]: 'Protocolo criado a partir do cadastro KAVIAR.',
      }));
    } catch (error) {
      const apiError = error?.response?.data;
      const reasons = Array.isArray(apiError?.compatibility?.reasons) ? apiError.compatibility.reasons : [];
      const reasonsSuffix = reasons.length > 0 ? ` ${reasons.join(' ')}` : '';
      const message = (apiError?.error || 'Não foi possível criar o protocolo automaticamente.') + reasonsSuffix;
      setCandidateErrorsByCity((prev) => ({ ...prev, [cityId]: message }));
    } finally {
      setCandidateActionByCity((prev) => ({ ...prev, [cityId]: null }));
    }
  };

  const generateMunicipalAuthorization = async (cityId, protocolItem) => {
    setProtocolAuthorizationActionByItem((prev) => ({ ...prev, [protocolItem.id]: true }));
    setProtocolsErrors((prev) => ({ ...prev, [cityId]: '' }));

    try {
      await api.post(`/api/admin/regulatory/cities/${cityId}/driver-protocols/${protocolItem.id}/generate-authorization`);
      await loadDriverProtocols(cityId);
      setCandidateSuccessByCity((prev) => ({
        ...prev,
        [cityId]: 'Autorização municipal gerada com sucesso para o protocolo aprovado.',
      }));
    } catch (error) {
      const message = error?.response?.data?.error || 'Não foi possível gerar autorização municipal para este protocolo.';
      setProtocolsErrors((prev) => ({ ...prev, [cityId]: message }));
    } finally {
      setProtocolAuthorizationActionByItem((prev) => ({ ...prev, [protocolItem.id]: false }));
    }
  };

  const toggleCommunications = async (cityId) => {
    if (expandedCommunicationsId === cityId) {
      setExpandedCommunicationsId(null);
      return;
    }

    setExpandedCommunicationsId(cityId);
    if (!communicationsByCity[cityId]) {
      await loadCommunications(cityId);
    }
  };

  return (
    <Box sx={{ px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
      <Stack spacing={2.5} maxWidth={1100} sx={{ mx: 'auto' }}>
        <Box
          sx={{
            '& .admin-page-title': {
              color: '#F8FAFC !important',
              fontWeight: 800,
            },
            '& .admin-page-title:hover': {
              color: '#F8FAFC !important',
            },
            '& .admin-page-title *': {
              color: 'inherit !important',
            },
            '& .admin-page-subtitle': {
              color: '#CBD5E1 !important',
            },
            '& .admin-page-subtitle:hover': {
              color: '#CBD5E1 !important',
            },
          }}
        >
          <Typography
            variant="h4"
            component="h1"
            className="admin-page-title"
            sx={{ fontWeight: 800, color: '#F8FAFC !important', mb: 0.5 }}
            style={{ color: '#F8FAFC' }}
          >
            <span style={{ color: 'inherit' }}>Regulatório por Cidade</span>
          </Typography>
          <Typography className="admin-page-subtitle" sx={{ color: '#CBD5E1 !important' }} style={{ color: '#CBD5E1' }}>
            Acompanhar cadastro, protocolo e autorizações municipais da KAVIAR.
          </Typography>
        </Box>

        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

        <Card sx={{ borderRadius: 3, border: '1px solid #E8E5DE', boxShadow: '0 4px 16px rgba(0,0,0,0.04)' }}>
          <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                size="small"
                label="Busca"
                placeholder="Cidade, setor, e-mail, observação"
                value={filters.q}
                onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
              />

              <TextField
                size="small"
                label="Cidade"
                value={filters.city}
                onChange={(event) => setFilters((prev) => ({ ...prev, city: event.target.value }))}
              />

              <TextField
                size="small"
                label="UF"
                inputProps={{ maxLength: 2 }}
                value={filters.state}
                onChange={(event) => setFilters((prev) => ({ ...prev, state: event.target.value.toUpperCase() }))}
              />

              <FormControl size="small" sx={{ minWidth: 210 }}>
                <InputLabel id="reg-city-status-filter">Status</InputLabel>
                <Select
                  labelId="reg-city-status-filter"
                  label="Status"
                  value={filters.status}
                  onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
                >
                  <MenuItem value="ALL">Todos</MenuItem>
                  {STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>{STATUS_LABELS[status]}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Box sx={{ flex: 1 }} />

              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={openCreate}
                sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' }, fontWeight: 700 }}
              >
                Nova cidade
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress sx={{ color: '#B8942E' }} />
          </Box>
        ) : (
          <Grid container spacing={2}>
            {items.map((item) => (
              <Grid item xs={12} md={6} key={item.id}>
                <Card sx={{ borderRadius: 2.5, border: '1px solid #E8E5DE', height: '100%', boxShadow: '0 6px 18px rgba(15,23,42,0.06)' }}>
                  <CardContent sx={{ p: 2.25 }}>
                    <Stack spacing={1.2}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontWeight: 800, color: '#1A1A1A', fontSize: 17 }}>
                          {item.city}/{item.state}
                        </Typography>
                        <StatusTag status={item.status} />
                      </Box>

                      <Typography sx={{ color: '#4B5563', fontSize: 13 }}>
                        <strong>Setor:</strong> {item.department_name || '-'}
                      </Typography>
                      <Typography sx={{ color: '#4B5563', fontSize: 13 }}>
                        <strong>E-mail de contato:</strong> {item.contact_email || '-'}
                      </Typography>
                      <Typography sx={{ color: '#4B5563', fontSize: 13 }}>
                        <strong>Último envio:</strong> {formatDateTime(item.last_sent_at)}
                      </Typography>
                      <Typography sx={{ color: '#4B5563', fontSize: 13 }}>
                        <strong>Última resposta:</strong> {formatDateTime(item.last_response_at)}
                      </Typography>
                      <Typography sx={{ color: '#4B5563', fontSize: 13 }}>
                        <strong>Próxima ação:</strong> {item.next_action || '-'}
                      </Typography>
                      <Typography sx={{ color: '#4B5563', fontSize: 13 }}>
                        <strong>Próximo acompanhamento:</strong> {formatDateTime(item.next_follow_up_at)}
                      </Typography>

                      <Stack direction="row" spacing={1} sx={{ pt: 0.6, flexWrap: 'wrap' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<Edit fontSize="small" />}
                          onClick={() => openEdit(item)}
                        >
                          Ver detalhes / Editar
                        </Button>

                        {item.contact_email && (
                          <Button
                            size="small"
                            component={Link}
                            to="/admin/inbox"
                            startIcon={<Email fontSize="small" />}
                            sx={{ color: '#1D4ED8' }}
                          >
                            Ver e-mails recebidos
                          </Button>
                        )}

                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => toggleCommunications(item.id)}
                          disabled={communicationsLoadingId === item.id}
                          sx={{ bgcolor: '#111827', color: '#F8FAFC', '&:hover': { bgcolor: '#0F172A' } }}
                        >
                          {communicationsLoadingId === item.id ? 'Carregando...' : 'Ver comunicações'}
                        </Button>

                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => toggleChecklist(item.id)}
                          disabled={Boolean(checklistLoadingByCity[item.id])}
                          sx={{ bgcolor: '#334155', color: '#F8FAFC', '&:hover': { bgcolor: '#1E293B' } }}
                        >
                          {checklistLoadingByCity[item.id] ? 'Carregando...' : 'Ver checklist'}
                        </Button>

                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => toggleDriverProtocols(item.id)}
                          disabled={Boolean(protocolsLoadingByCity[item.id])}
                          sx={{ bgcolor: '#0F766E', color: '#F8FAFC', '&:hover': { bgcolor: '#115E59' } }}
                        >
                          {protocolsLoadingByCity[item.id] ? 'Carregando...' : 'Ver protocolos / motoristas'}
                        </Button>
                      </Stack>

                      {expandedCommunicationsId === item.id && (
                        <Box
                          sx={{
                            mt: 1,
                            borderRadius: 2,
                            bgcolor: '#0F172A',
                            color: '#E5E7EB',
                            border: '1px solid rgba(148,163,184,0.18)',
                            p: 1.5,
                          }}
                        >
                          <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: 14, mb: 1.25 }}>
                            Comunicações vinculadas
                          </Typography>

                          {communicationsErrors[item.id] && (
                            <Alert severity="error" sx={{ mb: 1.25 }}>
                              {communicationsErrors[item.id]}
                            </Alert>
                          )}

                          {!communicationsErrors[item.id] && communicationsLoadingId === item.id && !communicationsByCity[item.id] && (
                            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                              <CircularProgress size={22} sx={{ color: '#B8942E' }} />
                            </Box>
                          )}

                          {!communicationsErrors[item.id] && communicationsByCity[item.id] && (
                            <Stack spacing={1.25}>
                              {!communicationsByCity[item.id].contactEmail ? (
                                <Typography sx={{ color: '#CBD5E1', fontSize: 13 }}>
                                  Cadastre um e-mail de contato para vincular comunicações.
                                </Typography>
                              ) : (
                                <>
                                  <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>
                                    E-mail vinculado: {communicationsByCity[item.id].contactEmail}
                                  </Typography>

                                  {communicationsByCity[item.id].sent.length === 0 && communicationsByCity[item.id].received.length === 0 ? (
                                    <Typography sx={{ color: '#CBD5E1', fontSize: 13 }}>
                                      Nenhuma comunicação vinculada a este e-mail ainda.
                                    </Typography>
                                  ) : (
                                    <Grid container spacing={1.25}>
                                      {[
                                        { title: 'Enviados', items: communicationsByCity[item.id].sent },
                                        { title: 'Recebidos', items: communicationsByCity[item.id].received },
                                      ].map((group) => (
                                        <Grid item xs={12} md={6} key={group.title}>
                                          <Box sx={{ borderRadius: 1.5, bgcolor: 'rgba(15,23,42,0.55)', border: '1px solid rgba(148,163,184,0.14)', p: 1.25, height: '100%' }}>
                                            <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: 13, mb: 1 }}>
                                              {group.title}
                                            </Typography>

                                            {group.items.length === 0 ? (
                                              <Typography sx={{ color: '#94A3B8', fontSize: 12 }}>
                                                Nenhum {group.title === 'Enviados' ? 'envio' : 'recebimento'} vinculado.
                                              </Typography>
                                            ) : (
                                              <Stack spacing={1}>
                                                {group.items.map((comm) => (
                                                  <Box key={comm.id} sx={{ borderRadius: 1.5, bgcolor: 'rgba(30,41,59,0.88)', p: 1.1, border: '1px solid rgba(148,163,184,0.1)' }}>
                                                    <Typography sx={{ color: '#F8FAFC', fontWeight: 600, fontSize: 12.5, lineHeight: 1.35 }}>
                                                      {comm.subject || '(sem assunto)'}
                                                    </Typography>
                                                    <Typography sx={{ color: '#94A3B8', fontSize: 11, mt: 0.35 }}>
                                                      {group.title === 'Enviados' ? `Para: ${comm.to || '-'}` : `De: ${comm.from || '-'}`}
                                                    </Typography>
                                                    <Typography sx={{ color: '#94A3B8', fontSize: 11, mt: 0.15 }}>
                                                      {formatDateTime(getCommunicationDate(comm))}
                                                    </Typography>
                                                    {comm.snippet && (
                                                      <Typography sx={{ color: '#CBD5E1', fontSize: 11.5, mt: 0.65, lineHeight: 1.45 }}>
                                                        {comm.snippet}
                                                      </Typography>
                                                    )}
                                                    <Stack direction="row" spacing={0.75} sx={{ mt: 0.8, flexWrap: 'wrap' }}>
                                                      {comm.status && (
                                                        <Chip
                                                          size="small"
                                                          label={comm.status}
                                                          sx={{ height: 22, fontSize: 10, color: '#E2E8F0', bgcolor: 'rgba(148,163,184,0.18)' }}
                                                        />
                                                      )}
                                                      {comm.hasAttachments && (
                                                        <Chip
                                                          size="small"
                                                          label="Anexos"
                                                          sx={{ height: 22, fontSize: 10, color: '#F8FAFC', bgcolor: 'rgba(184,148,46,0.28)' }}
                                                        />
                                                      )}
                                                    </Stack>
                                                  </Box>
                                                ))}
                                              </Stack>
                                            )}
                                          </Box>
                                        </Grid>
                                      ))}
                                    </Grid>
                                  )}
                                </>
                              )}
                            </Stack>
                          )}
                        </Box>
                      )}

                      {expandedChecklistId === item.id && (
                        <Box
                          sx={{
                            mt: 1,
                            borderRadius: 2,
                            bgcolor: '#111827',
                            color: '#E5E7EB',
                            border: '1px solid rgba(148,163,184,0.18)',
                            p: 1.5,
                          }}
                        >
                          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" sx={{ mb: 1.25, flexWrap: 'wrap', gap: 1 }}>
                            <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: 14 }}>
                              Checklist municipal
                            </Typography>

                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => openChecklistCreate(item.id, checklistByCity[item.id]?.items || [])}
                                sx={{ color: '#E5E7EB', borderColor: 'rgba(226,232,240,0.25)' }}
                              >
                                Adicionar item
                              </Button>

                              {Boolean(checklistLoadedByCity[item.id])
                                && !checklistLoadingByCity[item.id]
                                && (checklistByCity[item.id]?.items || []).length === 0 && (
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => applyChecklistTemplate(item.id)}
                                  sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' }, color: '#111827' }}
                                >
                                  Aplicar modelo transporte por aplicativo
                                </Button>
                              )}
                            </Stack>
                          </Stack>

                          {checklistErrors[item.id] && (
                            <Alert severity="error" sx={{ mb: 1.25 }}>
                              {checklistErrors[item.id]}
                            </Alert>
                          )}

                          {!checklistErrors[item.id] && checklistLoadingByCity[item.id] && !checklistLoadedByCity[item.id] && (
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1.5 }}>
                              <CircularProgress size={20} sx={{ color: '#B8942E' }} />
                              <Typography sx={{ color: '#CBD5E1', fontSize: 13 }}>
                                Carregando checklist...
                              </Typography>
                            </Stack>
                          )}

                          {!checklistErrors[item.id] && checklistLoadedByCity[item.id] && checklistByCity[item.id] && (
                            <Stack spacing={1.1}>
                              {checklistByCity[item.id].items.length === 0 ? (
                                <Typography sx={{ color: '#CBD5E1', fontSize: 13 }}>
                                  Nenhum item cadastrado para esta cidade.
                                </Typography>
                              ) : (
                                <Stack spacing={1}>
                                  {checklistByCity[item.id].items.map((checklistItem) => (
                                    <Box
                                      key={checklistItem.id}
                                      sx={{
                                        borderRadius: 1.5,
                                        bgcolor: 'rgba(30,41,59,0.92)',
                                        p: 1.1,
                                        border: '1px solid rgba(148,163,184,0.1)',
                                      }}
                                    >
                                      <Stack spacing={0.9}>
                                        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start" sx={{ flexWrap: 'wrap', gap: 1 }}>
                                          <Box>
                                            <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: 12.8, lineHeight: 1.35 }}>
                                              {checklistItem.title}
                                            </Typography>
                                            <Typography sx={{ color: '#94A3B8', fontSize: 11.25, mt: 0.25 }}>
                                              {checklistItem.category || 'Sem categoria'}
                                              {' · '}
                                              Ordem {checklistItem.sort_order ?? 0}
                                            </Typography>
                                          </Box>

                                          <ChecklistStatusTag status={checklistItem.status} />
                                        </Stack>

                                        {checklistItem.description && (
                                          <Typography sx={{ color: '#CBD5E1', fontSize: 11.6, lineHeight: 1.45 }}>
                                            {checklistItem.description}
                                          </Typography>
                                        )}

                                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                                          <Chip
                                            size="small"
                                            label={checklistItem.required ? 'Obrigatório' : 'Opcional'}
                                            sx={{ height: 22, fontSize: 10, color: '#E2E8F0', bgcolor: 'rgba(148,163,184,0.18)' }}
                                          />
                                          {checklistItem.due_date && (
                                            <Chip
                                              size="small"
                                              label={`Prazo: ${formatDate(checklistItem.due_date)}`}
                                              sx={{ height: 22, fontSize: 10, color: '#E2E8F0', bgcolor: 'rgba(59,130,246,0.18)' }}
                                            />
                                          )}
                                          {checklistItem.completed_at && (
                                            <Chip
                                              size="small"
                                              label={`Concluído em: ${formatDate(checklistItem.completed_at)}`}
                                              sx={{ height: 22, fontSize: 10, color: '#E2E8F0', bgcolor: 'rgba(16,185,129,0.18)' }}
                                            />
                                          )}
                                        </Stack>

                                        {checklistItem.notes && (
                                          <Typography sx={{ color: '#CBD5E1', fontSize: 11.5, lineHeight: 1.45 }}>
                                            <strong>Observação:</strong> {checklistItem.notes}
                                          </Typography>
                                        )}

                                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
                                          {inlineChecklistEditing?.cityId === item.id && inlineChecklistEditing?.itemId === checklistItem.id ? (
                                            <Box
                                              sx={{
                                                width: '100%',
                                                borderRadius: 1.25,
                                                border: '1px solid rgba(148,163,184,0.2)',
                                                bgcolor: 'rgba(15,23,42,0.55)',
                                                p: 0.95,
                                              }}
                                            >
                                              <Grid container spacing={0.9}>
                                                <Grid item xs={12} md={6}>
                                                  <TextField
                                                    fullWidth
                                                    size="small"
                                                    label="Título"
                                                    placeholder="Ex.: Alvará emitido"
                                                    value={inlineChecklistForm.title}
                                                    onChange={(event) => setInlineChecklistForm((prev) => ({ ...prev, title: event.target.value }))}
                                                    sx={INLINE_DARK_FIELD_SX}
                                                  />
                                                </Grid>
                                                <Grid item xs={12} md={3}>
                                                  <TextField
                                                    fullWidth
                                                    size="small"
                                                    label="Categoria"
                                                    placeholder="Ex.: Município"
                                                    value={inlineChecklistForm.category}
                                                    onChange={(event) => setInlineChecklistForm((prev) => ({ ...prev, category: event.target.value }))}
                                                    sx={INLINE_DARK_FIELD_SX}
                                                  />
                                                </Grid>
                                                <Grid item xs={12} md={3}>
                                                  <FormControl fullWidth size="small" sx={INLINE_DARK_FIELD_SX}>
                                                    <InputLabel id={`inline-check-status-${checklistItem.id}`}>Status</InputLabel>
                                                    <Select
                                                      labelId={`inline-check-status-${checklistItem.id}`}
                                                      label="Status"
                                                      value={inlineChecklistForm.status}
                                                      onChange={(event) => setInlineChecklistForm((prev) => ({ ...prev, status: event.target.value }))}
                                                      sx={INLINE_DARK_FIELD_SX}
                                                    >
                                                      {CHECKLIST_STATUS_OPTIONS.map((status) => (
                                                        <MenuItem key={status} value={status}>{CHECKLIST_STATUS_LABELS[status]}</MenuItem>
                                                      ))}
                                                    </Select>
                                                  </FormControl>
                                                </Grid>
                                                <Grid item xs={12} md={3}>
                                                  <TextField
                                                    fullWidth
                                                    size="small"
                                                    label="Ordem"
                                                    type="number"
                                                    value={inlineChecklistForm.sort_order}
                                                    onChange={(event) => setInlineChecklistForm((prev) => ({ ...prev, sort_order: Number(event.target.value) || 0 }))}
                                                    sx={INLINE_DARK_FIELD_SX}
                                                  />
                                                </Grid>
                                                <Grid item xs={12} md={5}>
                                                  <TextField
                                                    fullWidth
                                                    size="small"
                                                    multiline
                                                    minRows={1}
                                                    maxRows={3}
                                                    label="Descrição"
                                                    placeholder="Detalhes curtos"
                                                    value={inlineChecklistForm.description}
                                                    onChange={(event) => setInlineChecklistForm((prev) => ({ ...prev, description: event.target.value }))}
                                                    sx={INLINE_DARK_FIELD_SX}
                                                  />
                                                </Grid>
                                                <Grid item xs={12} md={4}>
                                                  <TextField
                                                    fullWidth
                                                    size="small"
                                                    label="Data de vencimento"
                                                    type="datetime-local"
                                                    InputLabelProps={{ shrink: true }}
                                                    value={inlineChecklistForm.due_date}
                                                    onChange={(event) => setInlineChecklistForm((prev) => ({ ...prev, due_date: event.target.value }))}
                                                    sx={INLINE_DARK_FIELD_SX}
                                                  />
                                                </Grid>
                                                <Grid item xs={12} md={3}>
                                                  <FormControl fullWidth size="small" sx={INLINE_DARK_FIELD_SX}>
                                                    <InputLabel id={`inline-check-required-${checklistItem.id}`}>Obrigatoriedade</InputLabel>
                                                    <Select
                                                      labelId={`inline-check-required-${checklistItem.id}`}
                                                      label="Obrigatoriedade"
                                                      value={inlineChecklistForm.required ? 'true' : 'false'}
                                                      onChange={(event) => setInlineChecklistForm((prev) => ({ ...prev, required: event.target.value === 'true' }))}
                                                      sx={INLINE_DARK_FIELD_SX}
                                                    >
                                                      <MenuItem value="true">Obrigatório</MenuItem>
                                                      <MenuItem value="false">Opcional</MenuItem>
                                                    </Select>
                                                  </FormControl>
                                                </Grid>
                                                <Grid item xs={12}>
                                                  <TextField
                                                    fullWidth
                                                    size="small"
                                                    multiline
                                                    minRows={1}
                                                    maxRows={3}
                                                    label="Observações"
                                                    placeholder="Observação interna"
                                                    value={inlineChecklistForm.notes}
                                                    onChange={(event) => setInlineChecklistForm((prev) => ({ ...prev, notes: event.target.value }))}
                                                    sx={INLINE_DARK_FIELD_SX}
                                                  />
                                                </Grid>
                                              </Grid>

                                              <Stack direction="row" spacing={1} sx={{ mt: 0.9, flexWrap: 'wrap' }}>
                                                <Button
                                                  size="small"
                                                  variant="contained"
                                                  onClick={() => saveInlineChecklistItem(item.id, checklistItem.id)}
                                                  disabled={inlineChecklistSaving}
                                                  sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' }, color: '#111827' }}
                                                >
                                                  {inlineChecklistSaving ? 'Salvando...' : 'Salvar alterações'}
                                                </Button>
                                                <Button
                                                  size="small"
                                                  variant="outlined"
                                                  onClick={cancelInlineChecklistEdit}
                                                  disabled={inlineChecklistSaving}
                                                  sx={{ color: '#E5E7EB', borderColor: 'rgba(226,232,240,0.22)' }}
                                                >
                                                  Cancelar
                                                </Button>
                                              </Stack>
                                            </Box>
                                          ) : (
                                            <>
                                              <FormControl size="small" sx={{ minWidth: 180 }}>
                                                <InputLabel sx={{ color: '#CBD5E1' }}>Status</InputLabel>
                                                <Select
                                                  value={checklistItem.status}
                                                  label="Status"
                                                  onChange={(event) => updateChecklistStatus(item.id, checklistItem, event.target.value)}
                                                  disabled={checklistStatusSavingId === checklistItem.id}
                                                  sx={{ color: '#F8FAFC', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.3)' } }}
                                                >
                                                  {CHECKLIST_STATUS_OPTIONS.map((status) => (
                                                    <MenuItem key={status} value={status}>{CHECKLIST_STATUS_LABELS[status]}</MenuItem>
                                                  ))}
                                                </Select>
                                              </FormControl>

                                              <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<Edit fontSize="small" />}
                                                onClick={() => startInlineChecklistEdit(item.id, checklistItem)}
                                                sx={{ color: '#E5E7EB', borderColor: 'rgba(226,232,240,0.22)' }}
                                              >
                                                Editar
                                              </Button>

                                              <Button
                                                size="small"
                                                variant="outlined"
                                                color="error"
                                                startIcon={<DeleteOutline fontSize="small" />}
                                                onClick={() => deleteChecklistItem(item.id, checklistItem)}
                                                disabled={checklistActionId === checklistItem.id}
                                              >
                                                Excluir
                                              </Button>

                                              <Typography sx={{ color: '#94A3B8', fontSize: 11.5, alignSelf: 'center' }}>
                                                {checklistStatusSavingId === checklistItem.id ? 'Salvando...' : checklistSavedByItem[checklistItem.id] ? 'Item salvo.' : ''}
                                              </Typography>
                                            </>
                                          )}
                                        </Stack>
                                      </Stack>
                                    </Box>
                                  ))}
                                </Stack>
                              )}
                            </Stack>
                          )}
                        </Box>
                      )}

                      {expandedProtocolsId === item.id && (
                        <Box
                          sx={{
                            mt: 1,
                            borderRadius: 2,
                            bgcolor: '#0B1324',
                            color: '#E5E7EB',
                            border: '1px solid rgba(148,163,184,0.18)',
                            p: 1.5,
                          }}
                        >
                          <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="center" sx={{ mb: 1.25, flexWrap: 'wrap', gap: 1 }}>
                            <Box>
                              <Typography sx={{ fontWeight: 800, color: '#F8FAFC', fontSize: 14 }}>
                                Protocolos / Motoristas
                              </Typography>
                              <Typography sx={{ color: '#94A3B8', fontSize: 11.5 }}>
                                Evite inserir CPF completo ou documentos sensíveis nesta etapa.
                              </Typography>
                              <Typography sx={{ color: '#94A3B8', fontSize: 11.5 }}>
                                Dados importados de forma limitada. Não exibimos CPF completo nem documentos sensíveis nesta tela.
                              </Typography>
                            </Box>

                            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => toggleDriverCandidatesPanel(item.id)}
                                sx={{ color: '#E5E7EB', borderColor: 'rgba(226,232,240,0.25)' }}
                              >
                                Adicionar do cadastro KAVIAR
                              </Button>

                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => openDriverProtocolCreate(item.id)}
                                disabled={protocolCreateCityId === item.id}
                                sx={{ color: '#E5E7EB', borderColor: 'rgba(226,232,240,0.25)' }}
                              >
                                Adicionar motorista
                              </Button>
                            </Stack>
                          </Stack>

                          {protocolsErrors[item.id] && (
                            <Alert severity="error" sx={{ mb: 1.25 }}>
                              {protocolsErrors[item.id]}
                            </Alert>
                          )}

                          {candidateErrorsByCity[item.id] && (
                            <Alert severity="error" sx={{ mb: 1.25 }}>
                              {candidateErrorsByCity[item.id]}
                            </Alert>
                          )}

                          {candidateSuccessByCity[item.id] && (
                            <Alert severity="success" sx={{ mb: 1.25 }}>
                              {candidateSuccessByCity[item.id]}
                            </Alert>
                          )}

                          {candidatePanelByCity[item.id] && (
                            <Box
                              sx={{
                                mb: 1.25,
                                borderRadius: 1.25,
                                border: '1px solid rgba(148,163,184,0.2)',
                                bgcolor: 'rgba(15,23,42,0.55)',
                                p: 1,
                              }}
                            >
                              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mb: 1 }}>
                                <TextField
                                  fullWidth
                                  size="small"
                                  label="Buscar motorista"
                                  placeholder="Nome, telefone ou placa"
                                  value={candidateQueryByCity[item.id] || ''}
                                  onChange={(event) =>
                                    setCandidateQueryByCity((prev) => ({ ...prev, [item.id]: event.target.value }))
                                  }
                                  sx={INLINE_DARK_FIELD_SX}
                                />
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => searchDriverCandidates(item.id)}
                                  disabled={Boolean(candidateLoadingByCity[item.id])}
                                  sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' }, color: '#111827' }}
                                >
                                  {candidateLoadingByCity[item.id] ? 'Buscando motoristas...' : 'Buscar'}
                                </Button>
                              </Stack>

                              {!candidateLoadedByCity[item.id] && !candidateLoadingByCity[item.id] && (
                                <Typography sx={{ color: '#94A3B8', fontSize: 12.2, mb: 1 }}>
                                  Digite nome, telefone ou placa para buscar motoristas aprovados.
                                </Typography>
                              )}

                              {candidateLoadingByCity[item.id] && !candidateLoadedByCity[item.id] && (
                                <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1 }}>
                                  <CircularProgress size={18} sx={{ color: '#B8942E' }} />
                                  <Typography sx={{ color: '#CBD5E1', fontSize: 13 }}>
                                    Buscando motoristas...
                                  </Typography>
                                </Stack>
                              )}

                              {candidateLoadedByCity[item.id] && (
                                <Stack spacing={1}>
                                  {(candidateByCity[item.id]?.items || []).length === 0 ? (
                                    <Stack spacing={0.35}>
                                      <Typography sx={{ color: '#CBD5E1', fontSize: 13 }}>
                                        Nenhum motorista real aprovado encontrado para importar.
                                      </Typography>
                                      <Typography sx={{ color: '#94A3B8', fontSize: 11.8 }}>
                                        Cadastre e aprove um motorista no KAVIAR antes de criar protocolo automático.
                                      </Typography>
                                    </Stack>
                                  ) : (
                                    (candidateByCity[item.id]?.items || []).map((candidate) => (
                                      (() => {
                                        const compatibility = candidate.compatibility || {};
                                        const documentSummary = candidate.documentSummary || {
                                          required: 0,
                                          submitted: 0,
                                          verified: 0,
                                          missing: 0,
                                          missingDocumentTypes: [],
                                        };
                                        const compatibleModalities = Array.isArray(compatibility.compatibleModalities)
                                          ? compatibility.compatibleModalities
                                          : [];
                                        const candidateServiceModalityKey = `${item.id}:${candidate.id}`;
                                        const selectedCandidateServiceModality = candidateServiceModalityByDriver[candidateServiceModalityKey] || '';
                                        const requiresModalitySelection = compatibleModalities.length > 1;
                                        const hasSelectedModality = !requiresModalitySelection || Boolean(selectedCandidateServiceModality);
                                        const canCreateProtocol = compatibility.compatible === true && !candidate.alreadyLinked && hasSelectedModality;
                                        const isActionLoading = candidateActionByCity[item.id] === candidate.id;
                                        const cityStatusLabel = compatibility.cityMatch === true
                                          ? 'compatível'
                                          : compatibility.status === 'REVIEW_REQUIRED'
                                            ? 'não confirmada'
                                            : 'outra cidade';
                                        const friendlyReasons = Array.isArray(compatibility.reasons)
                                          ? compatibility.reasons.map((reason) => formatCompatibilityReason(reason, documentSummary))
                                          : [];

                                        return (
                                      <Box
                                        key={candidate.id}
                                        sx={{
                                          borderRadius: 1.25,
                                          border: '1px solid rgba(148,163,184,0.2)',
                                          bgcolor: 'rgba(30,41,59,0.75)',
                                          p: 1,
                                        }}
                                      >
                                        <Stack spacing={0.65}>
                                          <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: 12.8 }}>
                                            {candidate.name}
                                          </Typography>

                                          <Typography sx={{ color: '#CBD5E1', fontSize: 11.8 }}>
                                            CPF final: {candidate.cpfLast4 || '-'}
                                            {' · '}
                                            Telefone: {candidate.phoneMasked || '-'}
                                          </Typography>

                                          <Typography sx={{ color: '#CBD5E1', fontSize: 11.8 }}>
                                            Placa: {candidate.vehiclePlate || '-'}
                                            {' · '}
                                            Tipo: {candidate.vehicleType || '-'}
                                          </Typography>

                                          <Typography sx={{ color: '#CBD5E1', fontSize: 11.8 }}>
                                            Status do cadastro: {candidate.approvalStatus || '-'}
                                          </Typography>

                                          {candidate.modalitySummary && (
                                            <Typography sx={{ color: '#CBD5E1', fontSize: 11.8 }}>
                                              Modalidades: {candidate.modalitySummary}
                                            </Typography>
                                          )}

                                          <CompatibilityTag status={compatibility.status} />

                                          <Typography sx={{ color: '#CBD5E1', fontSize: 11.8 }}>
                                            Cidade: {cityStatusLabel}
                                          </Typography>

                                          <Typography sx={{ color: '#CBD5E1', fontSize: 11.8 }}>
                                            Modalidades aprovadas: {(compatibility.approvedModalities || []).join(', ') || '-'}
                                          </Typography>

                                          <Typography sx={{ color: '#CBD5E1', fontSize: 11.8 }}>
                                            Modalidades compatíveis: {(compatibility.compatibleModalities || []).join(', ') || '-'}
                                          </Typography>

                                          {requiresModalitySelection && (
                                            <FormControl size="small" sx={{ minWidth: 240 }}>
                                              <InputLabel sx={{ color: '#CBD5E1' }}>Modalidade para protocolo</InputLabel>
                                              <Select
                                                value={selectedCandidateServiceModality}
                                                label="Modalidade para protocolo"
                                                onChange={(event) => {
                                                  const nextValue = event.target.value;
                                                  setCandidateServiceModalityByDriver((prev) => ({
                                                    ...prev,
                                                    [candidateServiceModalityKey]: nextValue,
                                                  }));
                                                }}
                                                sx={{ color: '#F8FAFC', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.3)' } }}
                                              >
                                                {compatibleModalities.map((modality) => (
                                                  <MenuItem key={`${candidate.id}-${modality}`} value={modality}>
                                                    {MUNICIPAL_MODALITY_LABELS[modality] || modality}
                                                  </MenuItem>
                                                ))}
                                              </Select>
                                            </FormControl>
                                          )}

                                          <Typography sx={{ color: '#CBD5E1', fontSize: 11.8 }}>
                                            Documentos: {Number(documentSummary.submitted || 0) + Number(documentSummary.verified || 0)} de {documentSummary.required || 0} disponíveis
                                          </Typography>

                                          <Typography sx={{ color: '#CBD5E1', fontSize: 11.8 }}>
                                            Verificados: {documentSummary.verified || 0}
                                            {' · '}
                                            Pendentes/ausentes: {documentSummary.missing || 0}
                                          </Typography>

                                          {Array.isArray(documentSummary.missingDocumentTypes) && documentSummary.missingDocumentTypes.length > 0 && (
                                            <Typography sx={{ color: '#94A3B8', fontSize: 11.4 }}>
                                              Tipos ausentes: {documentSummary.missingDocumentTypes.join(', ')}
                                            </Typography>
                                          )}

                                          {friendlyReasons.length > 0 && (
                                            <Box sx={{ mt: 0.4 }}>
                                              <Typography sx={{ color: '#FCA5A5', fontSize: 11.6, fontWeight: 700 }}>
                                                Pendências para protocolo:
                                              </Typography>
                                              {friendlyReasons.slice(0, 3).map((reason) => (
                                                <Typography key={`${candidate.id}-${reason}`} sx={{ color: '#FECACA', fontSize: 11.5, lineHeight: 1.45 }}>
                                                  • {reason}
                                                </Typography>
                                              ))}
                                            </Box>
                                          )}

                                          {candidate.alreadyLinked && (
                                            <Chip
                                              size="small"
                                              label="Já vinculado a esta cidade"
                                              sx={{ width: 'fit-content', color: '#F8FAFC', bgcolor: 'rgba(184,148,46,0.28)' }}
                                            />
                                          )}

                                          <Box>
                                            <Button
                                              size="small"
                                              variant="contained"
                                              onClick={() => createProtocolFromDriver(item.id, candidate.id, compatibleModalities)}
                                              disabled={!canCreateProtocol || isActionLoading}
                                              sx={{ bgcolor: '#0F766E', '&:hover': { bgcolor: '#115E59' }, color: '#F8FAFC' }}
                                            >
                                              {isActionLoading ? 'Criando...' : 'Criar protocolo'}
                                            </Button>

                                            {!canCreateProtocol && (
                                              <Typography sx={{ color: '#94A3B8', fontSize: 11.2, mt: 0.6 }}>
                                                {candidate.alreadyLinked
                                                  ? 'Já existe protocolo para este motorista nesta cidade.'
                                                  : requiresModalitySelection && !selectedCandidateServiceModality
                                                    ? 'Selecione a modalidade municipal para gerar este protocolo.'
                                                  : compatibility.status === 'REVIEW_REQUIRED'
                                                    ? 'Criação automática bloqueada: revisão manual necessária.'
                                                    : 'Criação automática bloqueada até resolver as pendências.'}
                                              </Typography>
                                            )}
                                          </Box>
                                        </Stack>
                                      </Box>
                                        );
                                      })()
                                    ))
                                  )}
                                </Stack>
                              )}
                            </Box>
                          )}

                          {!protocolsErrors[item.id] && protocolsLoadingByCity[item.id] && !protocolsLoadedByCity[item.id] && (
                            <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 1.5 }}>
                              <CircularProgress size={20} sx={{ color: '#B8942E' }} />
                              <Typography sx={{ color: '#CBD5E1', fontSize: 13 }}>
                                Carregando protocolos...
                              </Typography>
                            </Stack>
                          )}

                          {!protocolsErrors[item.id] && protocolCreateCityId === item.id && (
                            <Box
                              sx={{
                                width: '100%',
                                borderRadius: 1.25,
                                border: '1px solid rgba(148,163,184,0.2)',
                                bgcolor: 'rgba(15,23,42,0.55)',
                                p: 0.95,
                                mb: 1.25,
                              }}
                            >
                              <Grid container spacing={0.9}>
                                <Grid item xs={12} md={4}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Motorista"
                                    value={protocolForm.driver_name}
                                    onChange={(event) => setProtocolForm((prev) => ({ ...prev, driver_name: event.target.value }))}
                                    sx={INLINE_DARK_FIELD_SX}
                                  />
                                </Grid>
                                <Grid item xs={12} md={2}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="CPF final"
                                    inputProps={{ maxLength: 4 }}
                                    value={protocolForm.cpf_last4}
                                    onChange={(event) =>
                                      setProtocolForm((prev) => ({ ...prev, cpf_last4: normalizeCpfLast4(event.target.value) }))
                                    }
                                    sx={INLINE_DARK_FIELD_SX}
                                  />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                  <FormControl fullWidth size="small" sx={INLINE_DARK_FIELD_SX}>
                                    <InputLabel id={`create-driver-modality-${item.id}`}>Modalidade municipal</InputLabel>
                                    <Select
                                      labelId={`create-driver-modality-${item.id}`}
                                      label="Modalidade municipal"
                                      value={protocolForm.service_modality}
                                      onChange={(event) => setProtocolForm((prev) => ({ ...prev, service_modality: event.target.value }))}
                                      sx={INLINE_DARK_FIELD_SX}
                                    >
                                      <MenuItem value="">Não definida</MenuItem>
                                      {MUNICIPAL_MODALITY_OPTIONS.map((modality) => (
                                        <MenuItem key={`create-${item.id}-${modality}`} value={modality}>{MUNICIPAL_MODALITY_LABELS[modality] || modality}</MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </Grid>
                                <Grid item xs={12} md={3}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Placa"
                                    value={protocolForm.vehicle_plate}
                                    onChange={(event) => setProtocolForm((prev) => ({ ...prev, vehicle_plate: event.target.value.toUpperCase() }))}
                                    sx={INLINE_DARK_FIELD_SX}
                                  />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Tipo de veículo"
                                    value={protocolForm.vehicle_type}
                                    onChange={(event) => setProtocolForm((prev) => ({ ...prev, vehicle_type: event.target.value }))}
                                    sx={INLINE_DARK_FIELD_SX}
                                  />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Número do protocolo"
                                    value={protocolForm.protocol_number}
                                    onChange={(event) => setProtocolForm((prev) => ({ ...prev, protocol_number: event.target.value }))}
                                    sx={INLINE_DARK_FIELD_SX}
                                  />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                  <FormControl fullWidth size="small" sx={INLINE_DARK_FIELD_SX}>
                                    <InputLabel id={`create-driver-status-${item.id}`}>Status</InputLabel>
                                    <Select
                                      labelId={`create-driver-status-${item.id}`}
                                      label="Status"
                                      value={protocolForm.status}
                                      onChange={(event) => setProtocolForm((prev) => ({ ...prev, status: event.target.value }))}
                                      sx={INLINE_DARK_FIELD_SX}
                                    >
                                      {DRIVER_PROTOCOL_STATUS_OPTIONS.map((status) => (
                                        <MenuItem key={status} value={status}>{DRIVER_PROTOCOL_STATUS_LABELS[status]}</MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    type="datetime-local"
                                    label="Próximo acompanhamento"
                                    InputLabelProps={{ shrink: true }}
                                    value={protocolForm.next_follow_up_at}
                                    onChange={(event) => setProtocolForm((prev) => ({ ...prev, next_follow_up_at: event.target.value }))}
                                    sx={INLINE_DARK_FIELD_SX}
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    label="Próxima ação"
                                    value={protocolForm.next_action}
                                    onChange={(event) => setProtocolForm((prev) => ({ ...prev, next_action: event.target.value }))}
                                    sx={INLINE_DARK_FIELD_SX}
                                  />
                                </Grid>
                                <Grid item xs={12}>
                                  <TextField
                                    fullWidth
                                    size="small"
                                    multiline
                                    minRows={2}
                                    maxRows={4}
                                    label="Observações"
                                    value={protocolForm.notes}
                                    onChange={(event) => setProtocolForm((prev) => ({ ...prev, notes: event.target.value }))}
                                    sx={INLINE_DARK_FIELD_SX}
                                  />
                                </Grid>
                              </Grid>

                              <Stack direction="row" spacing={1} sx={{ mt: 0.9, flexWrap: 'wrap' }}>
                                <Button
                                  size="small"
                                  variant="contained"
                                  onClick={() => submitDriverProtocolForm(item.id)}
                                  disabled={protocolSaving || !protocolForm.driver_name.trim()}
                                  sx={{
                                    bgcolor: '#B8942E',
                                    '&:hover': { bgcolor: '#9A7B24' },
                                    color: '#111827',
                                    '&.Mui-disabled': {
                                      bgcolor: 'rgba(184,148,46,0.42)',
                                      color: 'rgba(17,24,39,0.72)',
                                    },
                                  }}
                                >
                                  {protocolSaving ? 'Salvando...' : 'Salvar protocolo'}
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={cancelDriverProtocolCreate}
                                  disabled={protocolSaving}
                                  sx={{ color: '#E5E7EB', borderColor: 'rgba(226,232,240,0.22)' }}
                                >
                                  Cancelar
                                </Button>
                              </Stack>

                              {!protocolSaving && !protocolForm.driver_name.trim() && (
                                <Typography sx={{ mt: 0.7, color: '#94A3B8', fontSize: 11.8 }}>
                                  Informe o nome do motorista para salvar.
                                </Typography>
                              )}
                            </Box>
                          )}

                          {!protocolsErrors[item.id] && protocolsLoadedByCity[item.id] && protocolsByCity[item.id] && (
                            <Stack spacing={1.1}>
                              {protocolsByCity[item.id].items.length === 0 ? (
                                <Typography sx={{ color: '#CBD5E1', fontSize: 13 }}>
                                  Nenhum protocolo de motorista cadastrado para esta cidade.
                                </Typography>
                              ) : (
                                <Stack spacing={1}>
                                  {protocolsByCity[item.id].items.map((protocolItem) => (
                                    <Box
                                      key={protocolItem.id}
                                      sx={{
                                        borderRadius: 1.5,
                                        bgcolor: 'rgba(30,41,59,0.92)',
                                        p: 1.1,
                                        border: '1px solid rgba(148,163,184,0.1)',
                                      }}
                                    >
                                      <Stack spacing={0.9}>
                                        <Stack direction="row" spacing={1} justifyContent="space-between" alignItems="flex-start" sx={{ flexWrap: 'wrap', gap: 1 }}>
                                          <Box>
                                            <Typography sx={{ color: '#F8FAFC', fontWeight: 700, fontSize: 12.8, lineHeight: 1.35 }}>
                                              {protocolItem.driver_name}
                                            </Typography>
                                            <Typography sx={{ color: '#94A3B8', fontSize: 11.25, mt: 0.25 }}>
                                              CPF final: {protocolItem.cpf_last4 || '-'}
                                              {' · '}
                                              Placa: {protocolItem.vehicle_plate || '-'}
                                            </Typography>
                                          </Box>

                                          <DriverProtocolStatusTag status={protocolItem.status} />
                                        </Stack>

                                        <Typography sx={{ color: '#CBD5E1', fontSize: 11.5 }}>
                                          Protocolo: {protocolItem.protocol_number || '-'}
                                          {' · '}
                                          Tipo: {protocolItem.vehicle_type || '-'}
                                        </Typography>

                                        <Typography sx={{ color: '#CBD5E1', fontSize: 11.5 }}>
                                          Modalidade municipal: {protocolItem.service_modality ? (MUNICIPAL_MODALITY_LABELS[protocolItem.service_modality] || protocolItem.service_modality) : '-'}
                                        </Typography>

                                        <AuthorizationOperationalTag state={protocolItem.authorizationOperational?.state} />

                                        {protocolItem.authorizationOperational?.reason && (
                                          <Typography sx={{ color: '#94A3B8', fontSize: 11.5, lineHeight: 1.45 }}>
                                            {protocolItem.authorizationOperational.reason}
                                          </Typography>
                                        )}

                                        {(protocolItem.authorizationOperational?.state === 'ACTIVE' || protocolItem.authorizationOperational?.state === 'EXPIRING_SOON') && (
                                          <Typography sx={{ color: '#CBD5E1', fontSize: 11.5, lineHeight: 1.45 }}>
                                            <strong>Validade municipal:</strong>{' '}
                                            {protocolItem.authorizationOperational?.validUntil
                                              ? formatDateOnly(protocolItem.authorizationOperational.validUntil)
                                              : 'sem prazo definido'}
                                          </Typography>
                                        )}

                                        {protocolItem.authorizationOperational?.state === 'EXPIRING_SOON' && typeof protocolItem.authorizationOperational?.daysUntilExpiry === 'number' && (
                                          <Typography sx={{ color: '#FDE68A', fontSize: 11.5, lineHeight: 1.45 }}>
                                            {protocolItem.authorizationOperational.daysUntilExpiry === 0
                                              ? 'Vence hoje'
                                              : `Vence em ${protocolItem.authorizationOperational.daysUntilExpiry} dias`}
                                          </Typography>
                                        )}

                                        {protocolItem.authorizationOperational?.state === 'EXPIRED' && (
                                          <Typography sx={{ color: '#FECACA', fontSize: 11.5, lineHeight: 1.45 }}>
                                            Operação municipal bloqueada até renovação.
                                          </Typography>
                                        )}

                                        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                                          {protocolItem.submitted_at && (
                                            <Chip size="small" label={`Protocolado: ${formatDate(protocolItem.submitted_at)}`} sx={{ height: 22, fontSize: 10, color: '#E2E8F0', bgcolor: 'rgba(45,212,191,0.2)' }} />
                                          )}
                                          {protocolItem.approved_at && (
                                            <Chip size="small" label={`Aprovado: ${formatDate(protocolItem.approved_at)}`} sx={{ height: 22, fontSize: 10, color: '#E2E8F0', bgcolor: 'rgba(16,185,129,0.2)' }} />
                                          )}
                                          {protocolItem.rejected_at && (
                                            <Chip size="small" label={`Rejeitado: ${formatDate(protocolItem.rejected_at)}`} sx={{ height: 22, fontSize: 10, color: '#E2E8F0', bgcolor: 'rgba(239,68,68,0.2)' }} />
                                          )}
                                          {protocolItem.next_follow_up_at && (
                                            <Chip size="small" label={`Follow-up: ${formatDate(protocolItem.next_follow_up_at)}`} sx={{ height: 22, fontSize: 10, color: '#E2E8F0', bgcolor: 'rgba(59,130,246,0.2)' }} />
                                          )}
                                        </Stack>

                                        {protocolItem.next_action && (
                                          <Typography sx={{ color: '#CBD5E1', fontSize: 11.5, lineHeight: 1.45 }}>
                                            <strong>Próxima ação:</strong> {protocolItem.next_action}
                                          </Typography>
                                        )}

                                        {protocolItem.notes && (
                                          <Typography sx={{ color: '#CBD5E1', fontSize: 11.5, lineHeight: 1.45 }}>
                                            <strong>Observação:</strong> {protocolItem.notes}
                                          </Typography>
                                        )}

                                        {protocolItem.status === 'APPROVED' && protocolItem.driverId && protocolItem.authorizationOperational?.canGenerate && (
                                          <Box>
                                            <Button
                                              size="small"
                                              variant="contained"
                                              onClick={() => generateMunicipalAuthorization(item.id, protocolItem)}
                                              disabled={Boolean(protocolAuthorizationActionByItem[protocolItem.id])}
                                              sx={{ bgcolor: '#0F766E', '&:hover': { bgcolor: '#115E59' }, color: '#F8FAFC' }}
                                            >
                                              {protocolAuthorizationActionByItem[protocolItem.id] ? 'Gerando autorização...' : 'Gerar autorização municipal'}
                                            </Button>
                                          </Box>
                                        )}

                                        {protocolEditing?.cityId === item.id && protocolEditing?.itemId === protocolItem.id ? (
                                          <Box
                                            sx={{
                                              width: '100%',
                                              borderRadius: 1.25,
                                              border: '1px solid rgba(148,163,184,0.2)',
                                              bgcolor: 'rgba(15,23,42,0.55)',
                                              p: 0.95,
                                            }}
                                          >
                                            <Grid container spacing={0.9}>
                                              <Grid item xs={12} md={4}>
                                                <TextField
                                                  fullWidth
                                                  size="small"
                                                  label="Motorista"
                                                  value={inlineProtocolForm.driver_name}
                                                  onChange={(event) => setInlineProtocolForm((prev) => ({ ...prev, driver_name: event.target.value }))}
                                                  sx={INLINE_DARK_FIELD_SX}
                                                />
                                              </Grid>
                                              <Grid item xs={12} md={2}>
                                                <TextField
                                                  fullWidth
                                                  size="small"
                                                  label="CPF final"
                                                  inputProps={{ maxLength: 4 }}
                                                  value={inlineProtocolForm.cpf_last4}
                                                  onChange={(event) =>
                                                    setInlineProtocolForm((prev) => ({ ...prev, cpf_last4: normalizeCpfLast4(event.target.value) }))
                                                  }
                                                  sx={INLINE_DARK_FIELD_SX}
                                                />
                                              </Grid>
                                              <Grid item xs={12} md={3}>
                                                <FormControl fullWidth size="small" sx={INLINE_DARK_FIELD_SX}>
                                                  <InputLabel id={`inline-driver-modality-${protocolItem.id}`}>Modalidade municipal</InputLabel>
                                                  <Select
                                                    labelId={`inline-driver-modality-${protocolItem.id}`}
                                                    label="Modalidade municipal"
                                                    value={inlineProtocolForm.service_modality}
                                                    onChange={(event) => setInlineProtocolForm((prev) => ({ ...prev, service_modality: event.target.value }))}
                                                    sx={INLINE_DARK_FIELD_SX}
                                                  >
                                                    <MenuItem value="">Não definida</MenuItem>
                                                    {MUNICIPAL_MODALITY_OPTIONS.map((modality) => (
                                                      <MenuItem key={`inline-${protocolItem.id}-${modality}`} value={modality}>{MUNICIPAL_MODALITY_LABELS[modality] || modality}</MenuItem>
                                                    ))}
                                                  </Select>
                                                </FormControl>
                                              </Grid>
                                              <Grid item xs={12} md={3}>
                                                <TextField
                                                  fullWidth
                                                  size="small"
                                                  label="Placa"
                                                  value={inlineProtocolForm.vehicle_plate}
                                                  onChange={(event) => setInlineProtocolForm((prev) => ({ ...prev, vehicle_plate: event.target.value.toUpperCase() }))}
                                                  sx={INLINE_DARK_FIELD_SX}
                                                />
                                              </Grid>
                                              <Grid item xs={12} md={3}>
                                                <TextField
                                                  fullWidth
                                                  size="small"
                                                  label="Tipo de veículo"
                                                  value={inlineProtocolForm.vehicle_type}
                                                  onChange={(event) => setInlineProtocolForm((prev) => ({ ...prev, vehicle_type: event.target.value }))}
                                                  sx={INLINE_DARK_FIELD_SX}
                                                />
                                              </Grid>
                                              <Grid item xs={12} md={4}>
                                                <TextField
                                                  fullWidth
                                                  size="small"
                                                  label="Número do protocolo"
                                                  value={inlineProtocolForm.protocol_number}
                                                  onChange={(event) => setInlineProtocolForm((prev) => ({ ...prev, protocol_number: event.target.value }))}
                                                  sx={INLINE_DARK_FIELD_SX}
                                                />
                                              </Grid>
                                              <Grid item xs={12} md={4}>
                                                <FormControl fullWidth size="small" sx={INLINE_DARK_FIELD_SX}>
                                                  <InputLabel id={`inline-driver-status-${protocolItem.id}`}>Status</InputLabel>
                                                  <Select
                                                    labelId={`inline-driver-status-${protocolItem.id}`}
                                                    label="Status"
                                                    value={inlineProtocolForm.status}
                                                    onChange={(event) => setInlineProtocolForm((prev) => ({ ...prev, status: event.target.value }))}
                                                    sx={INLINE_DARK_FIELD_SX}
                                                  >
                                                    {DRIVER_PROTOCOL_STATUS_OPTIONS.map((status) => (
                                                      <MenuItem key={status} value={status}>{DRIVER_PROTOCOL_STATUS_LABELS[status]}</MenuItem>
                                                    ))}
                                                  </Select>
                                                </FormControl>
                                              </Grid>
                                              <Grid item xs={12} md={4}>
                                                <TextField
                                                  fullWidth
                                                  size="small"
                                                  type="datetime-local"
                                                  label="Próximo acompanhamento"
                                                  InputLabelProps={{ shrink: true }}
                                                  value={inlineProtocolForm.next_follow_up_at}
                                                  onChange={(event) => setInlineProtocolForm((prev) => ({ ...prev, next_follow_up_at: event.target.value }))}
                                                  sx={INLINE_DARK_FIELD_SX}
                                                />
                                              </Grid>
                                              <Grid item xs={12} md={4}>
                                                <TextField
                                                  fullWidth
                                                  size="small"
                                                  type="datetime-local"
                                                  label="Data protocolo"
                                                  InputLabelProps={{ shrink: true }}
                                                  value={inlineProtocolForm.submitted_at}
                                                  onChange={(event) => setInlineProtocolForm((prev) => ({ ...prev, submitted_at: event.target.value }))}
                                                  sx={INLINE_DARK_FIELD_SX}
                                                />
                                              </Grid>
                                              <Grid item xs={12} md={4}>
                                                <TextField
                                                  fullWidth
                                                  size="small"
                                                  type="datetime-local"
                                                  label="Data aprovação"
                                                  InputLabelProps={{ shrink: true }}
                                                  value={inlineProtocolForm.approved_at}
                                                  onChange={(event) => setInlineProtocolForm((prev) => ({ ...prev, approved_at: event.target.value }))}
                                                  sx={INLINE_DARK_FIELD_SX}
                                                />
                                              </Grid>
                                              <Grid item xs={12} md={4}>
                                                <TextField
                                                  fullWidth
                                                  size="small"
                                                  type="datetime-local"
                                                  label="Data rejeição"
                                                  InputLabelProps={{ shrink: true }}
                                                  value={inlineProtocolForm.rejected_at}
                                                  onChange={(event) => setInlineProtocolForm((prev) => ({ ...prev, rejected_at: event.target.value }))}
                                                  sx={INLINE_DARK_FIELD_SX}
                                                />
                                              </Grid>
                                              <Grid item xs={12}>
                                                <TextField
                                                  fullWidth
                                                  size="small"
                                                  label="Próxima ação"
                                                  value={inlineProtocolForm.next_action}
                                                  onChange={(event) => setInlineProtocolForm((prev) => ({ ...prev, next_action: event.target.value }))}
                                                  sx={INLINE_DARK_FIELD_SX}
                                                />
                                              </Grid>
                                              <Grid item xs={12}>
                                                <TextField
                                                  fullWidth
                                                  size="small"
                                                  multiline
                                                  minRows={2}
                                                  maxRows={4}
                                                  label="Observações"
                                                  value={inlineProtocolForm.notes}
                                                  onChange={(event) => setInlineProtocolForm((prev) => ({ ...prev, notes: event.target.value }))}
                                                  sx={INLINE_DARK_FIELD_SX}
                                                />
                                              </Grid>
                                            </Grid>

                                            <Stack direction="row" spacing={1} sx={{ mt: 0.9, flexWrap: 'wrap' }}>
                                              <Button
                                                size="small"
                                                variant="contained"
                                                onClick={() => saveInlineDriverProtocol(item.id, protocolItem.id)}
                                                disabled={protocolSaving || !inlineProtocolForm.driver_name.trim()}
                                                sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' }, color: '#111827' }}
                                              >
                                                {protocolSaving ? 'Salvando...' : 'Salvar alterações'}
                                              </Button>
                                              <Button
                                                size="small"
                                                variant="outlined"
                                                onClick={cancelInlineProtocolEdit}
                                                disabled={protocolSaving}
                                                sx={{ color: '#E5E7EB', borderColor: 'rgba(226,232,240,0.22)' }}
                                              >
                                                Cancelar
                                              </Button>
                                            </Stack>
                                          </Box>
                                        ) : (
                                          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ flexWrap: 'wrap' }}>
                                            <Button
                                              size="small"
                                              variant="outlined"
                                              startIcon={<Edit fontSize="small" />}
                                              onClick={() => startInlineProtocolEdit(item.id, protocolItem)}
                                              sx={{ color: '#E5E7EB', borderColor: 'rgba(226,232,240,0.22)' }}
                                            >
                                              Editar
                                            </Button>

                                            <Button
                                              size="small"
                                              variant="outlined"
                                              color="error"
                                              startIcon={<DeleteOutline fontSize="small" />}
                                              onClick={() => deleteDriverProtocol(item.id, protocolItem)}
                                              disabled={protocolActionId === protocolItem.id}
                                            >
                                              Excluir
                                            </Button>

                                            <Typography sx={{ color: '#94A3B8', fontSize: 11.5, alignSelf: 'center' }}>
                                              {protocolActionId === protocolItem.id ? 'Salvando...' : protocolSavedByItem[protocolItem.id] ? 'Protocolo salvo.' : ''}
                                            </Typography>
                                          </Stack>
                                        )}
                                      </Stack>
                                    </Box>
                                  ))}
                                </Stack>
                              )}
                            </Stack>
                          )}
                        </Box>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}

            {!items.length && (
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 2, border: '1px dashed #D1D5DB' }}>
                  <CardContent>
                    <Typography sx={{ color: '#6B7280' }}>
                      Nenhum caso cadastrado ainda. Clique em Nova cidade para iniciar.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}
          </Grid>
        )}

        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
          <Typography sx={{ color: '#9CA3AF', fontSize: 12 }}>
            Página {page} de {totalPages}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            disabled={page <= 1 || loading}
            onClick={() => loadCases(page - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={page >= totalPages || loading}
            onClick={() => loadCases(page + 1)}
          >
            Próxima
          </Button>
        </Stack>
      </Stack>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? 'Editar cidade' : 'Nova cidade'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Cidade"
                value={form.city}
                onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Estado"
                inputProps={{ maxLength: 2 }}
                value={form.state}
                onChange={(event) => setForm((prev) => ({ ...prev, state: event.target.value.toUpperCase() }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="reg-city-status">Status</InputLabel>
                <Select
                  labelId="reg-city-status"
                  label="Status"
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  {STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>{STATUS_LABELS[status]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do setor"
                value={form.department_name}
                onChange={(event) => setForm((prev) => ({ ...prev, department_name: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nome do contato"
                value={form.contact_name}
                onChange={(event) => setForm((prev) => ({ ...prev, contact_name: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="E-mail de contato"
                type="email"
                value={form.contact_email}
                onChange={(event) => setForm((prev) => ({ ...prev, contact_email: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Telefone"
                value={form.contact_phone}
                onChange={(event) => setForm((prev) => ({ ...prev, contact_phone: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Último envio"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={form.last_sent_at}
                onChange={(event) => setForm((prev) => ({ ...prev, last_sent_at: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Última resposta"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={form.last_response_at}
                onChange={(event) => setForm((prev) => ({ ...prev, last_response_at: event.target.value }))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de próximo acompanhamento"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={form.next_follow_up_at}
                onChange={(event) => setForm((prev) => ({ ...prev, next_follow_up_at: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Próxima ação"
                value={form.next_action}
                onChange={(event) => setForm((prev) => ({ ...prev, next_action: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={4}
                label="Observações"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog} disabled={saving}>Cancelar</Button>
          <Button onClick={submitForm} variant="contained" disabled={saving} sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }}>
            {saving ? 'Salvando...' : editingId ? 'Salvar alterações' : 'Criar cidade'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={checklistFormOpen} onClose={closeChecklistForm} fullWidth maxWidth="md">
        <DialogTitle>Adicionar item ao checklist</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Título"
                value={checklistForm.title}
                onChange={(event) => setChecklistForm((prev) => ({ ...prev, title: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Categoria"
                value={checklistForm.category}
                onChange={(event) => setChecklistForm((prev) => ({ ...prev, category: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel id="checklist-status">Status</InputLabel>
                <Select
                  labelId="checklist-status"
                  label="Status"
                  value={checklistForm.status}
                  onChange={(event) => setChecklistForm((prev) => ({ ...prev, status: event.target.value }))}
                >
                  {CHECKLIST_STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>{CHECKLIST_STATUS_LABELS[status]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Ordem"
                type="number"
                value={checklistForm.sort_order}
                onChange={(event) => setChecklistForm((prev) => ({ ...prev, sort_order: Number(event.target.value) || 0 }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                multiline
                minRows={3}
                value={checklistForm.description}
                onChange={(event) => setChecklistForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Data de vencimento"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                value={checklistForm.due_date}
                onChange={(event) => setChecklistForm((prev) => ({ ...prev, due_date: event.target.value }))}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="checklist-required">Obrigatoriedade</InputLabel>
                <Select
                  labelId="checklist-required"
                  label="Obrigatoriedade"
                  value={checklistForm.required ? 'true' : 'false'}
                  onChange={(event) => setChecklistForm((prev) => ({ ...prev, required: event.target.value === 'true' }))}
                >
                  <MenuItem value="true">Obrigatório</MenuItem>
                  <MenuItem value="false">Opcional</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={4}
                label="Observações"
                value={checklistForm.notes}
                onChange={(event) => setChecklistForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeChecklistForm} disabled={checklistSaving}>Cancelar</Button>
          <Button onClick={submitChecklistForm} variant="contained" disabled={checklistSaving} sx={{ bgcolor: '#B8942E', '&:hover': { bgcolor: '#9A7B24' } }}>
            {checklistSaving ? 'Salvando...' : 'Adicionar item'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
