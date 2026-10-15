/**
 * Master jam kerja standar berdasarkan hari kerja.
 * Data referensi read-only yang dapat dipakai untuk perhitungan jam kerja.
 */

export const STANDARD_WORK_HOUR_MASTER = Object.freeze([
  Object.freeze({ dayOfWeek: 1, dayName: 'Senin', workHours: 7, unit: 'Jam' }),
  Object.freeze({ dayOfWeek: 2, dayName: 'Selasa', workHours: 7, unit: 'Jam' }),
  Object.freeze({ dayOfWeek: 3, dayName: 'Rabu', workHours: 7, unit: 'Jam' }),
  Object.freeze({ dayOfWeek: 4, dayName: 'Kamis', workHours: 7, unit: 'Jam' }),
  Object.freeze({ dayOfWeek: 5, dayName: 'Jumat', workHours: 5, unit: 'Jam' }),
  Object.freeze({ dayOfWeek: 6, dayName: 'Sabtu', workHours: 7, unit: 'Jam' })
]);

export function getAllStandardWorkHours() {
  return STANDARD_WORK_HOUR_MASTER.map((item) => ({ ...item }));
}

/**
 * Mencari standar jam kerja berdasarkan nama hari (Indonesia) atau nomor hari ISO (Senin=1).
 * @param {string|number} day
 * @returns {{dayOfWeek:number, dayName:string, workHours:number, unit:string}|null}
 */
export function getStandardWorkHoursByDay(day) {
  if (typeof day === 'number' && Number.isInteger(day)) {
    const found = STANDARD_WORK_HOUR_MASTER.find((item) => item.dayOfWeek === day);
    return found ? { ...found } : null;
  }

  const normalizedDay = String(day || '').trim().toLocaleLowerCase('id-ID');
  const found = STANDARD_WORK_HOUR_MASTER.find(
    (item) => item.dayName.toLocaleLowerCase('id-ID') === normalizedDay
  );
  return found ? { ...found } : null;
}

/** Mengambil standar jam kerja untuk tanggal tertentu; Minggu tidak didefinisikan dalam master. */
export function getStandardWorkHoursForDate(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return null;
  const isoDay = value.getDay() === 0 ? 7 : value.getDay();
  return getStandardWorkHoursByDay(isoDay);
}
