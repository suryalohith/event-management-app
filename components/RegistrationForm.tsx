
import React, { useState, useEffect } from 'react';
import { Event, Registration, Participant, EventCategory } from '../types';

interface RegistrationFormProps {
  event: Event;
  onSubmit: (reg: Registration) => Promise<void> | void;
  onCancel: () => void;
}

const NO_TEAM_NAME_EVENTS = [
  'Badminton Singles',
  'Chess',
  'Sprint 100m (Women)',
  'Sprint 400m (Men)',
  'Cube Solving',
  'Sprint 100m (Men)',
  'Sprint 400m (Women)'
];

type InstagramLinkConfig = {
  label: string;
  placeholder: string;
  pathPrefix: string;
};

type DriveLinkConfig = {
  label: string;
  placeholder: string;
};

type IdeaTextConfig = {
  label: string;
  placeholder: string;
  maxLength: number;
};

const INSTAGRAM_LINK_EVENT_CONFIG: Record<string, InstagramLinkConfig> = {
  nt_best_meme: {
    label: 'Instagram Meme Link *',
    placeholder: 'https://www.instagram.com/p/...',
    pathPrefix: '/p/'
  },
  nt_best_reel: {
    label: 'Instagram Reel Link *',
    placeholder: 'https://www.instagram.com/reel/...',
    pathPrefix: '/reel/'
  }
};

const DRIVE_LINK_EVENT_CONFIG: Record<string, DriveLinkConfig> = {
  nt_photography: {
    label: 'Google Drive Photo Link *',
    placeholder: 'https://drive.google.com/file/d/...'
  },
  nt_poster: {
    label: 'Google Drive Poster Link *',
    placeholder: 'https://drive.google.com/file/d/...'
  }
};

const IDEA_TEXT_EVENT_CONFIG: Record<string, IdeaTextConfig> = {
  nt_department_ideas: {
    label: 'Write Your Idea *',
    placeholder: 'Write your idea (max 500 characters)',
    maxLength: 500
  }
};

const REQUIRED_MEMBER_COUNT_BY_EVENT: Record<string, number> = {};

const OPTIONAL_MEMBER_NOTE_BY_EVENT: Record<string, string> = {
  t_hackathon:
    'Students 1-2 are mandatory. Students 3-4 are optional. At least one girl participant is mandatory.',
  t_ai_challenge:
    'Students 1-2 are mandatory. Students 3-4 are optional. At least one girl participant is mandatory.',
  t_technical_debate:
    'Students 1-2 are mandatory. Student 3 is optional.'
};

const SUBSTITUTE_FORMAT_BY_EVENT: Record<string, { active: number; total: number }> = {
  s_cri: { active: 11, total: 15 },
  s_kab: { active: 7, total: 10 },
  s_fb: { active: 7, total: 10 },
  s_vol: { active: 6, total: 9 },
  s_towm: { active: 8, total: 10 },
  s_toww: { active: 8, total: 10 },
  s_khw: { active: 9, total: 12 },
  s_dbw: { active: 6, total: 10 },
  s_tbw: { active: 7, total: 10 }
};

const normalizeUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  // If already has protocol, validate it's a safe URL
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      // Block dangerous protocols
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return '';
      }
      return trimmed;
    } catch {
      return '';
    }
  }
  // Prepend https:// for URLs without protocol
  try {
    const url = new URL(`https://${trimmed}`);
    if (url.protocol !== 'https:') {
      return '';
    }
    return `https://${trimmed}`;
  } catch {
    return '';
  }
};

const isValidInstagramUrl = (
  value: string,
  expectedPathPrefix: string
): boolean => {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname !== 'instagram.com' &&
      hostname !== 'www.instagram.com' &&
      !hostname.endsWith('.instagram.com')
    ) {
      return false;
    }

    const normalizedPath = parsed.pathname.toLowerCase();
    return normalizedPath.startsWith(expectedPathPrefix);
  } catch {
    return false;
  }
};

const isValidGoogleDriveUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    return hostname === 'drive.google.com' || hostname === 'docs.google.com';
  } catch {
    return false;
  }
};

const RegistrationForm: React.FC<RegistrationFormProps> = ({ event, onSubmit, onCancel }) => {
  const SUBMIT_TIMEOUT_MS = 20000;
  const [teamName, setTeamName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [instagramLink, setInstagramLink] = useState('');
  const [driveLink, setDriveLink] = useState('');
  const [ideaText, setIdeaText] = useState('');
  const [teamSize, setTeamSize] = useState(event.maxTeamSize);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitAttempt, setLastSubmitAttempt] = useState<number>(0);

  // Participant labels based on category
  const pLabel = event.category === EventCategory.SPORTS ? 'Player' : 'Student';
  const substituteFormat = SUBSTITUTE_FORMAT_BY_EVENT[event.id] ?? null;
  const requiredMemberCount = Math.min(
    teamSize,
    Math.max(
      REQUIRED_MEMBER_COUNT_BY_EVENT[event.id] ??
        substituteFormat?.active ??
        event.minTeamSize,
      1
    )
  );
  const hasOptionalMembers = requiredMemberCount < teamSize;
  const optionalMemberNote = OPTIONAL_MEMBER_NOTE_BY_EVENT[event.id] ?? null;
  const needsTeamName = event.maxTeamSize > 1 && !NO_TEAM_NAME_EVENTS.includes(event.name);
  const instagramLinkConfig = INSTAGRAM_LINK_EVENT_CONFIG[event.id] ?? null;
  const needsInstagramLink = instagramLinkConfig !== null;
  const driveLinkConfig = DRIVE_LINK_EVENT_CONFIG[event.id] ?? null;
  const needsDriveLink = driveLinkConfig !== null;
  const ideaTextConfig = IDEA_TEXT_EVENT_CONFIG[event.id] ?? null;
  const needsIdeaText = ideaTextConfig !== null;

  const emptyMember = (): Participant => ({
    name: '', rollNumber: '', section: '', year: '...', phone: ''
  });

  const [members, setMembers] = useState<Participant[]>(
    Array.from({ length: event.maxTeamSize }, emptyMember)
  );

  useEffect(() => {
    setTeamSize(event.maxTeamSize);
    setMembers(Array.from({ length: event.maxTeamSize }, emptyMember));
    setInstagramLink('');
    setDriveLink('');
    setIdeaText('');
    setIsSubmitting(false);
  }, [event]);

  const resetForm = () => {
    setTeamName('');
    setContactPhone('');
    setAlternatePhone('');
    setInstagramLink('');
    setDriveLink('');
    setIdeaText('');
    setTeamSize(event.maxTeamSize);
    setMembers(Array.from({ length: event.maxTeamSize }, emptyMember));
  };

  const detectYear = (roll: string) => {
    const prefix = roll.substring(0, 3);
    if (prefix === '322') return '4th Year';
    if (prefix === '323') return '3rd Year';
    if (prefix === '324') return '2nd Year';
    if (prefix === '325') return '1st Year';
    return 'INVALID';
  };

  const validateRoll = (roll: string) => {
    const year = detectYear(roll);
    return roll.length === 12 && year !== 'INVALID';
  };

  const handleMemberChange = (idx: number, field: keyof Participant, value: string) => {
    const newMembers = [...members];
    const updated = { ...newMembers[idx], [field]: value };
    
    if (field === 'rollNumber') {
      const cleaned = value.replace(/\D/g, '').substring(0, 12);
      updated.rollNumber = cleaned;
      updated.year = detectYear(cleaned);
    }
    if (field === 'phone') {
      updated.phone = value.replace(/\D/g, '').substring(0, 10);
    }
    newMembers[idx] = updated;
    setMembers(newMembers);
  };

  const clearDuplicateRollFromForm = (duplicateRoll: string) => {
    if (!duplicateRoll) {
      return;
    }

    setMembers((previousMembers) =>
      previousMembers.map((member) =>
        member.rollNumber === duplicateRoll
          ? { ...member, rollNumber: '', year: '...' }
          : member
      )
    );
  };

  const extractDuplicateRollFromError = (message: string): string | null => {
    const match = message.match(
      /(?:roll number|reg(?:istration)?\s*no)\s+(\d{1,12})\s+is already registered/i
    );
    return match ? match[1] : null;
  };

  const submitWithTimeout = async (
    registrationPromise: Promise<void> | void
  ): Promise<void> => {
    const submitPromise = Promise.resolve(registrationPromise);
    await new Promise<void>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        reject(
          new Error(
            'Registration request timed out. Please check your internet and try again.'
          )
        );
      }, SUBMIT_TIMEOUT_MS);

      submitPromise.then(
        () => {
          window.clearTimeout(timer);
          resolve();
        },
        (error) => {
          window.clearTimeout(timer);
          reject(error);
        }
      );
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting: prevent submissions within 3 seconds
    const now = Date.now();
    if (now - lastSubmitAttempt < 3000) {
      alert('Please wait a moment before submitting again.');
      return;
    }
    setLastSubmitAttempt(now);

    if (isSubmitting) {
      return;
    }

    if (event.status !== 'OPEN') {
      if (event.status === 'REGISTRATION_OPEN_SOON') {
        alert(`${event.name} registrations open soon. Please check back later.`);
      } else {
        alert(`Registrations are closed for ${event.name}.`);
      }
      onCancel();
      return;
    }

    let activeMembers = members.slice(0, teamSize);
    
    // Validations
    if (needsTeamName && !teamName.trim()) {
      alert('Error: Team Name is mandatory for this event.');
      return;
    }

    if (contactPhone.length !== 10) {
      alert('Error: Contact Phone must be exactly 10 digits.');
      return;
    }

    const normalizedInstagramLink = normalizeUrl(instagramLink);
    const normalizedDriveLink = normalizeUrl(driveLink);
    const normalizedIdeaText = ideaText.trim();

    if (needsInstagramLink) {
      if (!normalizedInstagramLink) {
        alert(
          `Error: ${
            instagramLinkConfig?.label.replace(' *', '') || 'Instagram link'
          } is required for this event.`
        );
        return;
      }

      if (
        !isValidInstagramUrl(
          normalizedInstagramLink,
          instagramLinkConfig?.pathPrefix || '/p/'
        )
      ) {
        alert(
          instagramLinkConfig?.pathPrefix === '/reel/'
            ? 'Error: Please enter a valid Instagram reel link (instagram.com/reel/...).'
            : 'Error: Please enter a valid Instagram meme/post link (instagram.com/p/...).'
        );
        return;
      }
    }

    if (needsDriveLink) {
      if (!normalizedDriveLink) {
        alert(
          `Error: ${
            driveLinkConfig?.label.replace(' *', '') || 'Google Drive link'
          } is required for this event.`
        );
        return;
      }

      if (!isValidGoogleDriveUrl(normalizedDriveLink)) {
        alert(
          'Error: Please enter a valid Google Drive link (drive.google.com/... or docs.google.com/...).'
        );
        return;
      }
    }

    if (needsIdeaText) {
      if (!normalizedIdeaText) {
        alert(
          `Error: ${
            ideaTextConfig?.label.replace(' *', '') || 'Idea text'
          } is required for this event.`
        );
        return;
      }

      const maxIdeaLength = ideaTextConfig?.maxLength ?? 500;
      if (normalizedIdeaText.length > maxIdeaLength) {
        alert(`Error: Idea must be ${maxIdeaLength} characters or less.`);
        return;
      }
    }

    const rollSet = new Set<string>();

    if (hasOptionalMembers) {
      const normalizedMembers: Participant[] = [];

      for (const [idx, member] of activeMembers.entries()) {
        const isRequiredMember = idx < requiredMemberCount;
        const hasAnyValue =
          member.name.trim().length > 0 ||
          member.rollNumber.trim().length > 0 ||
          member.section.trim().length > 0;

        if (!isRequiredMember && !hasAnyValue) {
          continue;
        }

        if (
          !member.name.trim() ||
          !member.section.trim() ||
          !member.rollNumber.trim()
        ) {
          if (isRequiredMember) {
            alert(`Error: Missing details for ${pLabel} ${idx + 1}.`);
          } else {
            alert(
              substituteFormat
                ? `Error: ${pLabel} ${idx + 1} is a substitute slot. Fill all details or leave it empty.`
                : `Error: ${pLabel} ${idx + 1} is optional, but if entered all details are required.`
            );
          }
          return;
        }

        if (!validateRoll(member.rollNumber)) {
          alert(`Error: Invalid 12-digit Roll Number for ${pLabel} ${idx + 1}. Prefix must be 322-325.`);
          return;
        }

        if (rollSet.has(member.rollNumber)) {
          alert(`Error: Duplicate Roll Number detected: ${member.rollNumber}`);
          return;
        }

        rollSet.add(member.rollNumber);
        normalizedMembers.push(member);
      }

      if (normalizedMembers.length < requiredMemberCount) {
        alert(`Error: At least ${requiredMemberCount} members are required.`);
        return;
      }

      activeMembers = normalizedMembers;
    } else {
      for (const [idx, m] of activeMembers.entries()) {
        if (!m.name.trim() || !m.section.trim()) {
          alert(`Error: Missing details for ${pLabel} ${idx + 1}.`);
          return;
        }
        if (!validateRoll(m.rollNumber)) {
          alert(`Error: Invalid 12-digit Roll Number for ${pLabel} ${idx + 1}. Prefix must be 322-325.`);
          return;
        }
        if (rollSet.has(m.rollNumber)) {
          alert(`Error: Duplicate Roll Number detected: ${m.rollNumber}`);
          return;
        }
        rollSet.add(m.rollNumber);
      }
    }

    // Rules require a valid 10-digit phone for each member.
    // The form captures one contact number, so apply it to all submitted members.
    activeMembers = activeMembers.map((member) => ({
      ...member,
      phone:
        typeof member.phone === 'string' && member.phone.trim().length === 10
          ? member.phone
          : contactPhone
    }));

    // iOS Safari can keep page zoomed after small-input focus; blur active field on submit.
    (document.activeElement as HTMLElement | null)?.blur();

    // Prevent double submissions
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      // Note: Registration ID will be generated by Firestore
      await submitWithTimeout(onSubmit({
        id: '', // Will be replaced by Firestore-generated ID
        eventId: event.id,
        eventName: event.name,
        teamName:
          needsTeamName
            ? teamName
            : event.maxTeamSize === 1
              ? activeMembers[0].name
              : undefined,
        alternatePhone: alternatePhone || undefined,
        instagramLink: needsInstagramLink ? normalizedInstagramLink : undefined,
        driveLink: needsDriveLink ? normalizedDriveLink : undefined,
        ideaText: needsIdeaText ? normalizedIdeaText : undefined,
        members: activeMembers,
        memberRolls: Array.from(new Set(activeMembers.map((member) => member.rollNumber))),
        timestamp: new Date().toLocaleString(),
        createdAt: Date.now()
      }));

      resetForm();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Registration failed. Please try again.';
      const duplicateRoll = extractDuplicateRollFromError(message);

      if (duplicateRoll) {
        clearDuplicateRollFromForm(duplicateRoll);
      }

      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-reveal pb-12 md:pb-20 px-3 md:px-4">
      <div className="glass-premium p-6 md:p-14 rounded-[2rem] md:rounded-[3rem] border-white/5 bg-zinc-950/60 shadow-2xl overflow-hidden">
        <div className="flex justify-between items-start mb-8 md:mb-14 border-b border-white/5 pb-6 md:pb-8">
          <div className="space-y-2 md:space-y-3">
            <span className="mono text-[8px] md:text-[10px] text-indigo-400 uppercase tracking-[0.3em] md:tracking-[0.5em] font-black">Registry Terminal</span>
            <h2 className="text-2xl md:text-6xl font-black tracking-tighter uppercase leading-tight md:leading-none pr-4">{event.name}</h2>
          </div>
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className={`p-2 md:p-4 rounded-full transition-all group flex-shrink-0 ${
              isSubmitting
                ? 'text-zinc-700 cursor-not-allowed'
                : 'hover:bg-white/5 text-zinc-600 hover:text-white'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10 md:space-y-16">
          {/* Header Section: Team and Contact */}
          <div className={`grid grid-cols-1 md:grid-cols-2 ${needsInstagramLink || needsDriveLink || needsIdeaText ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6 md:gap-10 p-5 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] bg-white/[0.02] border border-white/5`}>
            {needsTeamName && (
              <div className="space-y-2">
                <label className="text-[9px] md:text-[10px] uppercase text-zinc-500 mono tracking-widest font-black">Team Name *</label>
                <input
                  type="text"
                  placeholder="e.g. CYBER_SQUAD"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value.toUpperCase())}
                  className="w-full bg-transparent border-b border-white/10 py-3 md:py-4 text-base md:text-xl focus:border-indigo-500 focus:outline-none transition-all placeholder:text-zinc-900 mono uppercase"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-[9px] md:text-[10px] uppercase text-zinc-500 mono tracking-widest font-black">Contact Phone *</label>
              <input
                type="tel"
                placeholder="10 Digits"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value.replace(/\D/g, '').substring(0, 10))}
                className="w-full bg-transparent border-b border-white/10 py-3 md:py-4 text-base md:text-xl focus:border-indigo-500 focus:outline-none transition-all placeholder:text-zinc-900 mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] md:text-[10px] uppercase text-zinc-500 mono tracking-widest font-black">Alt Phone</label>
              <input
                type="tel"
                placeholder="Optional"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value.replace(/\D/g, '').substring(0, 10))}
                className="w-full bg-transparent border-b border-white/10 py-3 md:py-4 text-base md:text-xl focus:border-indigo-500 focus:outline-none transition-all placeholder:text-zinc-900 mono"
              />
            </div>

            {needsInstagramLink && (
              <div className="space-y-2">
                <label className="text-[9px] md:text-[10px] uppercase text-zinc-500 mono tracking-widest font-black">
                  {instagramLinkConfig?.label}
                </label>
                <input
                  type="url"
                  placeholder={instagramLinkConfig?.placeholder}
                  value={instagramLink}
                  onChange={(e) => setInstagramLink(e.target.value)}
                  className="w-full bg-transparent border-b border-white/10 py-3 md:py-4 text-base md:text-xl focus:border-indigo-500 focus:outline-none transition-all placeholder:text-zinc-900 mono"
                />
              </div>
            )}

            {needsDriveLink && (
              <div className="space-y-2">
                <label className="text-[9px] md:text-[10px] uppercase text-zinc-500 mono tracking-widest font-black">
                  {driveLinkConfig?.label}
                </label>
                <input
                  type="url"
                  placeholder={driveLinkConfig?.placeholder}
                  value={driveLink}
                  onChange={(e) => setDriveLink(e.target.value)}
                  className="w-full bg-transparent border-b border-white/10 py-3 md:py-4 text-base md:text-xl focus:border-indigo-500 focus:outline-none transition-all placeholder:text-zinc-900 mono"
                />
              </div>
            )}

            {needsIdeaText && (
              <div className="space-y-2 md:col-span-2 lg:col-span-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[9px] md:text-[10px] uppercase text-zinc-500 mono tracking-widest font-black">
                    {ideaTextConfig?.label}
                  </label>
                  <span className="text-[8px] md:text-[9px] uppercase text-zinc-600 mono tracking-widest font-bold">
                    {ideaText.length}/{ideaTextConfig?.maxLength ?? 500}
                  </span>
                </div>
                <textarea
                  rows={4}
                  placeholder={ideaTextConfig?.placeholder}
                  value={ideaText}
                  maxLength={ideaTextConfig?.maxLength ?? 500}
                  onChange={(e) => setIdeaText(e.target.value)}
                  className="w-full bg-transparent border border-white/10 rounded-xl py-3 px-4 md:py-4 md:px-5 text-sm md:text-base focus:border-indigo-500 focus:outline-none transition-all placeholder:text-zinc-900 font-medium resize-y min-h-[120px]"
                />
              </div>
            )}
          </div>

          <p className="text-[9px] md:text-[10px] mono text-amber-300 uppercase tracking-[0.2em] md:tracking-[0.35em]">
            Note: One roll number can register only once per event. Multiple registrations for the same roll number in the same event are not allowed.
          </p>
          <p className="text-[9px] md:text-[10px] mono text-amber-300 uppercase tracking-[0.2em] md:tracking-[0.35em]">
            Note: Department fee is mandatory to participate.
          </p>

          {/* Participant Blocks */}
          <div className="space-y-10 md:space-y-14">
            {substituteFormat && (
              <p className="text-[9px] md:text-[10px] mono text-amber-300 uppercase tracking-[0.2em] md:tracking-[0.35em]">
                {`Players 1-${substituteFormat.active} are mandatory. Players ${
                  substituteFormat.active + 1
                }-${substituteFormat.total} are substitutes (optional).`}
              </p>
            )}
            {hasOptionalMembers && !substituteFormat && (
              <p className="text-[9px] md:text-[10px] mono text-amber-300 uppercase tracking-[0.2em] md:tracking-[0.35em]">
                {optionalMemberNote
                  ? optionalMemberNote
                  : `${pLabel}s 1-${requiredMemberCount} are mandatory. ${pLabel}s ${
                      requiredMemberCount + 1
                    }-${teamSize} are optional.`}
              </p>
            )}
            {Array.from({ length: teamSize }).map((_, idx) => (
              <div key={idx} className="space-y-6 md:space-y-8 animate-reveal" style={{ animationDelay: `${idx * 0.1}s` }}>
                <div className="flex items-center gap-4 md:gap-6">
                  <span className="mono text-[9px] md:text-[11px] text-white bg-indigo-500 px-2 md:px-3 py-1 rounded-md font-black whitespace-nowrap">
                    {pLabel.toUpperCase()}_0{idx + 1}
                    {idx >= requiredMemberCount
                      ? substituteFormat
                        ? '_SUBSTITUTE'
                        : '_OPTIONAL'
                      : ''}
                  </span>
                  <div className="h-px flex-grow bg-white/5"></div>
                </div>
                
                <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                  <FormField
                    label={`${pLabel} Name`}
                    value={members[idx].name}
                    onChange={v => handleMemberChange(idx, 'name', v)}
                    placeholder={`Enter ${pLabel.toLowerCase()} name`}
                  />
                  <FormField
                    label="Roll No"
                    value={members[idx].rollNumber}
                    onChange={v => handleMemberChange(idx, 'rollNumber', v)}
                    placeholder="12-digit roll number"
                  />
                  <FormField
                    label="Section"
                    value={members[idx].section}
                    onChange={v => handleMemberChange(idx, 'section', v)}
                    placeholder="E.g. A3 or CSE 1"
                  />
                  <div className="space-y-1 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] uppercase text-zinc-300 mono font-bold tracking-widest">Year</label>
                    <div
                      className={`rounded-lg border px-3 py-2 md:py-3 text-sm md:text-base font-black uppercase tracking-[0.12em] ${
                        members[idx].year === 'INVALID'
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300'
                          : members[idx].year === '...'
                            ? 'border-white/15 bg-white/[0.03] text-zinc-300'
                            : 'border-indigo-500/40 bg-indigo-500/10 text-indigo-200'
                      }`}
                    >
                      {members[idx].year}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-6 md:pt-10 flex flex-col md:flex-row gap-4 md:gap-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-grow py-5 md:py-7 font-black text-xs md:text-sm uppercase tracking-[0.2em] md:tracking-[0.5em] rounded-xl md:rounded-[2rem] transition-all shadow-xl flex items-center justify-center gap-4 md:gap-6 ${
                isSubmitting
                  ? 'bg-indigo-500 text-white cursor-not-allowed'
                  : 'bg-white text-black hover:bg-indigo-500 hover:text-white active:scale-95'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="w-4 h-4 md:w-5 md:h-5 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <circle cx="12" cy="12" r="9" strokeOpacity="0.35" />
                    <path d="M21 12a9 9 0 0 0-9-9" />
                  </svg>
                  Processing Registration...
                </>
              ) : (
                <>
                  Register for Event
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="md:w-[20px] md:h-[20px]"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className={`px-6 md:px-12 py-5 md:py-7 border border-white/10 font-bold text-[10px] md:text-xs uppercase tracking-widest rounded-xl md:rounded-[2rem] transition-all ${
                isSubmitting
                  ? 'text-zinc-700 cursor-not-allowed'
                  : 'text-zinc-500 hover:bg-white/5 hover:text-white'
              }`}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const FormField: React.FC<{ label: string; placeholder?: string; value: string; onChange: (v: string) => void }> = ({ label, placeholder, value, onChange }) => (
  <div className="space-y-1 md:space-y-3">
    <label className="text-[9px] md:text-[10px] uppercase text-zinc-300 mono font-bold tracking-widest">{label}</label>
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-transparent border-b border-white/20 py-2 md:py-3 text-base md:text-base text-white focus:border-indigo-400 focus:outline-none transition-all placeholder:text-zinc-500 placeholder:opacity-100 font-semibold"
    />
  </div>
);

export default RegistrationForm;
