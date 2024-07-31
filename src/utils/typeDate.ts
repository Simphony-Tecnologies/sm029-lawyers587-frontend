import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isToday);
dayjs.extend(isYesterday);

export const formatLastUpdate = (date: any) => {
  if (date === 'today') {
    return 'Last update - Today';
  }
  const localDate = dayjs.utc(date).local();

  let dayString;
  if (localDate.isToday()) {
    dayString = 'Today';
  } else if (localDate.isYesterday()) {
    dayString = 'Yesterday';
  } else {
    dayString = localDate.format('DD/MM/YYYY');
  }

  return `Last update - ${dayString} ${localDate.format('HH:mm')}`;
};
