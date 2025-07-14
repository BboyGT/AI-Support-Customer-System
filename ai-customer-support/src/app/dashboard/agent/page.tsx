'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/authStore';
import TicketCard, { Ticket } from '@/components/TicketCard';
import ChatBox from '@/components/ChatBox';

import { tickets as ticketService } from '@/services/ticket';
import { useEffect } from 'react';

export default function AgentDashboard() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAssignedTickets = async () => {
      try {
        const data = await ticketService.getAssigned();
        setTickets(data);
      } catch (err: any) {
        const message = err.response?.data?.message || err.message || 'Failed to fetch assigned tickets';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.role === 'agent') {
      fetchAssignedTickets();
    }
  }, [user]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const handleEscalate = (ticketId: string) => {
    console.log('Escalating ticket:', ticketId);
    // In a real app, this would make an API call to escalate the ticket
  };

  if (!user || user.role !== 'agent') {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <p className="text-gray-500">Access denied. This page is only for support agents.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Agent Dashboard
          </h2>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-gray-900">Assigned Tickets</h3>
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-lg text-red-700">{error}</div>
          ) : tickets.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
              No tickets assigned yet.
            </div>
          ) : tickets.map((ticket) => (
            <div
              key={ticket._id}
              onClick={() => setSelectedTicket(ticket)}
              className="cursor-pointer"
            >
              <TicketCard
                ticket={ticket}
                showActions
                onEscalate={handleEscalate}
              />
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {selectedTicket ? 'Ticket Conversation' : 'Select a ticket to view the conversation'}
          </h3>
          {selectedTicket ? (
            <ChatBox
              ticketId={selectedTicket._id}
              chatId={selectedTicket.chatId}
              initialMessages={[{
                id: 'initial',
                content: selectedTicket.description,
                sender: 'user',
                messageType: 'text',
                timestamp: selectedTicket.createdAt,
                chatId: selectedTicket._id
              }]}
              onClose={() => setSelectedTicket(null)}
            />
          ) : (
            <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
              Click on a ticket to view and respond to the conversation
            </div>
          )}
        </div>
      </div>
    </div>
  );
}