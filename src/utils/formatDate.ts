import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
export const formatDate = (date: Date) => {
  dayjs.extend(utc);
  return dayjs.utc(date).local().format('MM/DD/YYYY hh:mm a');
};
