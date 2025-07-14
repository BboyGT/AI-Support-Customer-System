// 'use client';

// import { useState } from 'react';
// import { useAuthStore } from '@/store/authStore';
// import TicketCard, { Ticket } from '@/components/TicketCard';
// import ChatBox from '@/components/ChatBox';
// import Link from 'next/link';

// import { tickets as ticketService } from '@/services/ticket';
// import { useEffect } from 'react';

// export default function CustomerDashboard() {
//   const { user } = useAuthStore();
//   const [tickets, setTickets] = useState<Ticket[]>([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     const fetchTickets = async () => {
//       try {
//         const data = await ticketService.getAll();
//         setTickets(data);
//       } catch (err: any) {
//         setError(err.message || 'Failed to fetch tickets');
//       } finally {
//         setIsLoading(false);
//       }
//     };

//     if (user) {
//       fetchTickets();
//     }
//   }, [user]);
//   const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

//   if (!user) {
//     return (
//       <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
//         <p className="text-gray-500">Please log in to view your dashboard.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
//       <div className="md:flex md:items-center md:justify-between mb-8">
//         <div className="flex-1 min-w-0">
//           <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
//             My Support Tickets
//           </h2>
//         </div>
//         <div className="mt-4 flex md:mt-0 md:ml-4">
//           <Link
//             href="/tickets/new"
//             className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
//           >
//             Create New Ticket
//           </Link>
//         </div>
//       </div>

//       {isLoading ? (
//         <div className="flex justify-center items-center h-64">
//           <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
//         </div>
//       ) : error ? (
//         <div className="bg-red-50 p-4 rounded-lg text-red-700">{error}</div>
//       ) : (
//         <div className="grid md:grid-cols-2 gap-8">
//           <div className="space-y-6">
//             <h3 className="text-lg font-medium text-gray-900">Recent Tickets</h3>
//             {tickets.length === 0 ? (
//               <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
//                 No tickets found. Create a new ticket to get started.
//               </div>
//             ) : (
//               tickets.map((ticket) => (
//             <div
//               key={ticket.id}
//               onClick={() => setSelectedTicket(ticket)}
//               className="cursor-pointer"
//             >
//               <TicketCard ticket={ticket} />
//             </div>
//           ))}
//         </div>

//         <div>
//           <h3 className="text-lg font-medium text-gray-900 mb-4">
//             {selectedTicket ? 'Ticket Conversation' : 'Select a ticket to view the conversation'}
//           </h3>
//           {selectedTicket ? (
//             <ChatBox
//               ticketId={selectedTicket.id}
//               initialMessages={[{
//                 id: 'initial',
//                 content: selectedTicket.description,
//                 sender: 'user',
//                 timestamp: selectedTicket.createdAt,
//                 chatId: selectedTicket.id
//               }]}
//               onClose={() => setSelectedTicket(null)}
//             />
//           ) : (
//             <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
//               Click on a ticket to view and respond to the conversation
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/authStore';
import TicketCard, { Ticket } from '@/components/TicketCard';
import ChatBox from '@/components/ChatBox';
import Link from 'next/link';
import { tickets as ticketService } from '@/services/ticket';

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    console.log('AUTH STORE STATE:', useAuthStore.getState());
    const fetchTickets = async () => {
      try {
        const data = await ticketService.getCustomerTickets();
        setTickets(data);
      } catch (err: any) {
        const message = err.response?.data?.message || err.message || 'Failed to fetch assigned tickets';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      fetchTickets();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <p className="text-gray-500">Please log in to view your dashboard.</p>
      </div>
    );
  }

  console.log(selectedTicket?._id, selectedTicket?.chatId)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
            My Support Tickets
          </h2>
        </div>
        <div className="mt-4 flex md:mt-0 md:ml-4">
          <Link
            href="/tickets/new"
            className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Create New Ticket
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-lg text-red-700">{error}</div>
      ) : (
        // FIX: Wrap both columns in a fragment or a single parent element
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Recent Tickets</h3>
            {tickets.length === 0 ? (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                No tickets found. Create a new ticket to get started.
              </div>
            ) : (
              <>
                {tickets.map((ticket) => (
                  <div
                    key={ticket._id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="cursor-pointer"
                  >
                    <TicketCard ticket={ticket} />
                  </div>
                ))}
              </>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {selectedTicket ? 'Ticket Conversation' : 'Select a ticket to view the conversation'}
            </h3>
            {selectedTicket ? (
              <ChatBox
                ticketId={selectedTicket._id}
                chatId={selectedTicket.chatId}
                initialMessages={[
                  {
                    id: 'initial',
                    content: selectedTicket.description,
                    sender: 'user',
                    messageType: 'text',
                    timestamp: selectedTicket.createdAt,
                    chatId: selectedTicket.chatId || selectedTicket._id
                  }
                ]}
                onClose={() => setSelectedTicket(null)}
              />
            ) : (
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
                Click on a ticket to view and respond to the conversation
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}