export const formatCurrency = (amount: any): string => {
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  const safeAmount = isNaN(numeric) ? 0 : Math.round(numeric);

  try {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(safeAmount);
  } catch (e) {
    return `${safeAmount.toLocaleString('vi-VN')} đ`;
  }
};

export const formatDate = (dateString?: string | Date | null): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (e) {
    return '';
  }
};

export const formatShortDate = (dateString?: string | Date | null): string => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return `${date.getDate()}/${date.getMonth() + 1}`;
  } catch (e) {
    return '';
  }
};

export const formatPosHeader = (date: Date = new Date()): string => {
  try {
    return new Intl.DateTimeFormat('vi-VN', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (e) {
    return '';
  }
};