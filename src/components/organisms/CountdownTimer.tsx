import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(localizedFormat);
dayjs.extend(timezone);
dayjs.extend(utc);

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface CountdownTimerProps {
  targetDate: string;
}

const CountdownTimer: React.FC<CountdownTimerProps> = ({ targetDate }) => {
  const add48Hours = (date: string): dayjs.Dayjs => {
    return dayjs(date).add(48, 'hour');
  };

  const calculateTimeLeft = (): TimeLeft => {
    const finalDate = add48Hours(targetDate);
    const now = dayjs();
    const difference = finalDate.diff(now);
    let timeLeft: TimeLeft = { days: 0, hours: 0, minutes: 0, seconds: 0 };

    if (difference > 0) {
      timeLeft = {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetDate]);

  return (
    <div className='flex flex-col items-center justify-center p-2 text-center  text-primary rounded-lg shadow-md'>
      <h2 className='font-bold text-sm'>Countdown to lead expiration</h2>
      <div className='flex space-x-4 font-mono'>
        <div className='flex text-sm flex-col items-center'>
          <span className=''>{timeLeft.days || '0'}</span>
          <span>days</span>
        </div>
        <div className='flex text-sm flex-col items-center'>
          <span className=''>{timeLeft.hours || '0'}</span>
          <span>hours</span>
        </div>
        <div className='flex text-sm flex-col items-center'>
          <span className=''>{timeLeft.minutes || '0'}</span>
          <span>minutes</span>
        </div>
        <div className='flex text-sm flex-col items-center'>
          <span className=''>{timeLeft.seconds || '0'}</span>
          <span>seconds</span>
        </div>
      </div>
    </div>
  );
};

export default CountdownTimer;
