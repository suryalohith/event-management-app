
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Registration,
  Event,
  EventCategory,
  EventStatus,
  Participant
} from '../types';
import { INITIAL_EVENTS } from '../constants';

interface AdminViewProps {
  registrations: Registration[];
  totalRegistrationsCount: number;
  events: Event[];
  registrationsLive: boolean;
  registrationPage: number;
  hasNextRegistrationsPage: boolean;
  hasPreviousRegistrationsPage: boolean;
  registrationPageNumbers: number[];
  isLoadingNextRegistrationsPage: boolean;
  onNextRegistrationsPage: () => Promise<void> | void;
  onPreviousRegistrationsPage: () => Promise<void> | void;
  onGoToRegistrationsPage: (pageNumber: number) => Promise<void> | void;
  onUpdateEvent: (event: Event) => Promise<void> | void;
  onSetRegistrationsLive: (enabled: boolean) => Promise<void> | void;
  onDeleteRegistration: (id: string) => Promise<void> | void;
  onDeleteRegistrations: (
    ids: string[],
    options?: {
      onProgress?: (progress: BatchDeleteProgress) => void;
    }
  ) => Promise<{ deletedCount: number; errors: string[] }> | void;
  onUpdateRegistration: (reg: Registration) => Promise<void> | void;
  onRefreshData: () => Promise<void> | void;
  onGetFilteredRegistrationsCount?: (
    eventId: string,
    searchTerm: string
  ) => Promise<number> | number;
  onGetFilteredRegistrations?: (
    eventId: string,
    searchTerm: string
  ) => Promise<Registration[]> | Registration[];
  onLogout: () => Promise<void> | void;
}

type BatchDeleteProgress = {
  processedChunks: number;
  totalChunks: number;
  processedRegistrations: number;
  totalRegistrations: number;
  deletedCount: number;
};

const EVENT_STATUS_OPTIONS: Array<{ value: EventStatus; label: string }> = [
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'REGISTRATION_OPEN_SOON', label: 'Open Soon' }
];

const EVENT_CATEGORY_SECTIONS: Array<{
  value: EventCategory;
  label: string;
}> = [
  { value: EventCategory.TECH, label: 'Technical' },
  { value: EventCategory.NON_TECH, label: 'Non-Technical' },
  { value: EventCategory.SPORTS, label: 'Sports' }
];

const INSTAGRAM_SUBMISSION_EVENT_IDS = new Set(['nt_best_meme', 'nt_best_reel']);
const DRIVE_SUBMISSION_EVENT_IDS = new Set(['nt_photography', 'nt_poster']);
const IDEA_SUBMISSION_EVENT_IDS = new Set(['nt_department_ideas']);

type XlsxUtilsLike = {
  json_to_sheet: (data: Array<Record<string, string>>) => unknown;
  book_new: () => unknown;
  book_append_sheet: (
    workbook: unknown,
    worksheet: unknown,
    sheetName: string
  ) => void;
};

type XlsxLike = {
  utils: XlsxUtilsLike;
  writeFile: (workbook: unknown, fileName: string) => void;
};

declare global {
  interface Window {
    XLSX?: XlsxLike;
  }
}

const XLSX_CDN_URL =
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

let xlsxScriptPromise: Promise<XlsxLike> | null = null;

const loadXlsx = async (): Promise<XlsxLike> => {
  if (window.XLSX) {
    return window.XLSX;
  }

  if (xlsxScriptPromise) {
    return xlsxScriptPromise;
  }

  xlsxScriptPromise = new Promise<XlsxLike>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = XLSX_CDN_URL;
    script.async = true;
    script.onload = () => {
      if (window.XLSX) {
        resolve(window.XLSX);
        return;
      }

      reject(new Error('Failed to initialize export library.'));
    };
    script.onerror = () => {
      reject(new Error('Failed to load export library.'));
    };

    document.body.appendChild(script);
  });

  try {
    return await xlsxScriptPromise;
  } catch (error) {
    xlsxScriptPromise = null;
    throw error;
  }
};

const getEventStatusChipClassName = (status: EventStatus): string => {
  if (status === 'OPEN') {
    return 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300';
  }

  if (status === 'REGISTRATION_OPEN_SOON') {
    return 'border-amber-500/40 bg-amber-500/10 text-amber-300';
  }

  return 'border-zinc-700 bg-zinc-900/60 text-zinc-400';
};

const getEventStatusSelectClassName = (status: EventStatus): string => {
  if (status === 'OPEN') {
    return 'border-indigo-500/40 text-indigo-200 bg-indigo-500/10';
  }

  if (status === 'REGISTRATION_OPEN_SOON') {
    return 'border-amber-500/40 text-amber-200 bg-amber-500/10';
  }

  return 'border-zinc-700 text-zinc-300 bg-zinc-900/70';
};

const AdminView: React.FC<AdminViewProps> = ({
  registrations,
  totalRegistrationsCount,
  events,
  registrationsLive,
  registrationPage,
  hasNextRegistrationsPage,
  hasPreviousRegistrationsPage,
  registrationPageNumbers,
  isLoadingNextRegistrationsPage,
  onNextRegistrationsPage,
  onPreviousRegistrationsPage,
  onGoToRegistrationsPage,
  onUpdateEvent,
  onSetRegistrationsLive,
  onDeleteRegistration,
  onDeleteRegistrations,
  onUpdateRegistration,
  onRefreshData,
  onGetFilteredRegistrationsCount,
  onGetFilteredRegistrations,
  onLogout
}) => {
  const [tab, setTab] = useState<'REGS' | 'EVENTS'>('REGS');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('ALL');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReg, setEditingReg] = useState<Registration | null>(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isTogglingRegistrations, setIsTogglingRegistrations] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedRegIds, setSelectedRegIds] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [batchDeleteProgress, setBatchDeleteProgress] =
    useState<BatchDeleteProgress | null>(null);
  const [remoteFilteredResultsCount, setRemoteFilteredResultsCount] =
    useState<number | null>(null);
  const [remoteFilteredRegs, setRemoteFilteredRegs] =
    useState<Registration[] | null>(null);
  const [bulkEventStatus, setBulkEventStatus] = useState<EventStatus>('OPEN');
  const [isBulkUpdatingEvents, setIsBulkUpdatingEvents] = useState(false);
  const onUpdateEventRef = useRef(onUpdateEvent);
  const filteredCountCacheRef = useRef<Map<string, number>>(new Map());
  const filteredDataCacheRef = useRef<Map<string, Registration[]>>(new Map());

  useEffect(() => {
    onUpdateEventRef.current = onUpdateEvent;
  }, [onUpdateEvent]);

  // Stats
  const stats = useMemo(() => {
    const coveredEventIds = new Set(registrations.map(r => r.eventId));
    return {
      totalRegs: totalRegistrationsCount,
      eventsCovered: coveredEventIds.size,
      totalEvents: events.length
    };
  }, [registrations, totalRegistrationsCount, events]);

  // Filtering
  const getRegistrationSortValue = (reg: Registration): number => {
    if (typeof reg.createdAt === 'number') return reg.createdAt;
    const parsedDate = Date.parse(reg.timestamp);
    return Number.isNaN(parsedDate) ? 0 : parsedDate;
  };

  const filteredRegs = useMemo(() => {
    return registrations.filter(r => {
      const matchesEvent = selectedEventId === 'ALL' || r.eventId === selectedEventId;
      const matchesRoll = r.members.some(m => m.rollNumber.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTeam = (r.teamName || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchesEvent && (matchesRoll || matchesTeam);
    }).sort((a, b) => getRegistrationSortValue(b) - getRegistrationSortValue(a));
  }, [registrations, selectedEventId, searchTerm]);
  const hasActiveFilters =
    selectedEventId !== 'ALL' || searchTerm.trim().length > 0;

  useEffect(() => {
    filteredCountCacheRef.current.clear();
    filteredDataCacheRef.current.clear();
    setRemoteFilteredRegs(null);
  }, [totalRegistrationsCount]);

  useEffect(() => {
    if (!hasActiveFilters) {
      setRemoteFilteredRegs(null);
      return;
    }

    if (!onGetFilteredRegistrations) {
      setRemoteFilteredRegs(null);
      return;
    }

    const normalizedSearchTerm = searchTerm.trim();
    const normalizedSearchKey = normalizedSearchTerm.toLowerCase();
    const cacheKey = `${selectedEventId}::${normalizedSearchKey}`;
    const cachedRegs = filteredDataCacheRef.current.get(cacheKey);
    if (cachedRegs) {
      setRemoteFilteredRegs(cachedRegs);
      return;
    }

    setRemoteFilteredRegs(null);

    let isStale = false;
    const delayMs = normalizedSearchTerm.length > 0 ? 280 : 0;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const rows = await onGetFilteredRegistrations(
            selectedEventId,
            normalizedSearchTerm
          );
          if (isStale) {
            return;
          }

          filteredDataCacheRef.current.set(cacheKey, rows);
          setRemoteFilteredRegs(rows);
        } catch (error) {
          if (isStale) {
            return;
          }
          console.error('Failed to fetch filtered registrations:', error);
          setRemoteFilteredRegs(null);
        }
      })();
    }, delayMs);

    return () => {
      isStale = true;
      window.clearTimeout(timer);
    };
  }, [
    hasActiveFilters,
    onGetFilteredRegistrations,
    searchTerm,
    selectedEventId
  ]);

  useEffect(() => {
    const normalizedSearchTerm = searchTerm.trim();
    const normalizedSearchKey = normalizedSearchTerm.toLowerCase();
    const cacheKey = `${selectedEventId}::${normalizedSearchKey}`;

    if (selectedEventId === 'ALL' && normalizedSearchTerm.length === 0) {
      setRemoteFilteredResultsCount(totalRegistrationsCount);
      return;
    }

    if (!onGetFilteredRegistrationsCount) {
      setRemoteFilteredResultsCount(null);
      return;
    }

    const cachedCount = filteredCountCacheRef.current.get(cacheKey);
    if (cachedCount !== undefined) {
      setRemoteFilteredResultsCount(cachedCount);
      return;
    }

    setRemoteFilteredResultsCount(null);

    let isStale = false;
    const delayMs = normalizedSearchTerm.length > 0 ? 280 : 0;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const count = await onGetFilteredRegistrationsCount(
            selectedEventId,
            normalizedSearchTerm
          );

          if (isStale) {
            return;
          }

          filteredCountCacheRef.current.set(cacheKey, count);
          setRemoteFilteredResultsCount(count);
        } catch (error) {
          if (isStale) {
            return;
          }

          console.error(
            'Failed to fetch filtered registrations count:',
            error
          );
          setRemoteFilteredResultsCount(null);
        }
      })();
    }, delayMs);

    return () => {
      isStale = true;
      window.clearTimeout(timer);
    };
  }, [
    onGetFilteredRegistrationsCount,
    searchTerm,
    selectedEventId,
    totalRegistrationsCount
  ]);

  const visibleRegs = useMemo(
    () => remoteFilteredRegs ?? filteredRegs,
    [remoteFilteredRegs, filteredRegs]
  );

  const filteredResultsCount = useMemo(() => {
    if (!hasActiveFilters) {
      return totalRegistrationsCount;
    }

    if (remoteFilteredRegs) {
      return remoteFilteredRegs.length;
    }

    if (remoteFilteredResultsCount !== null) {
      return remoteFilteredResultsCount;
    }

    return visibleRegs.length;
  }, [
    hasActiveFilters,
    remoteFilteredResultsCount,
    remoteFilteredRegs,
    totalRegistrationsCount,
    visibleRegs.length
  ]);

  const showInstagramColumn = useMemo(() => {
    if (selectedEventId !== 'ALL') {
      return INSTAGRAM_SUBMISSION_EVENT_IDS.has(selectedEventId);
    }
    return visibleRegs.some((reg) => Boolean(reg.instagramLink));
  }, [selectedEventId, visibleRegs]);

  const showDriveColumn = useMemo(() => {
    if (selectedEventId !== 'ALL') {
      return DRIVE_SUBMISSION_EVENT_IDS.has(selectedEventId);
    }
    return visibleRegs.some((reg) => Boolean(reg.driveLink));
  }, [selectedEventId, visibleRegs]);

  const showIdeaColumn = useMemo(() => {
    if (selectedEventId !== 'ALL') {
      return IDEA_SUBMISSION_EVENT_IDS.has(selectedEventId);
    }
    return visibleRegs.some((reg) => Boolean(reg.ideaText));
  }, [selectedEventId, visibleRegs]);

  const allEventsForLinkCopy = useMemo(() => {
    const liveById = new Map<string, Event>(
      events.map((event): [string, Event] => [event.id, event])
    );
    const merged = INITIAL_EVENTS.map(
      (defaultEvent) => liveById.get(defaultEvent.id) ?? defaultEvent
    );
    const knownIds = new Set(merged.map((event) => event.id));
    const extraLiveEvents = events.filter((event) => !knownIds.has(event.id));
    return [...merged, ...extraLiveEvents];
  }, [events]);

  const instagramColumnLabel = useMemo(() => {
    if (selectedEventId === 'nt_best_meme') return 'Instagram Meme Link';
    if (selectedEventId === 'nt_best_reel') return 'Instagram Reel Link';
    return 'Instagram Link';
  }, [selectedEventId]);

  const driveColumnLabel = useMemo(() => {
    if (selectedEventId === 'nt_photography') return 'Photo Drive Link';
    if (selectedEventId === 'nt_poster') return 'Poster Drive Link';
    return 'Google Drive Link';
  }, [selectedEventId]);

  const tableColumnCount =
    7 +
    (showInstagramColumn ? 1 : 0) +
    (showDriveColumn ? 1 : 0) +
    (showIdeaColumn ? 1 : 0);
  const shouldShowPaginationControls =
    !hasActiveFilters && totalRegistrationsCount > 500;

  const selectedVisibleCount = useMemo(
    () => visibleRegs.filter((reg) => selectedRegIds.has(reg.id)).length,
    [selectedRegIds, visibleRegs]
  );

  const isAllVisibleSelected =
    visibleRegs.length > 0 && selectedVisibleCount === visibleRegs.length;

  const getEventRegistrationUrl = (eventId: string): string => {
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return `${baseUrl}?event=${encodeURIComponent(eventId)}`;
  };

  const copyTextToClipboard = async (value: string): Promise<void> => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(value);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.setAttribute('readonly', 'true');
    textArea.style.position = 'fixed';
    textArea.style.top = '-1000px';
    textArea.style.left = '-1000px';
    document.body.appendChild(textArea);
    textArea.select();

    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);

    if (!copied) {
      throw new Error('Clipboard copy failed.');
    }
  };

  const handleCopyEventLink = async (event: Event) => {
    const link = getEventRegistrationUrl(event.id);
    try {
      await copyTextToClipboard(link);
      alert(`Copied registration link for ${event.name}.`);
    } catch (error) {
      console.error('Failed to copy event link:', error);
      window.prompt('Copy this event registration link:', link);
    }
  };

  const handleCopyAllEventLinks = async () => {
    if (allEventsForLinkCopy.length === 0) {
      alert('No events available to copy links.');
      return;
    }

    const payload = allEventsForLinkCopy
      .map((event) => `${event.name}: ${getEventRegistrationUrl(event.id)}`)
      .join('\n');

    try {
      await copyTextToClipboard(payload);
      alert(
        `Copied registration links for ${allEventsForLinkCopy.length} events.`
      );
    } catch (error) {
      console.error('Failed to copy all event links:', error);
      window.prompt('Copy all event registration links:', payload);
    }
  };

  useEffect(() => {
    const visibleIds = new Set(visibleRegs.map((reg) => reg.id));

    setSelectedRegIds((previousSelected) => {
      let changed = false;
      const nextSelected = new Set<string>();

      previousSelected.forEach((id) => {
        if (visibleIds.has(id)) {
          nextSelected.add(id);
        } else {
          changed = true;
        }
      });

      return changed ? nextSelected : previousSelected;
    });
  }, [visibleRegs]);

  // Lazy-load XLSX only when export is requested to keep initial load light.
  const handleExport = async (data: Registration[], filename: string) => {
    setIsExporting(true);

    try {
      const XLSX = await loadXlsx();
      const exportRows = data.map((reg) => {
        const playerEntries = reg.members.map(
          (m) => `${m.name} (${m.rollNumber}, ${m.section}, ${m.year})`
        );
        const playersPerLine = 3;
        const playerLines: string[] = [];
        for (let index = 0; index < playerEntries.length; index += playersPerLine) {
          playerLines.push(playerEntries.slice(index, index + playersPerLine).join('; '));
        }

        const row: Record<string, string> = {
          'Event Name': reg.eventName,
          'Team Name': reg.teamName || 'N/A',
          Players: playerLines.join('\n'),
          'Contact Phone': reg.members[0]?.phone || 'N/A',
          'Alternate Phone': reg.alternatePhone || 'N/A'
        };

        if (showInstagramColumn) {
          row[instagramColumnLabel] = reg.instagramLink || 'N/A';
        }
        if (showDriveColumn) {
          row[driveColumnLabel] = reg.driveLink || 'N/A';
        }
        if (showIdeaColumn) {
          row['Idea Text'] = reg.ideaText || 'N/A';
        }

        row['Submitted At'] = reg.timestamp;
        row.Attended = '';
        return {
          row,
          playerLineCount: Math.max(1, playerLines.length)
        };
      });

      const rows = exportRows.map((item) => item.row);
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!rows'] = [
        { hpt: 22 },
        ...exportRows.map((item) => ({
          hpt: Math.max(22, item.playerLineCount * 16 + 8)
        }))
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Registrations");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    } catch (error) {
      console.error('Failed to export registrations:', error);
      alert('Failed to export registrations. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const detectYearFromRoll = (roll: string): string => {
    const prefix = roll.substring(0, 3);
    if (prefix === '322') return '4th Year';
    if (prefix === '323') return '3rd Year';
    if (prefix === '324') return '2nd Year';
    if (prefix === '325') return '1st Year';
    return 'INVALID';
  };

  // Edit Registration Form Logic
  const handleEditMember = (
    idx: number,
    field: keyof Participant,
    value: string
  ) => {
    if (!editingReg) return;
    const newMembers = [...editingReg.members];
    const updatedMember: Participant = { ...newMembers[idx] };

    if (field === 'rollNumber') {
      const cleanedRoll = value.replace(/\D/g, '').substring(0, 12);
      updatedMember.rollNumber = cleanedRoll;
      updatedMember.year = detectYearFromRoll(cleanedRoll);
    } else if (field === 'phone') {
      updatedMember.phone = value.replace(/\D/g, '').substring(0, 10);
    } else {
      updatedMember[field] = value as never;
    }

    newMembers[idx] = updatedMember;
    setEditingReg({ ...editingReg, members: newMembers });
  };

  const saveRegChanges = async () => {
    if (!editingReg) return;

    if (editingReg.members[0].phone.length !== 10) {
      return alert("Contact Phone must be 10 digits");
    }

    const normalizedMembers = editingReg.members.map((member) => {
      const cleanedRoll = member.rollNumber.replace(/\D/g, '').substring(0, 12);
      return {
        ...member,
        rollNumber: cleanedRoll,
        year: detectYearFromRoll(cleanedRoll),
        phone: member.phone.replace(/\D/g, '').substring(0, 10)
      };
    });

    for (let index = 0; index < normalizedMembers.length; index += 1) {
      const member = normalizedMembers[index];
      if (member.rollNumber.length !== 12 || member.year === 'INVALID') {
        alert(
          `Player ${index + 1} has invalid registration number. Use a valid 12-digit roll starting with 322, 323, 324, or 325.`
        );
        return;
      }
    }

    const seenRolls = new Set<string>();
    for (const member of normalizedMembers) {
      if (seenRolls.has(member.rollNumber)) {
        alert(`Duplicate registration number detected: ${member.rollNumber}`);
        return;
      }
      seenRolls.add(member.rollNumber);
    }

    const updatedRegistration: Registration = {
      ...editingReg,
      members: normalizedMembers,
      memberRolls: Array.from(seenRolls)
    };

    try {
      // Update registration in state
      if (onUpdateRegistration) {
        await onUpdateRegistration(updatedRegistration);
        alert("Registration updated successfully!");
      }
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Registration update failed:', error);
      if (error instanceof Error && error.message.trim().length > 0) {
        alert(error.message);
      } else {
        alert('Failed to update registration. Please try again.');
      }
    }
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await onRefreshData();
      alert('Registrations refreshed from database.');
    } catch (error) {
      console.error('Refresh failed:', error);
      alert('Failed to refresh registrations from database.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await onLogout();
    } catch (error) {
      console.error('Logout failed:', error);
      alert('Failed to logout. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleToggleRegistrationsLive = async () => {
    setIsTogglingRegistrations(true);
    const nextState = !registrationsLive;

    try {
      await onSetRegistrationsLive(nextState);
      alert(
        nextState
          ? 'Live registrations resumed.'
          : 'Live registrations are now stopped.'
      );
    } catch (error) {
      console.error('Failed to toggle live registrations:', error);
      alert('Failed to change live registrations state. Please try again.');
    } finally {
      setIsTogglingRegistrations(false);
    }
  };

  const handleApplyStatusToAllEvents = async () => {
    if (events.length === 0) {
      alert('No events available to update.');
      return;
    }

    const statusLabel =
      EVENT_STATUS_OPTIONS.find((option) => option.value === bulkEventStatus)?.label ??
      bulkEventStatus;
    const eventsToUpdate = events.filter(
      (event) => event.status !== bulkEventStatus
    );

    if (eventsToUpdate.length === 0) {
      alert(`All events are already set to ${statusLabel}.`);
      return;
    }

    if (
      !window.confirm(
        `Apply "${statusLabel}" to all events? ${eventsToUpdate.length} of ${events.length} events will be updated.`
      )
    ) {
      return;
    }

    setIsBulkUpdatingEvents(true);
    let successCount = 0;
    let failureCount = 0;
    const UPDATE_CONCURRENCY = 8;

    try {
      for (let i = 0; i < eventsToUpdate.length; i += UPDATE_CONCURRENCY) {
        const chunk = eventsToUpdate.slice(i, i + UPDATE_CONCURRENCY);
        const results = await Promise.allSettled(
          chunk.map((event) =>
            onUpdateEventRef.current({
              ...event,
              status: bulkEventStatus
            })
          )
        );

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            successCount += 1;
            return;
          }

          const failedEvent = chunk[index];
          console.error(
            `Failed to update event ${failedEvent?.id ?? 'unknown'} in bulk status update:`,
            result.reason
          );
          failureCount += 1;
        });
      }

      if (failureCount > 0) {
        alert(
          `Applied status to ${successCount} events. Failed to update ${failureCount} events.`
        );
      } else {
        alert(`Applied "${statusLabel}" to ${successCount} events.`);
      }
    } finally {
      setIsBulkUpdatingEvents(false);
    }
  };

  // Selection handlers
  const toggleSelectAll = () => {
    setSelectedRegIds((previousSelected) => {
      const nextSelected = new Set(previousSelected);

      if (isAllVisibleSelected) {
        visibleRegs.forEach((reg) => nextSelected.delete(reg.id));
      } else {
        visibleRegs.forEach((reg) => nextSelected.add(reg.id));
      }

      return nextSelected;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedRegIds((previousSelected) => {
      const nextSelected = new Set(previousSelected);
      if (nextSelected.has(id)) {
        nextSelected.delete(id);
      } else {
        nextSelected.add(id);
      }
      return nextSelected;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedRegIds.size === 0) {
      alert('No registrations selected.');
      return;
    }

    if (!window.confirm(
      `Are you sure you want to delete ${selectedRegIds.size} registrations? This cannot be undone.`
    )) {
      return;
    }

    setIsBatchDeleting(true);
    setBatchDeleteProgress(null);
    try {
      const result = await onDeleteRegistrations(Array.from(selectedRegIds), {
        onProgress: (progress) => {
          setBatchDeleteProgress(progress);
        }
      });
      const deletedCount = result?.deletedCount ?? 0;
      const errors = result?.errors ?? [];

      if (errors.length > 0) {
        alert(`Deleted ${deletedCount} registrations. Errors: ${errors.join(', ')}`);
      } else {
        alert(`Successfully deleted ${deletedCount} registrations.`);
      }
      setSelectedRegIds(new Set());
    } catch (error) {
      console.error('Batch delete failed:', error);
      alert('Failed to delete registrations. Please try again.');
    } finally {
      setIsBatchDeleting(false);
      setBatchDeleteProgress(null);
    }
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-reveal px-2 md:px-0 pb-20">
      {/* Print Only Header */}
      <div className="hidden print-only text-black p-8 border-b border-black mb-10">
        <h1 className="text-3xl font-black uppercase">AURAX-2026 Registration Report</h1>
        <p className="mono text-xs">Generated on: {new Date().toLocaleString()}</p>
      </div>

      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 no-print">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <span className="mono text-[9px] md:text-[10px] uppercase text-zinc-500 tracking-[0.4em] font-black">Management // Access</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter aura-text-glow uppercase">Admin Panel</h2>
        </div>
        
        <div className="flex bg-zinc-900/40 p-1 rounded-full border border-white/5 backdrop-blur-3xl w-full md:w-auto self-start md:self-auto">
            <button 
              onClick={() => setTab('REGS')}
              className={`flex-1 md:flex-none px-4 md:px-8 py-2.5 md:py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'REGS' ? 'bg-white text-black shadow-2xl' : 'text-zinc-500 hover:text-white'}`}
            >
              Registrations
            </button>
            <button 
              onClick={() => setTab('EVENTS')}
              className={`flex-1 md:flex-none px-4 md:px-8 py-2.5 md:py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'EVENTS' ? 'bg-white text-black shadow-2xl' : 'text-zinc-500 hover:text-white'}`}
            >
              Tracks
            </button>
        </div>
      </header>

      <div className="no-print flex flex-wrap gap-3">
        <button
          onClick={() => {
            void handleToggleRegistrationsLive();
          }}
          disabled={isTogglingRegistrations}
          className={`px-6 py-2.5 md:py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-60 ${
            registrationsLive
              ? 'border border-rose-500/40 text-rose-300 bg-rose-500/10 hover:bg-rose-500 hover:text-white'
              : 'border border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white'
          }`}
        >
          {isTogglingRegistrations
            ? 'Updating...'
            : registrationsLive
              ? 'Stop Live Registrations'
              : 'Resume Live Registrations'}
        </button>

        <button
          onClick={() => {
            void handleRefreshData();
          }}
          disabled={isRefreshing}
          className="px-6 py-2.5 md:py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-indigo-500/40 text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-60"
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>

        <button
          onClick={() => {
            void handleLogout();
          }}
          disabled={isLoggingOut}
          className="px-6 py-2.5 md:py-3 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-rose-500/40 text-rose-300 bg-rose-500/10 hover:bg-rose-500 hover:text-white transition-all disabled:opacity-60"
        >
          {isLoggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-8 no-print">
        <StatCard label="Total registrations" value={stats.totalRegs.toString()} />
        <StatCard label="Events covered" value={`${stats.eventsCovered}/${stats.totalEvents}`} />
        <StatCard label="Filtered Results" value={filteredResultsCount.toString()} color="text-indigo-400" />
      </div>

      {tab === 'REGS' ? (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 no-print items-end">
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <div className="space-y-2">
                <label className="mono text-[8px] uppercase text-zinc-600 tracking-widest font-black">Event Filter</label>
                <select 
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    void onGoToRegistrationsPage(1);
                  }}
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-xs md:text-sm mono tracking-widest text-white focus:border-indigo-500 focus:outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">ALL EVENTS</option>
                  {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="mono text-[8px] uppercase text-zinc-600 tracking-widest font-black">Roll / Team Search</label>
                <input 
                  type="text" 
                  placeholder="SEARCH PROTOCOL..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    void onGoToRegistrationsPage(1);
                  }}
                  className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-4 text-xs md:text-sm mono tracking-widest text-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-zinc-800"
                />
              </div>
            </div>
            
            <div className="flex gap-2 w-full md:w-auto">
              <button 
                onClick={() => {
                  void handleBatchDelete();
                }}
                disabled={isBatchDeleting || selectedRegIds.size === 0}
                className="flex-grow md:flex-none px-4 py-4 bg-rose-600 border border-rose-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-500 transition-all disabled:opacity-50 disabled:hover:bg-rose-600"
              >
                {isBatchDeleting
                  ? batchDeleteProgress
                    ? `Deleting ${batchDeleteProgress.processedChunks}/${batchDeleteProgress.totalChunks}`
                    : 'Deleting...'
                  : `Batch Delete (${selectedRegIds.size})`}
              </button>
              <button 
                onClick={() => {
                  void handleExport(visibleRegs, `aurax-export-${selectedEventId}`);
                }}
                disabled={isExporting}
                className="flex-grow md:flex-none px-6 py-4 bg-zinc-900 border border-white/5 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-60"
              >
                {isExporting ? 'Exporting...' : 'Export XLSX'}
              </button>
              <button 
                onClick={handlePrint}
                className="px-6 py-4 bg-indigo-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-lg"
              >
                Print
              </button>
            </div>
          </div>

          {isBatchDeleting && batchDeleteProgress && (
            <p className="no-print mono text-[9px] uppercase tracking-widest text-rose-300/80 font-black">
              Deleting chunk {batchDeleteProgress.processedChunks}/
              {batchDeleteProgress.totalChunks} // deleted {batchDeleteProgress.deletedCount} of{' '}
              {batchDeleteProgress.totalRegistrations}
            </p>
          )}

          <div className="no-print flex flex-wrap items-center justify-between gap-3">
            <p className="mono text-[9px] uppercase tracking-widest text-zinc-600 font-black">
              {hasActiveFilters
                ? 'Registrations: Filtered View'
                : `Registrations Page: ${registrationPage}`}
            </p>
            {hasActiveFilters ? (
              <p className="mono text-[9px] uppercase tracking-widest text-zinc-500 font-black">
                Filter/Search results are shown from all pages
              </p>
            ) : shouldShowPaginationControls ? (
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => {
                    void onPreviousRegistrationsPage();
                  }}
                  disabled={!hasPreviousRegistrationsPage}
                  className="px-4 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-zinc-700 text-zinc-300 bg-zinc-900/60 hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:hover:bg-zinc-900/60"
                >
                  Prev
                </button>
                {registrationPageNumbers.map((pageNumber) => {
                  const isActivePage = pageNumber === registrationPage;
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => {
                        void onGoToRegistrationsPage(pageNumber);
                      }}
                      className={`px-3 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border transition-all ${
                        isActivePage
                          ? 'border-indigo-500/40 text-indigo-200 bg-indigo-500/20'
                          : 'border-zinc-700 text-zinc-300 bg-zinc-900/60 hover:bg-zinc-800'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                <button
                  onClick={() => {
                    void onNextRegistrationsPage();
                  }}
                  disabled={!hasNextRegistrationsPage || isLoadingNextRegistrationsPage}
                  className="px-4 py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-indigo-500/40 text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50 disabled:hover:bg-indigo-500/10 disabled:hover:text-indigo-300"
                >
                  {isLoadingNextRegistrationsPage
                    ? 'Loading...'
                    : hasNextRegistrationsPage
                      ? 'Next'
                      : 'No More Pages'}
                </button>
              </div>
            ) : (
              <p className="mono text-[9px] uppercase tracking-widest text-zinc-500 font-black">
                Pagination appears when registrations exceed 500
              </p>
            )}
          </div>

          <div className="overflow-x-auto rounded-[2rem] border border-white/5 glass-premium no-scrollbar shadow-2xl">
            <table className="w-full text-left border-collapse min-w-[980px]">
              <thead className="bg-white/[0.02] text-[9px] mono uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5">
                <tr>
                  <th className="p-6 font-black w-12 no-print">
                    <input 
                      type="checkbox" 
                      checked={isAllVisibleSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                    />
                  </th>
                  <th className="p-6 font-black">Event Name</th>
                  <th className="p-6 font-black">Team / Lead</th>
                  <th className="p-6 font-black">Team Details</th>
                  {showInstagramColumn && (
                    <th className="p-6 font-black">{instagramColumnLabel}</th>
                  )}
                  {showDriveColumn && (
                    <th className="p-6 font-black">{driveColumnLabel}</th>
                  )}
                  {showIdeaColumn && (
                    <th className="p-6 font-black">Idea</th>
                  )}
                  <th className="p-6 font-black">Primary Contact</th>
                  <th className="p-6 font-black">Alternative Contact</th>
                  <th className="p-6 font-black text-right no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[11px] md:text-sm">
                {visibleRegs.map(reg => (
                  <tr key={reg.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-6 no-print">
                      <input 
                        type="checkbox" 
                        checked={selectedRegIds.has(reg.id)}
                        onChange={() => toggleSelectOne(reg.id)}
                        className="w-4 h-4 accent-indigo-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-6">
                       <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] mono rounded-full font-black uppercase whitespace-nowrap">
                        {reg.eventName}
                      </span>
                      <p className="text-[9px] text-zinc-600 mt-2 mono">{reg.timestamp}</p>
                    </td>
                    <td className="p-6">
                      <p className="font-black text-white uppercase tracking-wider mb-1">{reg.teamName || "SOLO UNIT"}</p>
                      <p className="text-[10px] text-zinc-500 mono">{reg.members[0].name}</p>
                    </td>
                    <td className="p-6">
                      <div className="flex flex-col gap-1.5">
                        {reg.members.map((m, i) => (
                          <p key={i} className="text-[10px] text-zinc-400 mono">
                            <span className="text-zinc-600 mr-2">#{i+1}</span>
                            {m.rollNumber}{' '}
                            <span className="text-zinc-700 ml-1">
                              ({m.section}, {m.year || 'N/A'})
                            </span>
                          </p>
                        ))}
                      </div>
                    </td>
                    {showInstagramColumn && (
                      <td className="p-6">
                        {reg.instagramLink ? (
                          <a
                            href={reg.instagramLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 mono break-all"
                          >
                            {reg.instagramLink}
                          </a>
                        ) : (
                          <span className="text-zinc-700 mono text-[10px]">-</span>
                        )}
                      </td>
                    )}
                    {showDriveColumn && (
                      <td className="p-6">
                        {reg.driveLink ? (
                          <a
                            href={reg.driveLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 mono break-all"
                          >
                            {reg.driveLink}
                          </a>
                        ) : (
                          <span className="text-zinc-700 mono text-[10px]">-</span>
                        )}
                      </td>
                    )}
                    {showIdeaColumn && (
                      <td className="p-6">
                        <p className="text-[10px] text-zinc-400 leading-relaxed max-w-sm break-words">
                          {reg.ideaText?.trim() || '-'}
                        </p>
                      </td>
                    )}
                    <td className="p-6 text-zinc-500 mono text-[10px] font-black tracking-widest">{reg.members[0]?.phone}</td>
                    <td className="p-6 text-zinc-500 mono text-[10px] font-black tracking-widest">
                      {reg.alternatePhone?.trim() || '-'}
                    </td>
                    <td className="p-6 text-right no-print">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => { setEditingReg(reg); setIsEditModalOpen(true); }}
                          className="p-3 bg-white/5 hover:bg-white hover:text-black rounded-lg transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                        </button>
                        <button 
                          onClick={() => {
                            void onDeleteRegistration(reg.id);
                          }}
                          className="p-3 bg-white/5 hover:bg-rose-600 hover:text-white rounded-lg transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleRegs.length === 0 && (
                  <tr>
                    <td colSpan={tableColumnCount} className="p-24 text-center text-zinc-800 mono text-[11px] uppercase tracking-[0.5em]">NO_DATA_STREAM_FOUND</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-8 md:space-y-10 pb-20 no-print">
          <div className="glass-premium rounded-[1.5rem] md:rounded-[2rem] border border-white/5 p-4 md:p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1">
              <p className="mono text-[9px] uppercase tracking-[0.3em] text-zinc-500 font-black">
                Global Registration Status
              </p>
              <p className="text-xs md:text-sm text-zinc-400">
                Set one status for all events from a single control.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              <select
                value={bulkEventStatus}
                onChange={(e) => setBulkEventStatus(e.target.value as EventStatus)}
                disabled={isBulkUpdatingEvents || events.length === 0}
                className={`w-full sm:w-[220px] px-4 py-3 rounded-xl md:rounded-2xl text-xs md:text-[10px] font-black uppercase tracking-[0.14em] border transition-all focus:outline-none disabled:opacity-60 ${getEventStatusSelectClassName(
                  bulkEventStatus
                )}`}
              >
                {EVENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-zinc-950 text-white">
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  void handleApplyStatusToAllEvents();
                }}
                disabled={isBulkUpdatingEvents || events.length === 0}
                className="w-full sm:w-auto px-5 md:px-7 py-3 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-[0.18em] border border-indigo-500/40 text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-60"
              >
                {isBulkUpdatingEvents ? 'Applying...' : 'Apply to All Events'}
              </button>
              <button
                onClick={() => {
                  void handleCopyAllEventLinks();
                }}
                disabled={allEventsForLinkCopy.length === 0}
                className="w-full sm:w-auto px-5 md:px-7 py-3 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-[0.18em] border border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-60"
              >
                Copy All Links
              </button>
            </div>
          </div>

          {EVENT_CATEGORY_SECTIONS.map((section) => {
            const sectionEvents = events.filter(
              (event) => event.category === section.value
            );

            return (
              <section key={section.value} className="space-y-4 md:space-y-6">
                <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-3">
                  <h3 className="text-sm md:text-lg font-black uppercase tracking-widest text-white">
                    {section.label}
                  </h3>
                  <span className="mono text-[9px] uppercase tracking-widest text-zinc-600">
                    {sectionEvents.length} Events
                  </span>
                </div>

                {sectionEvents.length === 0 ? (
                  <div className="rounded-2xl border border-white/5 bg-zinc-950/30 p-6 text-center">
                    <p className="mono text-[10px] uppercase tracking-widest text-zinc-600">
                      No events in this category
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {sectionEvents.map((event) => (
                      <div key={event.id} className="glass-premium p-6 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 group hover:border-indigo-500/30 transition-all overflow-hidden">
                        <div className="space-y-2 pr-0 sm:pr-6 w-full min-w-0">
                          <h4 className="text-xl md:text-2xl font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tighter leading-none break-words">{event.name}</h4>
                          <div className="flex gap-4">
                            <p className="text-[10px] mono text-indigo-500 uppercase tracking-widest font-black">{event.maxTeamSize} UNITS</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full sm:w-auto sm:max-w-[320px] items-stretch sm:items-start">
                           <button 
                            onClick={() => { setEditingEvent(event); setIsEventModalOpen(true); }}
                            className="self-start p-3.5 md:p-4 bg-white/5 hover:bg-white hover:text-black rounded-xl md:rounded-2xl transition-all flex items-center justify-center shrink-0"
                            title="Edit Parameters"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                          </button>
                          <button
                            onClick={() => {
                              void handleCopyEventLink(event);
                            }}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-[0.16em] border border-emerald-500/40 text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white transition-all"
                            title="Copy registration link for poster"
                          >
                            Copy Link
                          </button>
                          <div className="w-full sm:w-[260px] lg:w-[280px] min-w-0 space-y-2">
                            <span className={`inline-flex max-w-full justify-center sm:justify-start px-3 py-1 rounded-full border text-[9px] sm:text-[8px] mono font-black uppercase tracking-[0.16em] sm:tracking-widest whitespace-normal leading-tight ${getEventStatusChipClassName(event.status)}`}>
                              {event.status === 'REGISTRATION_OPEN_SOON'
                                ? 'OPEN SOON'
                                : event.status}
                            </span>
                            <select
                              value={event.status}
                              onChange={(e) => {
                                const nextStatus = e.target.value as EventStatus;
                                if (nextStatus === event.status) return;
                                void onUpdateEvent({
                                  ...event,
                                  status: nextStatus
                                });
                              }}
                              className={`w-full min-w-0 px-4 py-3 rounded-xl md:rounded-2xl text-base sm:text-[11px] md:text-[10px] font-black uppercase tracking-[0.08em] sm:tracking-[0.16em] md:tracking-widest leading-tight border transition-all focus:outline-none ${getEventStatusSelectClassName(event.status)}`}
                            >
                              {EVENT_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value} className="bg-zinc-950 text-white">
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Edit Registration Modal */}
      {isEditModalOpen && editingReg &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 no-print">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsEditModalOpen(false)}></div>
            <div className="relative w-full max-w-4xl glass-premium bg-zinc-950 p-8 md:p-12 rounded-[3rem] border-white/10 shadow-2xl max-h-[90vh] overflow-y-auto no-scrollbar">
               <div className="flex justify-between items-center mb-10 border-b border-white/5 pb-8">
                  <h3 className="text-2xl md:text-3xl font-black uppercase tracking-tighter">Edit Protocol: {editingReg.eventName}</h3>
                  <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-500 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" /></svg></button>
               </div>
               
               <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <div className="space-y-2">
                      <label className="mono text-[9px] uppercase text-zinc-600 font-black">Team Identity</label>
                      <input type="text" value={editingReg.teamName || ""} onChange={e => setEditingReg({...editingReg, teamName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white mono" />
                    </div>
                    <div className="space-y-2">
                      <label className="mono text-[9px] uppercase text-zinc-600 font-black">Alternate Phone</label>
                      <input type="text" value={editingReg.alternatePhone || ""} onChange={e => setEditingReg({...editingReg, alternatePhone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white mono" />
                    </div>
                    <div className="space-y-2">
                      <label className="mono text-[9px] uppercase text-zinc-600 font-black">Instagram Link</label>
                      <input type="text" value={editingReg.instagramLink || ""} onChange={e => setEditingReg({...editingReg, instagramLink: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white mono" />
                    </div>
                    <div className="space-y-2">
                      <label className="mono text-[9px] uppercase text-zinc-600 font-black">Drive Link</label>
                      <input type="text" value={editingReg.driveLink || ""} onChange={e => setEditingReg({...editingReg, driveLink: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white mono" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="mono text-[9px] uppercase text-zinc-600 font-black">Idea Text</label>
                    <textarea
                      value={editingReg.ideaText || ""}
                      onChange={e =>
                        setEditingReg({
                          ...editingReg,
                          ideaText: e.target.value.slice(0, 500)
                        })
                      }
                      maxLength={500}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white"
                    />
                  </div>

                  {editingReg.members.map((member, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 space-y-6">
                      <p className="mono text-[10px] text-indigo-400 font-black">PLAYER_UNIT_0{i+1}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-zinc-700 font-bold">Name</label>
                          <input type="text" value={member.name} onChange={e => handleEditMember(i, 'name', e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-sm text-white focus:outline-none focus:border-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-zinc-700 font-bold">Roll Number</label>
                          <input type="text" value={member.rollNumber} onChange={e => handleEditMember(i, 'rollNumber', e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-sm text-white focus:outline-none focus:border-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-zinc-700 font-bold">Section</label>
                          <input type="text" value={member.section} onChange={e => handleEditMember(i, 'section', e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-sm text-white focus:outline-none focus:border-white" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[8px] uppercase text-zinc-700 font-bold">Phone</label>
                          <input type="text" value={member.phone || ""} onChange={e => handleEditMember(i, 'phone', e.target.value)} className="w-full bg-transparent border-b border-white/10 py-2 text-sm text-white focus:outline-none focus:border-white" />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-4 pt-10">
                    <button
                      onClick={() => {
                        void saveRegChanges();
                      }}
                      className="flex-grow py-5 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-500 hover:text-white transition-all"
                    >
                      Save Changes
                    </button>
                    <button onClick={() => setIsEditModalOpen(false)} className="px-10 py-5 border border-white/10 text-zinc-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-white/5">Cancel</button>
                  </div>
               </div>
            </div>
          </div>,
          document.body
        )}

      {/* Edit Event Modal */}
      {isEventModalOpen && editingEvent &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 no-print">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsEventModalOpen(false)}></div>
            <div className="relative w-full max-w-lg glass-premium bg-zinc-950 p-10 rounded-[3rem] border-white/10 shadow-2xl">
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 border-b border-white/5 pb-6">Modify Track: {editingEvent.name}</h3>
              <div className="space-y-8">
                 <div className="space-y-2">
                    <label className="mono text-[9px] uppercase text-zinc-600 font-black tracking-widest">Team Size (Units)</label>
                    <input type="number" value={editingEvent.maxTeamSize} onChange={e => setEditingEvent({...editingEvent, maxTeamSize: parseInt(e.target.value)})} className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white mono" />
                 </div>
                 <div className="space-y-2">
                    <label className="mono text-[9px] uppercase text-zinc-600 font-black tracking-widest">Registration Status</label>
                    <select
                      value={editingEvent.status}
                      onChange={(e) =>
                        setEditingEvent({
                          ...editingEvent,
                          status: e.target.value as EventStatus
                        })
                      }
                      className={`w-full rounded-xl p-4 text-base md:text-sm font-black uppercase tracking-[0.08em] md:tracking-widest border focus:outline-none ${getEventStatusSelectClassName(editingEvent.status)}`}
                    >
                      {EVENT_STATUS_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="bg-zinc-950 text-white">
                          {option.label}
                        </option>
                      ))}
                    </select>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button
                      onClick={() => {
                        void (async () => {
                          await onUpdateEvent(editingEvent);
                          setIsEventModalOpen(false);
                        })();
                      }}
                      className="flex-grow py-5 bg-white text-black font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-500 hover:text-white transition-all"
                    >
                      Apply Params
                    </button>
                    <button onClick={() => setIsEventModalOpen(false)} className="px-8 py-5 border border-white/10 text-zinc-500 font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-white/5">Back</button>
                 </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = "text-white" }) => (
  <div className="glass-premium p-6 md:p-10 rounded-[2rem] border-white/5 bg-zinc-950/40 space-y-2 flex flex-col items-center md:items-start">
    <span className="mono text-[8px] md:text-[9px] uppercase text-zinc-600 tracking-[0.4em] font-black">{label}</span>
    <p className={`text-2xl md:text-5xl font-black tracking-tighter leading-none ${color}`}>{value}</p>
  </div>
);

export default AdminView;
