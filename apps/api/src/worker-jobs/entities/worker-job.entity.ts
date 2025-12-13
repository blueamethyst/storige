import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  BeforeInsert,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { WorkerJobType, WorkerJobStatus } from '@storige/types';

@Entity('worker_jobs')
export class WorkerJob {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column({
    name: 'job_type',
    type: 'varchar',
    length: 30,
  })
  jobType: WorkerJobType;

  @Column({
    type: 'varchar',
    length: 20,
  })
  status: WorkerJobStatus;

  @Column({ name: 'file_id', type: 'varchar', length: 36, nullable: true })
  fileId: string | null;

  @Column({ name: 'input_file_url', type: 'varchar', length: 500, nullable: true })
  inputFileUrl: string | null;

  @Column({ name: 'output_file_url', type: 'varchar', length: 500, nullable: true })
  outputFileUrl: string | null;

  @Column({ name: 'output_file_id', type: 'varchar', length: 36, nullable: true })
  outputFileId: string | null;

  @Column({ type: 'json', nullable: true })
  options: any;

  @Column({ type: 'json', nullable: true })
  result: any;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
    if (!this.status) {
      this.status = WorkerJobStatus.PENDING;
    }
  }
}
