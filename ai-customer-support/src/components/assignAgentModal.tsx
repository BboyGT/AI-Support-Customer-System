// components/AssignAgentModal.tsx
'use client';

import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { Fragment } from 'react';

interface Agent {
  _id: string;
  name: string;
  email: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (agentId: string, ticketId: string) => void;
  agents: Agent[];
  ticketId: string;
}

export default function AssignAgentModal({ isOpen, onClose, onAssign, agents, ticketId }: Props) { 
  console.log(agents)
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300" leave="ease-in duration-200"
          enterFrom="opacity-0" enterTo="opacity-100"
          leaveFrom="opacity-100" leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-30" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-300" leave="ease-in duration-200"
              enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
              leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle className="text-lg font-medium text-gray-900 mb-4">
                  Assign Agent to Ticket
                </DialogTitle>
                <ul className="space-y-3">
                  {agents.map(agent => (
                    <li key={agent._id} className="flex justify-between items-center border p-3 rounded">
                      <div>
                        <p className="font-semibold text-gray-900">{agent.name}</p>
                        <p className="text-sm text-gray-500">{agent.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          console.log('Assign button clicked. Agent:', agent._id, 'Ticket:', ticketId);
                          onAssign(agent._id, ticketId);
                          onClose();
                        }}
                        className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      >
                        Assign
                      </button>
                    </li>
                  ))}
                </ul>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
