import React from 'react';
import {
  ArrowLeft,
  Share2,
  Briefcase,
  Users,
  Bell,
  Calendar,
  MapPin,
  ChevronRight,
  BadgeCheck,
  ImageIcon,
  Camera,
} from 'lucide-react';

interface EventDetailPreviewProps {
  form: {
    title: string;
    description: string;
    date_start: string;
    date_end: string;
    schedule_start: string;
    schedule_end: string;
    vanues_id: string;
    event_organizers_id?: string;
  };
  imagePreview: string | null;
  venues: { id: number; title: string; city?: { name: string } }[] | undefined;
  eos?: { id: number; name: string }[] | undefined;
}

function formatDateRange(start: string, end: string) {
  if (!start) return 'No Date Selected';
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };
  const startDate = new Date(start);
  const formattedStart = startDate.toLocaleDateString('id-ID', options);
  if (!end) return formattedStart;
  const endDate = new Date(end);
  const formattedEnd = endDate.toLocaleDateString('id-ID', options);
  if (formattedStart === formattedEnd) return formattedStart;
  return `${formattedStart} - ${formattedEnd}`;
}

export default function EventDetailPreview({ form, imagePreview, venues, eos }: EventDetailPreviewProps) {
  const selectedVenue = venues?.find((v) => v.id.toString() === form.vanues_id);
  const venueName = selectedVenue ? selectedVenue.title : 'Venue Name';
  // Assume city name is 'City' for preview if not fully joined
  const cityName = 'City Name';

  const selectedEO = eos?.find((eo) => eo.id.toString() === form.event_organizers_id);
  const eoName = selectedEO ? selectedEO.name : 'Event Organizer Name';

  return (
    <div className="w-[340px] h-[680px] bg-[#09090b] rounded-[40px] border-[8px] border-slate-800 overflow-hidden relative shadow-2xl shrink-0">
      
      {/* Floating Nav */}
      <div className="absolute top-10 left-4 right-4 z-50 flex items-center justify-between">
        <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-md">
          <ArrowLeft size={22} className="text-white" />
        </div>
        <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-md">
          <Share2 size={20} className="text-white" />
        </div>
      </div>

      <div className="w-full h-full overflow-y-auto no-scrollbar pb-20">
        
        {/* HERO */}
        <div className="relative w-full aspect-[1/1.1]">
          {imagePreview ? (
            <img src={imagePreview} alt="Hero" className="w-full h-[120%] object-cover absolute top-0" />
          ) : (
            <div className="w-full h-[120%] absolute top-0 bg-slate-800 flex items-center justify-center">
              <span className="text-slate-600 text-6xl font-bold">{form.title?.slice(0, 2).toUpperCase() || '?'}</span>
            </div>
          )}

          {/* Gradient overlay matching RN */}
          <div className="absolute bottom-0 w-full h-[240px] bg-gradient-to-t from-black via-black/80 to-transparent" />

          {/* Hero Content */}
          <div className="absolute bottom-0 left-4 right-4 pb-4">
            <h1 className="text-[28px] font-bold text-white leading-tight drop-shadow-md">
              {form.title || 'Event Title'}
            </h1>

            <div className="flex items-center gap-2 mt-2">
              <Briefcase size={14} className="text-slate-400" />
              <span className="text-[13px] text-slate-300">{eoName}</span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Users size={14} className="text-slate-400" />
              <div className="flex -space-x-2 ml-1">
                <div className="w-6 h-6 rounded-full bg-indigo-500 border border-[#09090b]" />
                <div className="w-6 h-6 rounded-full bg-violet-500 border border-[#09090b]" />
                <div className="w-6 h-6 rounded-full bg-fuchsia-500 border border-[#09090b]" />
              </div>
              <span className="text-[13px] text-slate-300 ml-1">0 followers</span>
            </div>

            <button className="flex items-center gap-1.5 mt-3 px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-full self-start w-fit">
              <Bell size={15} className="text-white" strokeWidth={2} />
              <span className="text-sm font-bold text-white">Follow</span>
            </button>

            <div className="flex items-center gap-2 mt-3">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-[13px] text-slate-300">
                {formatDateRange(form.date_start, form.date_end)}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <MapPin size={14} className="text-slate-400" />
              <span className="text-[13px] text-slate-300">{venueName}, {cityName}</span>
            </div>
          </div>
        </div>

        {/* DESCRIPTION */}
        <div className="px-4 mt-7">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold text-white">About Event</h2>
          </div>
          <p className="text-slate-300 leading-5 text-sm line-clamp-4">
            {form.description || 'Event description will appear here...'}
          </p>
          <button className="mt-1">
            <span className="text-blue-500 font-semibold text-sm">See More</span>
          </button>
        </div>

        {/* OFFICIAL UPDATES DUMMY */}
        <div className="mt-7">
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-base font-semibold text-white">Official Updates</h2>
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-sm">See All</span>
              <ChevronRight size={16} />
            </div>
          </div>
          <div className="flex px-4 gap-3 overflow-hidden">
            <div className="w-[260px] bg-[#18181b] rounded-2xl p-3.5 shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-slate-800" />
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-[13px] font-semibold text-white">{eoName}</span>
                    <BadgeCheck size={13} className="text-blue-500" />
                  </div>
                  <span className="text-[11px] text-slate-500">Just now</span>
                </div>
              </div>
              <p className="text-[13px] text-slate-300 line-clamp-3">
                Welcome to the event! Stay tuned for official updates.
              </p>
            </div>
          </div>
        </div>

        {/* COMMUNITY POSTS DUMMY */}
        <div className="mt-7">
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-base font-semibold text-white">Community Posts</h2>
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-sm">See All</span>
              <ChevronRight size={16} />
            </div>
          </div>
          <div className="px-4 text-sm text-slate-500">
            No community posts yet
          </div>
        </div>

        {/* GROUPS DUMMY */}
        <div className="mt-7">
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-base font-semibold text-white">Groups</h2>
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-sm">See All</span>
              <ChevronRight size={16} />
            </div>
          </div>
          <div className="px-4 text-sm text-slate-500">
            No groups yet. Check back later!
          </div>
        </div>

        {/* MOMENTS DUMMY */}
        <div className="mt-7 mb-10">
          <div className="flex justify-between items-center px-4 mb-3">
            <h2 className="text-base font-semibold text-white">Moments</h2>
            <div className="flex items-center gap-1 text-slate-400">
              <span className="text-sm">See All</span>
              <ChevronRight size={16} />
            </div>
          </div>
          <div className="mx-4 bg-[#18181b] rounded-xl py-5 flex flex-col items-center gap-1.5">
            <Camera size={22} className="text-slate-500" />
            <span className="text-[13px] text-slate-500">No moments yet</span>
          </div>
        </div>

      </div>
      
      {/* Add custom scrollbar hiding styles inline for the preview */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
