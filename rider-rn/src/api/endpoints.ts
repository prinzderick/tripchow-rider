import client from './client';

export const auth = {
  login:     (phone: string, password: string) => client.post('/auth/login', { phone, password }),
  verifyOtp: (phone: string, otp: string, purpose: string) => client.post('/auth/verify-otp', { phone, otp, purpose }),
  resendOtp: (phone: string, purpose: string) => client.post('/auth/resend-otp', { phone, purpose }),
  logout:    () => client.post('/auth/logout'),
};

export const rider = {
  dashboard:      () => client.get('/rider/dashboard'),
  setOnline:      (online: boolean) => client.patch('/rider/status', { online }),
  updateLocation: (latitude: number, longitude: number) => client.patch('/rider/location', { latitude, longitude }),
  profile:        () => client.get('/rider/profile'),
  updateProfile:  (data: Record<string, any>) => client.put('/rider/profile', data),
  earnings:       () => client.get('/rider/earnings'),
  incentives:     () => client.get('/rider/incentives'),
  notifCount:     () => client.get('/notifications/unread-count'),
  incentives:     () => client.get('/rider/incentives'),
  notifCount:     () => client.get('/notifications/unread-count'),
  earningsBreakdown: (period: string) => client.get(`/rider/earnings/breakdown?period=${period}`),
  deliveries:     (page = 1, period?: string) =>
    client.get(`/rider/deliveries?page=${page}&per_page=20${period ? `&period=${period}` : ''}`),
  saveVehicle:    (data: Record<string, string>) => client.put('/rider/profile', data),
  getBankAccounts:() => client.get('/rider/bank-accounts'),
  saveBankAccount:(data: Record<string, string>) => client.post('/rider/bank-accounts', data),
  withdraw:       (amount: number, bankAccountId: string) =>
    client.post('/rider/withdrawals', { amount, bank_account_id: bankAccountId }),
  uploadDocument: (data: Record<string, string>) => client.post('/rider/documents', data),
  getDocuments:   () => client.get('/rider/documents'),
};

export const jobs = {
  available: () => client.get('/rider/jobs/available'),
  accept:    (assignmentId: string) => client.post(`/rider/jobs/${assignmentId}/accept`),
  reject:    (assignmentId: string) => client.post(`/rider/jobs/${assignmentId}/reject`),
  pickup:    (orderId: string)      => client.post(`/rider/deliveries/${orderId}/pickup`),
  deliver:   (orderId: string)      => client.post(`/rider/deliveries/${orderId}/deliver`),
};

export const wallet = {
  summary: ()          => client.get('/wallet'),
  ledger:  (page = 1)  => client.get(`/wallet/ledger?page=${page}&per_page=20`),
};

export const notifications = {
  inbox:       (page = 1) => client.get(`/notifications?per_page=50&page=${page}`),
  unreadCount: ()          => client.get('/notifications/unread-count'),
  markRead:    (id: string) => client.post(`/notifications/${id}/read`),  // backend: POST
  markAllRead: () => client.post('/notifications/read-all'),                    // backend: /read-all
  registerDevice: (deviceId: string, pushToken: string, platform: 'android' | 'ios' | 'web' = 'android') =>
    client.post('/devices/register', { device_id: deviceId, platform, push_token: pushToken }),
};

export const support = {
  create:    (subject: string, message: string) => client.post('/support/tickets', { subject, message, category: 'rider_issue' }),
  tickets:   () => client.get('/support/tickets?per_page=20'),
  getTicket: (id: string) => client.get(`/support/tickets/${id}`),
  reply:     (id: string, message: string) => client.post(`/support/tickets/${id}/reply`, { message }),
};
