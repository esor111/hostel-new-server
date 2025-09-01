import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MaintenanceRequest, MaintenanceStatus } from './entities/maintenance-request.entity';
import { CreateMaintenanceRequestDto, UpdateMaintenanceRequestDto } from './dto/maintenance-request.dto';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceRequest)
    private maintenanceRepository: Repository<MaintenanceRequest>,
  ) {}

  async getAllRequests(filters: {
    status?: string;
    priority?: string;
    type?: string;
    roomId?: string;
  }): Promise<MaintenanceRequest[]> {
    const query = this.maintenanceRepository.createQueryBuilder('maintenance');

    if (filters.status) {
      query.andWhere('maintenance.status = :status', { status: filters.status });
    }
    if (filters.priority) {
      query.andWhere('maintenance.priority = :priority', { priority: filters.priority });
    }
    if (filters.type) {
      query.andWhere('maintenance.type = :type', { type: filters.type });
    }
    if (filters.roomId) {
      query.andWhere('maintenance.roomId = :roomId', { roomId: filters.roomId });
    }

    return await query.orderBy('maintenance.reportedAt', 'DESC').getMany();
  }

  async getStats() {
    const totalRequests = await this.maintenanceRepository.count();
    const pendingRequests = await this.maintenanceRepository.count({
      where: { status: MaintenanceStatus.PENDING }
    });
    const inProgressRequests = await this.maintenanceRepository.count({
      where: { status: MaintenanceStatus.IN_PROGRESS }
    });
    const completedRequests = await this.maintenanceRepository.count({
      where: { status: MaintenanceStatus.COMPLETED }
    });

    const totalCostResult = await this.maintenanceRepository
      .createQueryBuilder('maintenance')
      .select('SUM(maintenance.cost)', 'totalCost')
      .where('maintenance.status = :status', { status: MaintenanceStatus.COMPLETED })
      .getRawOne();

    return {
      totalRequests,
      pendingRequests,
      inProgressRequests,
      completedRequests,
      totalCost: parseFloat(totalCostResult.totalCost) || 0
    };
  }

  async getRequestById(id: string): Promise<MaintenanceRequest> {
    const request = await this.maintenanceRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Maintenance request with ID ${id} not found`);
    }
    return request;
  }

  async createRequest(createRequestDto: CreateMaintenanceRequestDto): Promise<MaintenanceRequest> {
    const request = this.maintenanceRepository.create({
      ...createRequestDto,
      reportedAt: new Date()
    });
    return await this.maintenanceRepository.save(request);
  }

  async updateRequest(id: string, updateRequestDto: UpdateMaintenanceRequestDto): Promise<MaintenanceRequest> {
    const request = await this.getRequestById(id);
    Object.assign(request, updateRequestDto);
    return await this.maintenanceRepository.save(request);
  }

  async assignRequest(id: string, assignedTo: string, scheduledAt?: Date): Promise<MaintenanceRequest> {
    const request = await this.getRequestById(id);
    request.assignedTo = assignedTo;
    request.status = MaintenanceStatus.IN_PROGRESS;
    if (scheduledAt) {
      request.scheduledAt = scheduledAt;
    }
    return await this.maintenanceRepository.save(request);
  }

  async completeRequest(id: string, cost?: number, notes?: string): Promise<MaintenanceRequest> {
    const request = await this.getRequestById(id);
    request.status = MaintenanceStatus.COMPLETED;
    request.completedAt = new Date();
    if (cost !== undefined) {
      request.cost = cost;
    }
    if (notes) {
      request.notes = notes;
    }
    return await this.maintenanceRepository.save(request);
  }

  async deleteRequest(id: string): Promise<void> {
    const result = await this.maintenanceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Maintenance request with ID ${id} not found`);
    }
  }
}