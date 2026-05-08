import React from 'react';
import { CalendarDays, Heart, MapPin } from 'lucide-react';

interface EventPreviewCardProps {
  form: {
    title: string;
    date_start: string;
    date_end: string;
    vanues_id: string;
    status?: number;
  };
  imagePreview: string | null;
  venues: { id: number; title: string }[] | undefined;
}

function formatDateRange(start: string, end: string) {
  if (!start) return 'No Date';
  
  const options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  };

  const startDate = new Date(start);
  const formattedStart = startDate.toLocaleDateString('id-ID', options);

  if (!end) return formattedStart;

  const endDate = new Date(end);
  const formattedEnd = endDate.toLocaleDateString('id-ID', options);

  if (formattedStart === formattedEnd) return formattedStart;
  return `${formattedStart} - ${formattedEnd}`;
}

export default function EventPreviewCard({ form, imagePreview, venues }: EventPreviewCardProps) {
  // Try to find the selected venue
  const selectedVenue = venues?.find((v) => v.id.toString() === form.vanues_id);
  const venueName = selectedVenue ? selectedVenue.title : 'Select Venue...';

  // Status badge logic
  const isOngoing = form.status === 1;
  const isUpcoming = form.status === 2 || !form.status;

  return (
    <div className="relative shrink-0 snap-center rounded-[22px] overflow-hidden bg-slate-900 border border-white/5 w-64 aspect-[55/74] shadow-2xl">
      {/* Background Image */}
      {imagePreview ? (
        <img
          src={imagePreview}
          alt={form.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
          <span className="text-slate-500 text-5xl font-bold">
            {form.title?.slice(0, 2).toUpperCase() || '?'}
          </span>
        </div>
      )}

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

      {/* Top Actions */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between z-10">
        {isOngoing ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-medium text-emerald-300 uppercase tracking-wider">
              On Going
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-[10px] font-medium text-blue-300 uppercase tracking-wider">
              Upcoming
            </span>
          </div>
        )}

        <button className="w-9 h-9 rounded-full bg-black/20 border border-white/10 flex items-center justify-center backdrop-blur-md">
          <Heart size={18} className="text-white" strokeWidth={1.5} />
        </button>
      </div>

      {/* Bottom Content */}
      <div className="absolute bottom-0 left-0 right-0 p-5 gap-3 flex flex-col z-10">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2 leading-tight line-clamp-2 drop-shadow-md">
            {form.title || 'Event Title'}
          </h3>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-slate-300 drop-shadow-md">
              <MapPin size={14} className="text-slate-400" strokeWidth={1.5} />
              <p className="text-xs line-clamp-1">{venueName}</p>
            </div>

            <div className="flex items-center gap-2 text-slate-300 drop-shadow-md">
              <CalendarDays size={14} className="text-slate-400" strokeWidth={1.5} />
              <p className="text-xs">{formatDateRange(form.date_start, form.date_end)}</p>
            </div>
          </div>
        </div>

        {/* Dummy Followers for Preview */}
        <div className="flex items-center mt-1">
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full border border-slate-900 bg-indigo-500" />
            <div className="w-6 h-6 rounded-full border border-slate-900 bg-violet-500" />
            <div className="w-6 h-6 rounded-full border border-slate-900 bg-fuchsia-500" />
          </div>
          <span className="text-[10px] text-white/80 ml-2 drop-shadow-md">
            • 0 followers
          </span>
        </div>
      </div>
    </div>
  );
}
