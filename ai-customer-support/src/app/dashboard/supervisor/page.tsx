'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/authStore';
import TicketCard, { Ticket } from '@/components/TicketCard';
import ChatBox from '@/components/ChatBox';
import AssignAgentModal from '@/components/assignAgentModal';

import { tickets as ticketService } from '@/services/ticket';
import { users } from '@/services/api';
import { useEffect } from 'react';

interface Agent {
  _id: string;
  email: string;
  name: string;
  activeTickets: number;
}

export default function SupervisorDashboard() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [ticketToAssign, setTicketToAssign] = useState<string | null>(null);
 // const [agentName, setAgentName] =useState('');


  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [ticketsData, agentsData] = await Promise.allSettled([
          ticketService.getAll(),
          users.getOnlineAgents()
        ]);
        // setTickets(ticketsData);
        // setAgents(agentsData);
        if (ticketsData.status === 'fulfilled') setTickets(ticketsData.value);
        if (agentsData.status === 'fulfilled') setAgents(agentsData.value);
        //console.log("tickets", tickets);
        console.log("agent", agents);
        if (agentsData.status === 'rejected') {
          console.warn('Metrics fetch failed:', agentsData.reason);
        }
      } catch (err: any) {
        const message = err.response?.data?.message || err.message || 'Failed to fetch assigned tickets';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    if (user?.role === 'supervisor') {
      fetchDashboardData();
    }
  }, [user]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  console.log(selectedTicket)

  // const handleAssign = (ticketId: string) => {
  //   console.log('Assigning ticket:', ticketId);
  //   // In a real app, this would open a modal to select an agent
  // };

  const handleAssign = (ticketId: string) => {
    console.log('Opening assign modal for ticket:', ticketId);
    setTicketToAssign(ticketId);
    setIsModalOpen(true);
  };

  const assignAgentToTicket = async (agentId: string, ticketId: string) => {
    console.log('Assigning agent:', agentId, 'to ticket:', ticketId);
    if (!ticketId) return;

    try {
     await ticketService.assignAgent(ticketId, agentId);
      // Optional: refresh tickets here
      // Refetch tickets after assignment
      const updatedTickets = await ticketService.getAll();
      console.log('Triggered assignAgentToTicket for agentId:', agentId, 'ticketId:', ticketId);
      setTickets(updatedTickets);
    } catch (err) {
      console.error('Failed to assign agent:', err);
    } finally {
      setTicketToAssign(null);
    }
  };
  if (!user || user.role !== 'supervisor') {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <p className="text-gray-500">Access denied. This page is only for supervisors.</p>
      </div>
    );
  }

  console.log("all tickets", tickets);
  console.log("all agents", agents);

  // useEffect(() => {
  //   const fetchName = async () => {
  //     if (!ticketToAssign) return;
  //     try{
  //       const agentName = await ticketService.getAgentNameandEmail(ticketToAssign);
  //       console.log('Agent Name:', agentName);
  //       setAgentName(agentName); 
  //     } catch (error){
  //       console.error('Failed to assign agent:', error);
  //     }
  //   }

  //   fetchName()
  // }, [])
  

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            Supervisor Dashboard
          </h2>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Ticket Overview</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-indigo-50 p-4 rounded-lg">
                <p className="text-sm text-indigo-600">Total Tickets</p>
                <p className="text-2xl font-bold text-indigo-900">{tickets.length}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-600">Open</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {tickets.filter(t => t.status === 'open').length}
                </p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-600">Escalated</p>
                <p className="text-2xl font-bold text-red-900">
                  {tickets.filter(t => t.status === 'escalated').length}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-green-600">Resolved</p>
                <p className="text-2xl font-bold text-green-900">
                  {tickets.filter(t => t.status === 'resolved').length}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Recent Tickets</h3>
            {isLoading ? (
              <div className="text-center py-4">
                <p className="text-gray-500">Loading tickets...</p>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-red-500">{error}</p>
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
                  onAssign={handleAssign}
                />
                {ticket.assignedAgent && (
                  <p className="text-sm text-green-600 font-medium ml-2">
                    Assigned to {ticket.assignedAgent.name}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Agent Overview</h3>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Loading agent data...</p>
                </div>
              ) : error ? (
                <div className="text-center py-4">
                  <p className="text-red-500">{error}</p>
                </div>
              ) : agents.map((agent) => (
                <div key={agent._id} className="border-b pb-4 last:border-0 last:pb-0">
                  <p className="font-medium text-gray-900">{agent.name}</p>
                  <p className="text-sm text-gray-500">{agent.email}</p>
                  <p className="text-sm text-indigo-600">
                    {agent.activeTickets} active tickets
                  </p>
                </div>
              ))}
            </div>
          </div>

          <AssignAgentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onAssign={assignAgentToTicket}
            agents={agents}
            ticketId={ticketToAssign || ''}
          />

          {selectedTicket && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Ticket Conversation</h3>
              <ChatBox
                ticketId={selectedTicket._id}
                chatId={selectedTicket.chatId}
                initialMessages={[{
                  id: 'initial',
                  content: selectedTicket.description,
                  sender: 'user',
                  timestamp: selectedTicket.createdAt,
                  messageType: 'text',
                  chatId: selectedTicket.chatId || selectedTicket._id
                }]}
                onClose={() => setSelectedTicket(null)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}