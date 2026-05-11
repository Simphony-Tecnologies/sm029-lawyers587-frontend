'use client';
import Modal from '@/components/organisms/Modal';
import { api, database } from '@/services/database';
import type { LawyerStats as LawyerStatsDTO } from '@/types/api.types';
import { useState, useEffect, useMemo } from 'react';
import {
  MdAdd,
  MdDeleteOutline,
  MdEdit,
  MdFileDownload,
  MdPowerSettingsNew,
} from 'react-icons/md';
import Button from '@/components/atoms/Button';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useLeadsStore } from '@/store/useLead.store';
import { useSelectStatus } from '@/store/useSelectStatus';
import axios from 'axios';
import {
  Avatar,
  CapacityBar,
  ConfirmationDialog,
  DataTable,
  FilterButton,
  IconActionButton,
  LawyerFormModal,
  LawyerPasswordModal,
  LawyerStatusPill,
  LiveDot,
  PageHead,
  SearchField,
  StatCard,
  toneFromString,
  type LawyerFormInitialData,
  type LawyerStatus,
  type LawyerStatusKey,
} from '@/components/ui';

const LawyerManagement = () => {
  const [data, setData] = useState<any>(null);
  const [columns, setColumns] = useState([]);
  const [error, setError] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenNew, setIsOpenNew] = useState(false);
  const [dataIndex, setDataIndex] = useState<any>();
  const [dataServiceType, setDataServiceType] = useState([]);
  const [withOutFormat, setWithOutFormat] = useState<any>([]);
  const [isOpenDelete, setIsOpenDelete] = useState(false);
  const [file, setFile] = useState<any>(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isOpenPassword, setIsopenPassword] = useState(false);
  const [statusToggleTarget, setStatusToggleTarget] = useState<{
    id: number;
    name: string;
    nextActive: boolean;
  } | null>(null);
  const [statusToggleComment, setStatusToggleComment] = useState('');
  const [statusToggleLoading, setStatusToggleLoading] = useState(false);
  const [statsServer, setStatsServer] = useState<LawyerStatsDTO | null>(null);
  const [lawyerStats, setLawyerStats] = useState<{
    total: number;
    available: number;
    active: number;
    lost: number;
    missed: number;
  }>({ total: 0, available: 0, active: 0, lost: 0, missed: 0 });
  const [assignable, setAssignable] = useState<any>(null);
  const [loadingModal, setLoadingModal] = useState(false);
  const { dataLeads } = useLeadsStore();
  const [dataLawyerLeads, setDataLawyerLeads] = useState<any>(null);
  const [dataLawyerServices, setDataLawyerServices] = useState<any>(null);
  const [labelService, setLabelService] = useState<any>(null);
  const [dataProject, setDataProject] = useState(null);
  const [selectedOptionsService, setSelectedOptionsService] = useState<any[]>(
    []
  );

  const [additionalValues, setAdditionalValues] = useState<any>({});

  const [originalData, setOriginalData] = useState([]);
  const [formValues, setFormValues] = useState(() => {});
  const { setSelecArray } = useSelectStatus();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<LawyerStatus | 'all'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [lawyerServiceRelacion, setLawyerServiceRelacion] = useState<any>([]);
  const [isOpenSession, setisOpenSession] = useState(false);
  const [history, setHistory] = useState([]);
  const router = useRouter();
  dayjs.extend(utc);
  const formatResponse = (data: any) => {
    return {
      code: data.id,
      'lawyer name': `${data.firstName} ${data.lastName}`,
      email: data.email,
      role: data.role.name,
      'phone number': data.phone,
      'service type': data.service_type ? data.service_type : null,
      'leads pulled': `${data.totalLeads ? data.totalLeads : 0}/${
        data.max_leads
      }`,
      'active leads': `${data.activeLeads ? data.activeLeads : 0}`,
      'no leads lost': `${data.lost ? data.lost : 0}`,
      'last active': data.last_login,
      status:
        data.status === undefined
          ? null
          : data.status && data.is_active
          ? 'Assignable'
          : 'Unassignable',
    };
  };

  const fetchData = async () => {
    try {
      const response = await database.getData(
        `${process.env.NEXT_PUBLIC_URL}/lawyers` || ''
      );

      if (!response.success) {
        throw new Error('Network response was not ok');
      }
      const data = response.data;
      setWithOutFormat(data);
      getTotalLeads(data);
      const dataFormat = data.map(formatResponse);
      setOriginalData(dataFormat);
      setData(dataFormat);
      if (data.length > 0) {
        const firstItem = dataFormat[0];
        const titles: any = Object.keys(firstItem);
        setColumns(titles);
      }
    } catch (error: any) {
      setError(error.message);
    }
  };
  const getExtraData = async () => {
    const dataLawyer = await database.getLeadsAssigned();

    if (!dataLawyer.success) {
      return toast.error('Error to get leads assigned');
    }
    setDataLawyerLeads(dataLawyer.data);
    const dataServiceTypeLawyer = await database.getSelectTypeLawyer();
    if (!dataServiceTypeLawyer.success) {
      return toast.error('Error to get leads assigned');
    }
    setDataLawyerServices(dataServiceTypeLawyer.data);
  };

  const getTotalLeads = (data: any) => {
    data.map(async (res: any) => {
      if (!!res.lawyersServices && labelService) {
        // const filterItemsServices = dataLawyerServices.filter(
        //   (item: any) => item['lawyer_id'] === parseInt(res.id)
        // );

        const filtertypes = res.lawyersServices.map((item: any) => {
          const matchingLabel = labelService.find(
            (label: any) => label.value === item.service_type_id
          );
          return matchingLabel
            ? { ...matchingLabel, max_leads: item.max_leads }
            : null;
        });
        res.service_type = filtertypes;
        res.max_leads = filtertypes
          ? filtertypes.reduce(
              (acc: number, curr: any) => acc + curr.max_leads,
              0
            )
          : 0;
      }

      if (
        !!dataLeads &&
        dataLeads.length > 0 &&
        Array.isArray(dataLawyerLeads)
      ) {
        const filterItems = dataLawyerLeads.filter(
          (item: any) => item['lawyer_id'] === parseInt(res.id)
        );
        const filterLeads = dataLeads.filter((item: any) =>
          filterItems
            .map((filterItem: any) => filterItem.lead)
            .includes(item['lead id'])
        );

        res.totalLeads = filterLeads.length;
        res.activeLeads = filterLeads.filter(
          (item: any) =>
            item.status === 'ASSIGNED' ||
            item.status === 'IN PROGRESS' ||
            item.status === 'CLOSED' ||
            item.status === 'PROBLEMATIC'
        ).length;
        res.lost = filterLeads.filter(
          (item: any) => item.status === 'LOST'
        ).length;
        res.status =
          parseInt(res.max_leads) - parseInt(filterLeads.length) > 0
            ? true
            : false;
        setDataProject(res);
        dataProject;
      }
    });
  };
  const statusColors = {
    Assignable: '#00B69B',
    Unassignable: '#FF4240',
  };
  const formaterSelect = (data: { name: string; id: string }[]) =>
    data.map((item) => ({
      name: item.name,
      value: item.id,
    }));
  const selectLabel = (data: { name: string; id: string }[]) =>
    data.map((item) => ({
      label: item.name,
      value: item.id,
    }));
  const handleChangenewLawyer = (selected: any) => {
    const removedOptions = selectedOptionsService.filter(
      (option) => !selected.includes(option)
    );
    if (removedOptions.length > 0) {
      const valueRemoves = removedOptions[0].value;
      const { [valueRemoves]: _, ...updatedOptionsService } = additionalValues;
      setAdditionalValues(updatedOptionsService);
    }
    setSelectedOptionsService(selected);
    //getExtraData();
  };
  const handleChangeService = async (selected: any) => {
    const removedOptions = selectedOptionsService.filter(
      (option) => !selected.includes(option)
    );
    const addedOptions = selected.filter(
      (option: any) => !selectedOptionsService.includes(option)
    );

    if (addedOptions.length > 0) {
      const updateData = {
        lawyer_id: dataIndex.id,
        service_type_id: addedOptions[0].value,
      };
      const updatingData = await database.postData(
        `${process.env.NEXT_PUBLIC_URL}/lawyers-services` || '',
        updateData
      );

      if (updatingData.success) {
        toast.success('Area of law add correctly');
        setLawyerServiceRelacion((prevValues: any) => [
          ...prevValues,
          {
            id: updatingData.data.id,
            service_type_id: updatingData.data.service_type_id,
          },
        ]);
      }
    }
    if (removedOptions.length > 0) {
      const matchingService = dataLawyerServices.find(
        (service: any) =>
          service.lawyer_id === dataIndex.id &&
          service.service_type_id === removedOptions[0].value
      );

      const deletingData = await database.deleteData(
        `${process.env.NEXT_PUBLIC_URL}/lawyers-services/${matchingService.id}`
      );

      if (deletingData.success) {
        toast.success('Area of law remove correctly');
      }
    }
    setSelectedOptionsService(selected);
    fetchData();
    getExtraData();
  };
  const handleEdit = (index: number) => {
    setIsOpen(true);
    setFile(null);
    setImagePreview(null);
    setDataIndex(withOutFormat[index]);

    const filterItems = Array.isArray(dataLawyerLeads)
      ? dataLawyerLeads.filter(
          (item: any) => item.lawyer_id === parseInt(withOutFormat[index].id)
        )
      : [];

    if (!!withOutFormat[index].lawyersServices && labelService) {
      const filtertypes = withOutFormat[index].lawyersServices.map(
        (item: any) => {
          const matchingLabel = labelService.find(
            (label: any) => label.value === item.service_type_id
          );
          return matchingLabel
            ? { ...matchingLabel, max_leads: item.max_leads }
            : null;
        }
      );
      setLawyerServiceRelacion(withOutFormat[index].lawyersServices);
      setSelectedOptionsService(filtertypes);
    } else {
      setLawyerServiceRelacion([]);
      setSelectedOptionsService([]);
    }

    if (!!dataLeads && dataLeads.length > 0) {
      const filterLeads = dataLeads.filter((item: any) =>
        filterItems
          .map((filterItem: any) => filterItem.lead)
          .includes(item['lead id'])
      );
      const totalMax = parseInt(withOutFormat[index].max_leads) || 0;
      const total = filterLeads.length;
      const available = Math.max(totalMax - total, 0);
      const active = filterLeads.filter(
        (item: any) =>
          item.status === 'ASSIGNED' ||
          item.status === 'PROBLEMATIC' ||
          item.status === 'IN PROGRESS' ||
          item.status === 'CLOSED'
      ).length;
      const lost = filterLeads.filter(
        (item: any) => item.status === 'LOST'
      ).length;
      const missed = filterLeads.filter(
        (item: any) => item.status === 'EXPIRED' || item.status === 'DISABLED'
      ).length;

      setLawyerStats({ total, available, active, lost, missed });
      setAssignable({
        isAssignable: available > 0,
        toBeAssigned: available,
      });
    } else {
      setLawyerStats({ total: 0, available: 0, active: 0, lost: 0, missed: 0 });
      setAssignable({ isAssignable: true, toBeAssigned: 0 });
    }
  };

  const handleDelete = async (index: number) => {
    const reviewLeads = withOutFormat[index].totalLeads;
    if (reviewLeads > 0) {
      return toast.error(
        "You can't delete this lawyer because they have leads assigned."
      );
    }
    setIsOpenDelete(true);
    const dataId = await database.getLawyer(withOutFormat[index].id);

    if (!dataId.success) {
      return toast.error('Error to get lawyer');
    }
    setDataIndex(dataId.data.data);
  };
  const DeleteLawyer = async () => {
    const dataDelete = await database.DeleteLawyer(dataIndex.id);
    if (!dataDelete.success) {
      return toast.error('Error to delete lawyer');
    }
    toast.success('Success to delete');
    setIsOpenDelete(false);
    fetchData();
  };
  const ConfirmMultipleDelete = async () => {
    if (selectedIds.size <= 0) {
      setSelectedIds(new Set());
      return;
    }
    const selectRow: any[] = (originalData as any[]).filter((item: any) =>
      selectedIds.has(Number(item.code))
    );
    const promises = selectRow.map(async (item: any) => {
      const leadId = item['code'];
      const dataDelete = await database.DeleteLawyer(leadId);
      if (!dataDelete.success) {
        return toast.error(`Error to delete lawyer ${item['lawyer name']}`);
      }
      toast.success('Success to delete');
      fetchData();
    });
    await Promise.all(promises);
    setSelectedIds(new Set());
  };
  const postImage = async () => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'amuthn3c');
    try {
      const data = await axios.post(
        'https://api.cloudinary.com/v1_1/despbwppb/image/upload/',
        formData
      );

      return {
        success: true,
        status: 200,
        data: data.data,
        messages: 'success',
      };
      //;
    } catch (error: any) {
      return {
        success: false,
        status: 400,
        data: [],
        messages: error.message,
      };
    }
  };
  const uploadCloudinary = async (
    selectedFile: File
  ): Promise<{ success: boolean; url: string }> => {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('upload_preset', 'amuthn3c');
    try {
      const res = await axios.post(
        'https://api.cloudinary.com/v1_1/despbwppb/image/upload/',
        formData
      );
      return { success: true, url: res.data?.secure_url ?? '' };
    } catch {
      return { success: false, url: '' };
    }
  };

  const handleCreateLawyer = async (
    payload: any /* LawyerFormPayload */
  ): Promise<void> => {
    setLoadingModal(true);
    let imageUrl = '';
    if (payload.imageFile) {
      const up = await uploadCloudinary(payload.imageFile);
      if (!up.success) {
        toast.error('Error uploading picture');
        setLoadingModal(false);
        return;
      }
      imageUrl = up.url;
    }
    const data = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      role_id: 2,
      password: payload.password ?? '',
      law_firm: payload.name_of_law_firm,
      notes: payload.notes,
      is_active: true,
      profile_image_url: imageUrl,
    };
    const creating = await database.CreateLawyer(data);
    if (!creating.success) {
      toast.error('Email exists or error to create lawyer');
      setLoadingModal(false);
      return;
    }
    if (payload.specialtyId) {
      await database.insertData(
        `${process.env.NEXT_PUBLIC_URL}/lawyers-services`,
        {
          lawyer_id: creating.data?.data?.id,
          service_type_id: payload.specialtyId,
          max_leads: payload.max_leads,
        }
      );
    }
    toast.success('Lawyer created successfully');
    setFile(null);
    setAdditionalValues({});
    setFormValues(() => {});
    fetchData();
    getExtraData();
    setIsOpenNew(false);
    setLoadingModal(false);
  };

  const handleUpdateLawyer = async (
    payload: any /* LawyerFormPayload */
  ): Promise<void> => {
    if (!dataIndex) return;
    setLoadingModal(true);
    let imageUrl: string | null | undefined = dataIndex.profile_image_url;
    if (payload.imageFile) {
      const up = await uploadCloudinary(payload.imageFile);
      if (!up.success) {
        toast.error('Error uploading picture');
        setLoadingModal(false);
        return;
      }
      imageUrl = up.url;
    }
    const data = {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      role_id: dataIndex.role?.id ?? 2,
      is_active: dataIndex.is_active,
      law_firm: payload.name_of_law_firm,
      notes: payload.notes,
      updated_at: new Date(),
      profile_image_url: imageUrl,
    };
    const updateData = await database.UpdateLawyer(data as any, dataIndex.id);
    if (updateData.code === 401) {
      toast.error(updateData.messages);
      setLoadingModal(false);
      return;
    }
    // ── Specialty / max_leads sync (single specialty model) ──
    const services: any[] = Array.isArray(lawyerServiceRelacion)
      ? lawyerServiceRelacion
      : [];
    const first = services[0];
    if (payload.specialtyId !== null && payload.specialtyId !== undefined) {
      const targetId = Number(payload.specialtyId);
      const currentId = first ? Number(first.service_type_id) : null;
      if (!first) {
        await database.postData(
          `${process.env.NEXT_PUBLIC_URL}/lawyers-services`,
          {
            lawyer_id: dataIndex.id,
            service_type_id: targetId,
            max_leads: payload.max_leads,
          }
        );
      } else if (currentId !== targetId) {
        await database.deleteData(
          `${process.env.NEXT_PUBLIC_URL}/lawyers-services/${first.id}`
        );
        await database.postData(
          `${process.env.NEXT_PUBLIC_URL}/lawyers-services`,
          {
            lawyer_id: dataIndex.id,
            service_type_id: targetId,
            max_leads: payload.max_leads,
          }
        );
      } else if (Number(first.max_leads) !== Number(payload.max_leads)) {
        await database.patchData(
          `${process.env.NEXT_PUBLIC_URL}/lawyers-services/${first.id}`,
          { max_leads: payload.max_leads }
        );
      }
    }
    fetchData();
    getExtraData();
    toast.success('Lawyer updated successfully');
    setIsOpen(false);
    setLoadingModal(false);
  };
  const getServiceType = async () => {
    const resType = await database.getData(
      `${process.env.NEXT_PUBLIC_URL}/service_types` || ''
    );
    if (!resType.success) {
      return toast.error('Error to get service type');
    }
    setDataServiceType(resType.data);

    setLabelService(selectLabel(resType.data));
    //modalLawyerInput[2].values = selectLabel(resType.data);
    //modalNewLawyerInput[2].values = selectLabel(resType.data);
  };
  const getRole = async () => {
    const roles = await database.getData(
      `${process.env.NEXT_PUBLIC_URL}/roles` || ''
    );
    if (!roles.success) {
      return toast.error('Error to get role');
    }
    // Roles fetched but not currently surfaced in the new modal UI.
    // Kept around in case the modal needs to expose role selection later.
  };
  const getLastLogin = async (id: any) => {
    const login = await database.fetchData(
      `${process.env.NEXT_PUBLIC_URL_LAST_SESSION}/${id.code}`
    );
    setHistory(login.data);

    if (!login.success) {
      return toast.error('Error to get last login');
    }
  };

  const updateImage = (e: any) => {
    e.preventDefault();
    const input = e.target;

    if (input.files && input.files[0]) {
      const maxFileSize = 10485760;
      if (input.files[0].size > maxFileSize) {
        toast.error('Error to update image size');
        return null;
      }
      setFile(input.files[0]);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(input.files[0]);
      input.value = '';
    }
  };
  const handleUpdatePassword = async ({
    password,
  }: {
    password: string;
  }): Promise<void> => {
    if (!dataIndex) return;
    setLoadingModal(true);
    const res = await api.lawyers.updatePassword(dataIndex.id, {
      password,
      comment: 'Password reset via admin panel',
    });
    if (!res.success) {
      toast.error(res.message || 'Could not update password');
      setLoadingModal(false);
      return;
    }
    fetchData();
    toast.success("Lawyer's password updated successfully");
    setIsopenPassword(false);
    setLoadingModal(false);
  };

  const handleStatusToggleConfirm = async (): Promise<void> => {
    if (!statusToggleTarget) return;
    const trimmed = statusToggleComment.trim();
    if (!trimmed) {
      toast.error('Reason is required');
      return;
    }
    setStatusToggleLoading(true);
    const res = await api.lawyers.updateStatus(statusToggleTarget.id, {
      is_active: statusToggleTarget.nextActive,
      comment: trimmed,
    });
    setStatusToggleLoading(false);
    if (!res.success) {
      toast.error(res.message || 'Could not update lawyer status');
      return;
    }
    toast.success(
      statusToggleTarget.nextActive ? 'Lawyer activated' : 'Lawyer deactivated'
    );
    setStatusToggleTarget(null);
    setStatusToggleComment('');
    fetchData();
  };
  const handleRoute = async (index: number) => {
    const dataId = await database.getLawyer(withOutFormat[index].id);
    setSelecArray([]);
    router.push(`lawyer-management/${dataId.data.data.id}`);
  };
  const newLawyer = () => {
    setIsOpenNew(true);
    setImagePreview(null);
  };
  const handleFormNewLawyerPersist = (e: any) => {
    const { name, value } = e.target;
    setFormValues((prevValues: any) => ({
      ...prevValues,
      [name]: value,
    }));
  };

  const handleClickCard = (indexclick: any) => {
    const setData = [
      { value: '', index: 0 },
      { value: 'ASSIGNED', index: 2 },
      { value: 'PROBLEMATIC', index: 2 },
      { value: 'IN PROGRESS', index: 2 },
      { value: 'LOST', index: 3 },
      { value: 'EXPIRED', index: 4 },
      { value: 'DISABLE', index: 4 },
    ];

    const valuesCards = setData.filter(
      (item: any) => item.index === indexclick
    );

    setSelecArray(valuesCards.map((res: any) => res.value));
    router.push(`/lawyer-management/${dataIndex.id}`);
  };
  const handleAdditionalValueChange = (
    selectedOption: any,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setAdditionalValues((prevValues: any) => ({
      ...prevValues,
      [selectedOption.value]: event.target.value,
    }));
  };
  const handleAdditionalValueUpdate = async (
    selectedOption: any,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const dataSelectSevice: any = lawyerServiceRelacion.filter(
      (item: any) => item.service_type_id === selectedOption.value
    )[0];

    const updatingData = await database.patchData(
      `${process.env.NEXT_PUBLIC_URL}/lawyers-services/${dataSelectSevice.id}`,
      { max_leads: event.target.value }
    );
    if (!updatingData.success) {
      toast.error('Error updating value of service');
    }
    fetchData();
  };
  const handleLastsession = (index: any) => {
    getLastLogin(index);
    setisOpenSession(true);
  };
  const removeLawyer = (title: string) => {
    return title.replace('Lawyer', '').trim();
  };

  // ── helpers to bridge legacy index-based handlers with the new ID-based table ──
  const findIndexById = (id: number) =>
    (withOutFormat as any[]).findIndex((l: any) => Number(l.id) === id);

  const handleEditById = (id: number) => {
    const idx = findIndexById(id);
    if (idx >= 0) handleEdit(idx);
  };

  const handleDeleteById = (id: number) => {
    const idx = findIndexById(id);
    if (idx >= 0) handleDelete(idx);
  };

  const handleRouteById = (id: number) => {
    const idx = findIndexById(id);
    if (idx >= 0) handleRoute(idx);
  };

  // ── derived row type + status mapping ──
  type LawyerRow = {
    id: number;
    code: string;
    name: string;
    email: string;
    phone: string;
    specialty: string;
    activeLeads: number;
    maxLeads: number;
    pulled: number;
    lost: number;
    isActive: boolean;
    lastLoginRaw: string | null;
    status: LawyerStatus;
  };

  const initialsOf = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '·';

  const formatCode = (id: number | string) =>
    String(id ?? '').padStart(5, '0');

  const lawyerRows = useMemo<LawyerRow[]>(() => {
    if (!Array.isArray(withOutFormat) || withOutFormat.length === 0) return [];
    return (withOutFormat as any[]).map((raw: any) => {
      const id = Number(raw.id);
      const isActive = raw.is_active === true;
      const activeLeads = Number(raw.activeLeads ?? 0);
      const maxLeads = Number(raw.max_leads ?? 0);
      const pulled = Number(raw.totalLeads ?? 0);
      const lost = Number(raw.lost ?? 0);
      const lastLoginRaw = raw.last_login ?? null;
      let status: LawyerStatus;
      if (!isActive && !lastLoginRaw && pulled === 0) status = 'pending';
      else if (!isActive) status = 'unassignable';
      else if (maxLeads <= 0 || activeLeads >= maxLeads) status = 'capacity';
      else status = 'assignable';

      const specialtyArr: any[] = Array.isArray(raw.service_type)
        ? raw.service_type
        : [];
      const specialty =
        specialtyArr.length === 0
          ? '—'
          : specialtyArr.length === 1
          ? removeLawyer(String(specialtyArr[0]?.label ?? specialtyArr[0]?.name ?? '—'))
          : `${removeLawyer(String(specialtyArr[0]?.label ?? specialtyArr[0]?.name ?? '—'))} +${
              specialtyArr.length - 1
            }`;

      return {
        id,
        code: formatCode(id),
        name:
          [raw.firstName, raw.lastName].filter(Boolean).join(' ').trim() ||
          raw.name ||
          'Unknown',
        email: raw.email ?? '—',
        phone: raw.phone ?? '—',
        specialty,
        activeLeads,
        maxLeads,
        pulled,
        lost,
        isActive,
        lastLoginRaw,
        status,
      };
    });
  }, [withOutFormat]);

  // ── KPIs derived from the full lawyer list ──
  // Preferimos `statsServer` (autoritativo /lawyers/stats) cuando está
  // disponible; los KPIs derivados se mantienen client-side porque
  // miden capacidad/carga, no el conteo plano de cuentas.
  const kpis = useMemo(() => {
    const localTotal = lawyerRows.length;
    const total = statsServer?.total ?? localTotal;
    const assignable = lawyerRows.filter((r) => r.status === 'assignable').length;
    const capacity = lawyerRows.filter((r) => r.status === 'capacity').length;
    const pending = lawyerRows.filter((r) => r.status === 'pending').length;
    const unassignable =
      statsServer?.inactive ??
      lawyerRows.filter((r) => r.status === 'unassignable').length;
    const specialtyCount =
      statsServer?.by_service?.length ??
      new Set(
        lawyerRows
          .map((r) => r.specialty)
          .filter((s) => s && s !== '—')
          .map((s) => s.split(' +')[0])
      ).size;
    return { total, assignable, capacity, pending, unassignable, specialtyCount };
  }, [lawyerRows, statsServer]);

  // ── filtered & search ──
  const filteredRows = useMemo<LawyerRow[]>(() => {
    let list = lawyerRows;
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }
    const q = searchText.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.phone.toLowerCase().includes(q) ||
          r.specialty.toLowerCase().includes(q) ||
          r.code.includes(q)
      );
    }
    return list;
  }, [lawyerRows, statusFilter, searchText]);

  const clearSelection = () => setSelectedIds(new Set());

  // ── Specialty options for the modal selects ──
  const specialtyOptions = useMemo<{ value: number; label: string }[]>(() => {
    if (!Array.isArray(labelService)) return [];
    return labelService.map((s: any) => ({
      value: Number(s.value),
      label: removeLawyer(String(s.label ?? s.name ?? '')),
    }));
  }, [labelService]);

  // ── Edit modal initial data (derived from dataIndex + lawyerStats + assignable) ──
  const editInitial = useMemo<LawyerFormInitialData | null>(() => {
    if (!dataIndex) return null;
    const services: any[] = Array.isArray(lawyerServiceRelacion)
      ? lawyerServiceRelacion
      : [];
    const first = services[0];
    let derivedStatus: LawyerStatusKey = 'assignable';
    if (!dataIndex.is_active) derivedStatus = 'unassignable';
    else if (assignable && !assignable.isAssignable) derivedStatus = 'capacity';
    let hint: string | undefined;
    if (assignable) {
      hint = assignable.isAssignable
        ? `${assignable.toBeAssigned} ${
            assignable.toBeAssigned === 1 ? 'lead' : 'leads'
          } available to be assigned`
        : 'This lawyer is at the limit of assigned leads';
    }
    const since = dataIndex.created_at
      ? `Since ${dayjs
          .utc(dataIndex.created_at)
          .local()
          .format('MMM D')} · ${dataIndex.is_active ? 'Active' : 'Inactive'}`
      : undefined;
    return {
      id: dataIndex.id,
      code: String(dataIndex.id ?? '').padStart(5, '0'),
      firstName: dataIndex.firstName ?? '',
      lastName: dataIndex.lastName ?? '',
      email: dataIndex.email ?? '',
      phone: dataIndex.phone ?? '',
      name_of_law_firm: dataIndex.law_firm ?? '',
      notes: dataIndex.notes ?? '',
      profile_image_url: dataIndex.profile_image_url ?? null,
      specialtyId: first ? Number(first.service_type_id) : null,
      extraSpecialtiesCount: Math.max(0, services.length - 1),
      max_leads: first ? Number(first.max_leads) : 0,
      stats: lawyerStats,
      status: derivedStatus,
      statusHint: hint,
      sinceLabel: since,
    };
  }, [dataIndex, lawyerServiceRelacion, lawyerStats, assignable]);

  const fetchLawyerStats = async () => {
    const res = await api.lawyers.stats();
    if (res.success && res.data) setStatsServer(res.data);
  };

  useEffect(() => {
    getServiceType();
    getRole();
    fetchLawyerStats();
  }, []);
  useEffect(() => {
    fetchData();
    getExtraData();
  }, [dataLeads, dataProject === null, dataLawyerLeads === null]);

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-4'>
      <LawyerFormModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        mode='edit'
        initial={editInitial}
        specialties={specialtyOptions}
        onSubmit={handleUpdateLawyer}
        onOpenPasswordUpdate={() => setIsopenPassword(true)}
        loading={loadingModal}
      />
      <LawyerFormModal
        open={isOpenNew}
        onClose={() => setIsOpenNew(false)}
        mode='new'
        initial={null}
        specialties={specialtyOptions}
        onSubmit={handleCreateLawyer}
        loading={loadingModal}
      />
      <Modal
        title='Delete'
        isOpen={isOpenDelete}
        setIsOpen={setIsOpenDelete}
        className='max-w-sm'
      >
        <div className='flex flex-col gap-4'>
          <div className='flex justify-center text-center'>
            <p>
              Are you sure you want to delete the user{' '}
              <span className='font-medium'>{dataIndex?.firstName}?</span>
            </p>
          </div>

          <div className='flex justify-around'>
            <Button
              name='Cancel'
              type='button'
              onClick={() => setIsOpenDelete(false)}
            />
            <Button
              name='Delete'
              type='button'
              color='bg-red-500'
              onClick={DeleteLawyer}
            />
          </div>
        </div>
      </Modal>
      <LawyerPasswordModal
        open={isOpenPassword}
        onClose={() => setIsopenPassword(false)}
        lawyerCode={
          dataIndex?.id
            ? String(dataIndex.id).padStart(5, '0')
            : undefined
        }
        onSubmit={handleUpdatePassword}
        loading={loadingModal}
      />
      <ConfirmationDialog
        open={Boolean(statusToggleTarget)}
        onClose={() => {
          if (statusToggleLoading) return;
          setStatusToggleTarget(null);
          setStatusToggleComment('');
        }}
        variant={statusToggleTarget?.nextActive ? 'default' : 'danger'}
        title={
          statusToggleTarget?.nextActive
            ? 'Activate lawyer'
            : 'Deactivate lawyer'
        }
        subtitle={statusToggleTarget?.name || undefined}
        confirmLabel={
          statusToggleTarget?.nextActive ? 'Activate' : 'Deactivate'
        }
        onConfirm={handleStatusToggleConfirm}
        loading={statusToggleLoading}
        confirmDisabled={statusToggleComment.trim().length === 0}
      >
        <div className='space-y-2'>
          <label
            htmlFor='status-toggle-reason'
            className='block text-xs font-medium text-slate-600'
          >
            Reason (required)
          </label>
          <textarea
            id='status-toggle-reason'
            value={statusToggleComment}
            onChange={(e) => setStatusToggleComment(e.target.value)}
            rows={3}
            placeholder={
              statusToggleTarget?.nextActive
                ? 'Why is this lawyer being reactivated?'
                : 'Why is this lawyer being deactivated?'
            }
            className='w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none'
            disabled={statusToggleLoading}
          />
        </div>
      </ConfirmationDialog>
      <Modal
        title='Session History'
        setIsOpen={setisOpenSession}
        isOpen={isOpenSession}
        className='max-w-sm'
      >
        <div className='w-full max-w-md mx-auto p-4 bg-white rounded-lg shadow-md'>
          <ul className='divide-y divide-gray-200'>
            {history.map((entry: any, index: number) => (
              <li
                key={index}
                className='py-2 flex justify-between items-center'
              >
                <span>{dayjs(entry.login_date).format('DD/MM/YYYY')}</span>
                <span className='text-gray-500'>
                  {dayjs(entry.login_date).format('HH:mm')}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Modal>
      {/* ── Page header ── */}
      <PageHead
        title='Lawyer Management'
        count={`${kpis.total} ${kpis.total === 1 ? 'lawyer' : 'lawyers'}`}
        subtitle="Manage your firm's lawyers, monitor capacity, and track activity across specializations."
        action={
          <div className='flex items-center gap-2'>
            <button
              type='button'
              className='inline-flex h-[38px] items-center gap-1.5 rounded-[9px] border border-slate-200 bg-white px-3.5 text-xs font-bold tracking-[-0.005em] text-slate-700 transition-colors hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300'
              onClick={() => toast('Export coming soon', { icon: 'ℹ️' })}
            >
              <MdFileDownload size={14} />
              Export
            </button>
            <button
              type='button'
              onClick={newLawyer}
              className='inline-flex h-[38px] items-center gap-1.5 rounded-[9px] border border-slate-900 bg-slate-900 px-3.5 text-xs font-bold tracking-[-0.005em] text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700/40'
            >
              <MdAdd size={14} />
              New Lawyer
            </button>
          </div>
        }
      />

      {/* ── KPI strip ── */}
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
        <StatCard
          label='Total lawyers'
          value={kpis.total}
          tone='slate'
          sub={`across ${kpis.specialtyCount} ${
            kpis.specialtyCount === 1 ? 'specialization' : 'specializations'
          }`}
          icon={
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='h-4 w-4'
            >
              <path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' />
              <circle cx='9' cy='7' r='4' />
              <path d='M23 21v-2a4 4 0 0 0-3-3.87' />
              <path d='M16 3.13a4 4 0 0 1 0 7.75' />
            </svg>
          }
        />
        <StatCard
          label='Assignable'
          value={kpis.assignable}
          tone='emerald'
          sub='with available capacity'
          icon={
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.4'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='h-4 w-4'
            >
              <polyline points='20 6 9 17 4 12' />
            </svg>
          }
        />
        <StatCard
          label='At capacity'
          value={kpis.capacity}
          tone='slate'
          sub='need monitoring'
          icon={
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='h-4 w-4'
            >
              <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
              <line x1='12' y1='9' x2='12' y2='13' />
              <line x1='12' y1='17' x2='12.01' y2='17' />
            </svg>
          }
        />
        <StatCard
          label='Pending onboarding'
          value={kpis.pending}
          tone='coral'
          sub={
            kpis.unassignable > 0
              ? `unassignable: ${kpis.unassignable}`
              : 'all onboarded'
          }
          icon={
            <svg
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2.2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='h-4 w-4'
            >
              <path d='M12 20h9' />
              <path d='M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' />
            </svg>
          }
        />
      </div>

      {/* ── Toolbar ── */}
      <div className='flex flex-wrap items-center gap-2.5'>
        <SearchField
          placeholder='Search by name, email, code or specialty...'
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className='w-[300px]'
        />
        <span aria-hidden className='hidden h-5 w-px bg-slate-200 sm:block' />
        <FilterButton
          label='All'
          count={kpis.total}
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
        />
        <FilterButton
          label='Assignable'
          count={kpis.assignable}
          active={statusFilter === 'assignable'}
          onClick={() => setStatusFilter('assignable')}
        />
        <FilterButton
          label='At capacity'
          count={kpis.capacity}
          active={statusFilter === 'capacity'}
          onClick={() => setStatusFilter('capacity')}
        />
        <FilterButton
          label='Unassignable'
          count={kpis.unassignable}
          active={statusFilter === 'unassignable'}
          onClick={() => setStatusFilter('unassignable')}
        />
        <FilterButton
          label='Pending'
          count={kpis.pending}
          active={statusFilter === 'pending'}
          onClick={() => setStatusFilter('pending')}
        />
      </div>

      {/* ── Bulk action strip (visible when rows selected) ── */}
      {selectedIds.size > 0 ? (
        <div className='flex items-center justify-between gap-3 rounded-[10px] border border-slate-200 bg-slate-50 px-4 py-2.5'>
          <span className='text-xs font-semibold text-slate-700'>
            <span className='font-extrabold tabular-nums text-slate-900'>
              {selectedIds.size}
            </span>{' '}
            {selectedIds.size === 1 ? 'lawyer' : 'lawyers'} selected
          </span>
          <div className='flex items-center gap-2'>
            <button
              type='button'
              onClick={clearSelection}
              className='inline-flex h-[34px] items-center rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-100'
            >
              Clear
            </button>
            <button
              type='button'
              onClick={() => ConfirmMultipleDelete()}
              className='inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-customRed bg-customRed px-3 text-[11px] font-semibold text-white transition-colors hover:bg-red-600'
            >
              <MdDeleteOutline size={13} />
              Delete selected
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Table ── */}
      {error ? (
        <div className='flex items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-5 py-10 text-center'>
          <div className='flex flex-col gap-1'>
            <span className='text-[13px] font-semibold text-rose-700'>
              Failed to load lawyers
            </span>
            <span className='text-[11px] text-rose-500'>
              Try refreshing the page or check your connection
            </span>
          </div>
        </div>
      ) : (
        <DataTable<LawyerRow>
          data={filteredRows}
          rowKey={(row) => row.id}
          onRowClick={(row) => handleRouteById(row.id)}
          pagination={{ enabled: true, initialPageSize: 10 }}
          totalLabel='lawyers'
          initialSort={{ key: 'name', direction: 'asc' }}
          selection={{
            getRowKey: (row) => row.id,
            selectedKeys: selectedIds,
            onChange: (next) => setSelectedIds(next as Set<number>),
            ariaLabel: 'Select all lawyers on this page',
          }}
          emptyState={
            <div className='flex flex-col items-center gap-1'>
              <span className='text-[13px] font-semibold text-slate-700'>
                No lawyers match your filters
              </span>
              <span className='text-[11px] text-slate-400'>
                Adjust the search or status filters above
              </span>
            </div>
          }
          columns={[
            {
              key: 'name',
              label: 'Lawyer',
              width: 'minmax(240px, 280px)',
              sortable: true,
              accessor: (r) => r.name,
              render: (r) => (
                <div className='flex min-w-0 items-center gap-3'>
                  <Avatar
                    size='md'
                    shape='rounded'
                    tone={toneFromString(r.name)}
                    initials={initialsOf(r.name)}
                  />
                  <div className='flex min-w-0 flex-col gap-0.5 leading-[1.25]'>
                    <div className='flex min-w-0 items-center gap-2'>
                      <span className='truncate text-[13px] font-bold tracking-[-0.005em] text-slate-900'>
                        {r.name}
                      </span>
                      <span className='flex-shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.04em] tabular-nums text-slate-400'>
                        {r.code}
                      </span>
                    </div>
                    <span className='truncate text-[11px] font-medium text-slate-400'>
                      {r.email}
                    </span>
                  </div>
                </div>
              ),
            },
            {
              key: 'specialty',
              label: 'Specialty',
              width: '100px',
              render: (r) => (
                <span className='text-xs font-semibold tracking-[-0.005em] text-slate-700'>
                  {r.specialty}
                </span>
              ),
            },
            {
              key: 'capacity',
              label: 'Active / Capacity',
              width: '142px',
              render: (r) => {
                const overrideState =
                  r.status === 'pending'
                    ? 'pending'
                    : r.status === 'unassignable'
                    ? 'paused'
                    : undefined;
                return (
                  <CapacityBar
                    current={r.activeLeads}
                    max={r.maxLeads}
                    state={overrideState}
                  />
                );
              },
            },
            {
              key: 'pulled',
              label: 'Pulled',
              width: '78px',
              sortable: true,
              accessor: (r) => r.pulled,
              render: (r) => (
                <span
                  className={cnIfMuted(
                    r.pulled === 0,
                    'text-sm font-bold tabular-nums tracking-[-0.005em] text-slate-900'
                  )}
                >
                  {r.pulled}
                </span>
              ),
            },
            {
              key: 'lost',
              label: 'Lost',
              width: '78px',
              sortable: true,
              accessor: (r) => r.lost,
              render: (r) => (
                <span
                  className={cnIfMuted(
                    r.lost === 0,
                    'text-sm font-bold tabular-nums tracking-[-0.005em] text-slate-900'
                  )}
                >
                  {r.lost}
                </span>
              ),
            },
            {
              key: 'lastActive',
              label: 'Last active',
              width: '112px',
              render: (r) => (
                <LiveDot
                  state={r.isActive ? 'active' : 'inactive'}
                  label={r.isActive ? 'Active' : 'Inactive'}
                />
              ),
            },
            {
              key: 'status',
              label: 'Status',
              width: '110px',
              sortable: true,
              accessor: (r) => r.status,
              render: (r) => <LawyerStatusPill status={r.status} />,
            },
            {
              key: 'actions',
              label: 'Actions',
              width: '116px',
              align: 'right',
              cellClassName: 'pr-0',
              render: (r) => (
                <div
                  className='flex items-center justify-end gap-1.5'
                  onClick={(e) => e.stopPropagation()}
                >
                  <IconActionButton
                    label='Edit lawyer'
                    icon={<MdEdit size={12} />}
                    tone='primary'
                    onClick={() => handleEditById(r.id)}
                  />
                  <IconActionButton
                    label={r.isActive ? 'Deactivate lawyer' : 'Activate lawyer'}
                    icon={<MdPowerSettingsNew size={12} />}
                    tone='warning'
                    onClick={() => {
                      setStatusToggleTarget({
                        id: r.id,
                        name: r.name,
                        nextActive: !r.isActive,
                      });
                      setStatusToggleComment('');
                    }}
                  />
                  <IconActionButton
                    label='Delete lawyer'
                    icon={<MdDeleteOutline size={12} />}
                    tone='danger'
                    onClick={() => handleDeleteById(r.id)}
                  />
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};

const cnIfMuted = (muted: boolean, base: string) =>
  muted ? `${base} text-slate-300` : base;

export default LawyerManagement;
