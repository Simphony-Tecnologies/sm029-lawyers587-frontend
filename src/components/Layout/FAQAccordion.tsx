import { useState } from 'react';

const faqData = [
  {
    question: 'What is Lorem Ipsum?',
    answer:
      'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
  },
  {
    question: 'Why do we use it?',
    answer:
      'It is a long established fact that a reader will be distracted by the readable content of a page when looking at its layout.',
  },
  {
    question: 'Where does it come from?',
    answer:
      'Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC.',
  },
  {
    question: 'Where can I get some?',
    answer:
      'There are many variations of passages of Lorem Ipsum available, but the majority have suffered alteration in some form.',
  },
  {
    question: 'What is the standard chunk?',
    answer:
      'The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form.',
  },
];

const FAQAccordion = () => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleAccordion = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className='max-w-2xl mx-auto '>
      {faqData.map((faq, index) => (
        <div key={index} className=''>
          <button
            className='w-full text-left  p-2 rounded-lg shadow-md focus:outline-none'
            onClick={() => toggleAccordion(index)}
          >
            <div className='flex justify-between items-center'>
              <span className=' font-medium'>{faq.question}</span>
              <svg
                className={`w-5 h-5 transform transition-transform duration-300 ${
                  activeIndex === index ? 'rotate-180' : ''
                }`}
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
                xmlns='http://www.w3.org/2000/svg'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 9l-7 7-7-7'
                />
              </svg>
            </div>
          </button>
          {activeIndex === index && (
            <div className='bg-white p-4 mt-2 rounded-lg shadow-md'>
              <p className='text-gray-700'>{faq.answer}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default FAQAccordion;
