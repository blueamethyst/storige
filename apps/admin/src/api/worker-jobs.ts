import { axiosInstance } from '../lib/axios';
import { WorkerJob, WorkerJobStatus, WorkerJobType } from '@storige/types';

export const workerJobsApi = {
  getAll: async (status?: WorkerJobStatus, jobType?: WorkerJobType): Promise<WorkerJob[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (jobType) params.append('jobType', jobType);

    const response = await axiosInstance.get<WorkerJob[]>(
      `/worker-jobs?${params.toString()}`
    );
    return response.data;
  },

  getById: async (id: string): Promise<WorkerJob> => {
    const response = await axiosInstance.get<WorkerJob>(`/worker-jobs/${id}`);
    return response.data;
  },

  getStats: async (): Promise<any> => {
    const response = await axiosInstance.get('/worker-jobs/stats');
    return response.data;
  },
};
