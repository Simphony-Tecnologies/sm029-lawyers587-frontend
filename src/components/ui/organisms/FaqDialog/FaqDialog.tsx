'use client';
import { Fragment, useState } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { MdClose, MdHelpOutline, MdKeyboardArrowDown } from 'react-icons/md';
import { cn } from '@/lib/cn';

export interface FaqEntry {
  question: string;
  answer: string;
}

// FAQs reales del contexto: gestión de leads para una firma de abogados con
// roles admin y lawyer, capacity por servicio, audit log y bulk operations.
export const DEFAULT_FAQS: FaqEntry[] = [
  {
    question: 'How do I assign leads to a lawyer?',
    answer:
      'From Lead Management, pick one or more leads with the checkboxes — the bulk action bar appears at the bottom with "Assign to". Pick a lawyer from the searchable list (each entry shows the lawyer\'s services and current active leads), enter a reason, and confirm. To assign a single lead you can also open it and change its status; the assignment is reflected immediately.',
  },
  {
    question: 'Why don\'t I see a lawyer in the assign list?',
    answer:
      'The picker only shows lawyers with `is_active: true`. If a lawyer was deactivated from Lawyer Management or never completed setup (no service / max leads configured), they won\'t appear. Reactivate them or assign a service capacity from their detail page.',
  },
  {
    question: 'Why does the system ask for a reason on some status changes?',
    answer:
      'For PROBLEMATIC, SEND_BACK and LOST the backend requires a reason for the audit log. The note is stored in `audit_log.comment` and shown to super admin in the lead\'s history. Without a reason the change is rejected. For neutral statuses like IN PROGRESS or CLOSED the reason is optional.',
  },
  {
    question: 'What happens to a lead after it expires?',
    answer:
      'An ASSIGNED lead has a 48-hour freshness window. If the lawyer doesn\'t move it forward in that time, the lead becomes EXPIRED and returns to the pool — any lawyer with capacity for that service can pull it. The audit log keeps the previous assignment so the history isn\'t lost.',
  },
  {
    question: 'How do I recover an archived lead?',
    answer:
      'Archived leads are excluded from Lead Management by default. To bring them back into view, use the status chip "ARCHIVED" on the toolbar — the table will show only archived leads. From the lead modal you can change the status back to NEW or any other; archiving is reversible.',
  },
];

export interface FaqDialogProps {
  open: boolean;
  onClose: () => void;
  faqs?: FaqEntry[];
}

export const FaqDialog = ({
  open,
  onClose,
  faqs = DEFAULT_FAQS,
}: FaqDialogProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as='div' className='relative z-50' onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter='ease-out duration-150'
          enterFrom='opacity-0'
          enterTo='opacity-100'
          leave='ease-in duration-100'
          leaveFrom='opacity-100'
          leaveTo='opacity-0'
        >
          <div
            aria-hidden
            className='fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]'
          />
        </TransitionChild>

        <div className='fixed inset-0 overflow-y-auto'>
          <div className='flex min-h-full items-center justify-center p-4'>
            <TransitionChild
              as={Fragment}
              enter='ease-out duration-150'
              enterFrom='opacity-0 translate-y-2'
              enterTo='opacity-100 translate-y-0'
              leave='ease-in duration-100'
              leaveFrom='opacity-100 translate-y-0'
              leaveTo='opacity-0 translate-y-2'
            >
              <DialogPanel className='w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200'>
                <div className='flex items-start justify-between border-b border-slate-100 px-6 py-4'>
                  <div className='flex items-center gap-3'>
                    <span className='inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white'>
                      <MdHelpOutline size={18} />
                    </span>
                    <div className='flex flex-col'>
                      <DialogTitle className='text-[15px] font-extrabold tracking-[-0.015em] text-slate-900'>
                        Help &amp; FAQs
                      </DialogTitle>
                      <span className='text-[11px] font-medium text-slate-500'>
                        Common questions about the platform
                      </span>
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={onClose}
                    aria-label='Close'
                    className='inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700'
                  >
                    <MdClose size={16} />
                  </button>
                </div>

                <div className='max-h-[60vh] overflow-y-auto px-3 py-3'>
                  {faqs.map((faq, idx) => {
                    const expanded = activeIndex === idx;
                    return (
                      <div
                        key={idx}
                        className='border-b border-slate-100 last:border-b-0'
                      >
                        <button
                          type='button'
                          onClick={() =>
                            setActiveIndex(expanded ? null : idx)
                          }
                          className={cn(
                            'flex w-full items-center justify-between gap-3 rounded-md bg-transparent px-3 py-3 text-left transition-colors',
                            expanded ? 'text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                          )}
                          aria-expanded={expanded}
                        >
                          <span className='text-[13px] font-bold tracking-[-0.005em]'>
                            {faq.question}
                          </span>
                          <MdKeyboardArrowDown
                            size={16}
                            className={cn(
                              'flex-shrink-0 text-slate-400 transition-transform',
                              expanded && 'rotate-180 text-slate-700'
                            )}
                          />
                        </button>
                        {expanded ? (
                          <div className='px-3 pb-3 pt-1 text-[12px] leading-[1.6] text-slate-600'>
                            {faq.answer}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className='flex items-center justify-between border-t border-slate-100 px-6 py-3'>
                  <span className='text-[10px] font-medium text-slate-400'>
                    Need more help? Contact your super admin.
                  </span>
                  <button
                    type='button'
                    onClick={onClose}
                    className='inline-flex h-[34px] items-center rounded-[8px] border border-slate-200 bg-white px-3.5 text-[12px] font-bold tracking-[-0.005em] text-slate-700 transition-colors hover:bg-slate-50'
                  >
                    Close
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
