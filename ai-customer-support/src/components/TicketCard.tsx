import Link from 'next/link';

export interface Ticket {
  _id: string;
  title: string;
  status: 'open' | 'in_progress' | 'resolved' | 'escalated';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  lastUpdated: string;
  description: string;
  assignedAgent?:{
    name: string;
    email: string;
    _id: string;
  } | null;
  chatId?: string;
}

interface TicketCardProps {
  ticket: Ticket;
  showActions?: boolean;
  onAssign?: (ticketId: string) => void;
  onEscalate?: (ticketId: string) => void;
}

export default function TicketCard({ ticket, showActions = false, onAssign, onEscalate }: TicketCardProps) {
  const statusColors = {
    open: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
    resolved: 'bg-green-100 text-green-800',
    escalated: 'bg-red-100 text-red-800',
  };

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-orange-100 text-orange-800',
    high: 'bg-red-100 text-red-800',
  };

  console.log('From ticket card',ticket)

  return (
    <div className="bg-white shadow rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <Link href={`/tickets/${ticket._id}`} className="text-lg font-semibold text-indigo-600 hover:text-indigo-800">
          {ticket.title}
        </Link>
        <div className="flex gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
            {ticket.status.replace('_', ' ').toUpperCase()}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[ticket.priority]}`}>
            {ticket.priority.toUpperCase()}
          </span>
        </div>
      </div>

      <p className="text-gray-600 mb-4 line-clamp-2">{ticket.description}</p>

      <div className="flex justify-between items-center text-sm text-gray-500">
        <div>
          <p>Created: {new Date(ticket.createdAt).toLocaleDateString()}</p>
          <p>Updated: {new Date(ticket.lastUpdated).toLocaleDateString()}</p>
        </div>

        {showActions && (
          <div className="flex gap-2">
            {onAssign && (
              <button
                onClick={() => onAssign(ticket._id)}
                className="px-3 py-1 text-sm text-indigo-600 hover:text-indigo-800 border border-indigo-600 rounded hover:bg-indigo-50"
              >
                Assign
              </button>
            )}
            {onEscalate && (
              <button
                onClick={() => onEscalate(ticket._id)}
                className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-600 rounded hover:bg-red-50"
              >
                Escalate
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}