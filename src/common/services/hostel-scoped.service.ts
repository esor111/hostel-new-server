import { Logger } from '@nestjs/common';
import { Repository, FindManyOptions, FindOneOptions, DeepPartial } from 'typeorm';

export interface HostelScopedEntity {
  id: string;
  hostelId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export abstract class HostelScopedService<T extends HostelScopedEntity> {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(
    protected readonly repository: Repository<T>,
    protected readonly entityName: string
  ) {}

  /**
   * Find all entities scoped to hostel
   */
  protected async findAllScoped(hostelId: string, options?: FindManyOptions<T>): Promise<T[]> {
    this.logger.debug(`Finding all ${this.entityName} for hostelId: ${hostelId}`);
    
    const findOptions: FindManyOptions<T> = {
      ...options,
      where: {
        ...options?.where,
        hostelId
      } as any
    };

    try {
      const entities = await this.repository.find(findOptions);
      this.logger.debug(`Found ${entities.length} ${this.entityName} for hostelId: ${hostelId}`);
      return entities;
    } catch (error) {
      this.logger.error(`Error finding ${this.entityName} for hostelId ${hostelId}:`, error);
      throw error;
    }
  }

  /**
   * Find one entity scoped to hostel
   */
  protected async findOneScoped(hostelId: string, options: FindOneOptions<T>): Promise<T | null> {
    this.logger.debug(`Finding ${this.entityName} for hostelId: ${hostelId}`);
    
    const findOptions: FindOneOptions<T> = {
      ...options,
      where: {
        ...options.where,
        hostelId
      } as any
    };

    try {
      const entity = await this.repository.findOne(findOptions);
      if (entity) {
        this.logger.debug(`Found ${this.entityName} ${entity.id} for hostelId: ${hostelId}`);
      } else {
        this.logger.debug(`No ${this.entityName} found for hostelId: ${hostelId}`);
      }
      return entity;
    } catch (error) {
      this.logger.error(`Error finding ${this.entityName} for hostelId ${hostelId}:`, error);
      throw error;
    }
  }

  /**
   * Create entity with hostelId automatically injected
   */
  protected async createScoped(hostelId: string, entityData: DeepPartial<T>): Promise<T> {
    this.logger.debug(`Creating ${this.entityName} for hostelId: ${hostelId}`);
    
    try {
      const entity = this.repository.create({
        ...entityData,
        hostelId
      } as DeepPartial<T>);

      const savedEntity = await this.repository.save(entity);
      this.logger.log(`Created ${this.entityName} ${savedEntity.id} for hostelId: ${hostelId}`);
      return savedEntity;
    } catch (error) {
      this.logger.error(`Error creating ${this.entityName} for hostelId ${hostelId}:`, error);
      throw error;
    }
  }

  /**
   * Update entity with hostel ownership verification
   */
  protected async updateScoped(hostelId: string, entityId: string, updateData: DeepPartial<T>): Promise<T> {
    this.logger.debug(`Updating ${this.entityName} ${entityId} for hostelId: ${hostelId}`);
    
    try {
      // Verify hostel ownership
      const existingEntity = await this.repository.findOne({
        where: { id: entityId, hostelId } as any
      });

      if (!existingEntity) {
        this.logger.error(`${this.entityName} ${entityId} not found or access denied for hostelId: ${hostelId}`);
        throw new Error(`${this.entityName} not found or access denied`);
      }

      // Perform update
      await this.repository.update(entityId, updateData as any);
      
      const updatedEntity = await this.repository.findOne({
        where: { id: entityId } as any
      });

      this.logger.log(`Updated ${this.entityName} ${entityId} for hostelId: ${hostelId}`);
      return updatedEntity;
    } catch (error) {
      this.logger.error(`Error updating ${this.entityName} ${entityId} for hostelId ${hostelId}:`, error);
      throw error;
    }
  }

  /**
   * Delete entity with hostel ownership verification
   */
  protected async deleteScoped(hostelId: string, entityId: string): Promise<void> {
    this.logger.debug(`Deleting ${this.entityName} ${entityId} for hostelId: ${hostelId}`);
    
    try {
      // Verify hostel ownership
      const existingEntity = await this.repository.findOne({
        where: { id: entityId, hostelId } as any
      });

      if (!existingEntity) {
        this.logger.error(`${this.entityName} ${entityId} not found or access denied for hostelId: ${hostelId}`);
        throw new Error(`${this.entityName} not found or access denied`);
      }

      // Perform delete
      await this.repository.delete(entityId);
      
      this.logger.log(`Deleted ${this.entityName} ${entityId} for hostelId: ${hostelId}`);
    } catch (error) {
      this.logger.error(`Error deleting ${this.entityName} ${entityId} for hostelId ${hostelId}:`, error);
      throw error;
    }
  }

  /**
   * Count entities scoped to hostel
   */
  protected async countScoped(hostelId: string, options?: FindManyOptions<T>): Promise<number> {
    this.logger.debug(`Counting ${this.entityName} for hostelId: ${hostelId}`);
    
    const findOptions: FindManyOptions<T> = {
      ...options,
      where: {
        ...options?.where,
        hostelId
      } as any
    };

    try {
      const count = await this.repository.count(findOptions);
      this.logger.debug(`Found ${count} ${this.entityName} for hostelId: ${hostelId}`);
      return count;
    } catch (error) {
      this.logger.error(`Error counting ${this.entityName} for hostelId ${hostelId}:`, error);
      throw error;
    }
  }

  /**
   * Log security violation for cross-hostel access attempts
   */
  protected logSecurityViolation(
    operation: string, 
    entityId: string, 
    requestedHostelId: string, 
    actualHostelId?: string,
    userId?: string
  ): void {
    this.logger.error(`SECURITY VIOLATION: Cross-hostel access attempt`, {
      operation,
      entityType: this.entityName,
      entityId,
      requestedHostelId,
      actualHostelId,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log successful operation
   */
  protected logOperation(
    operation: string,
    hostelId: string,
    entityId?: string,
    userId?: string,
    details?: any
  ): void {
    this.logger.log(`Hostel-scoped ${operation} on ${this.entityName}`, {
      operation,
      entityType: this.entityName,
      entityId,
      hostelId,
      userId,
      details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log failed operation
   */
  protected logFailedOperation(
    operation: string,
    hostelId: string,
    error: string,
    entityId?: string,
    userId?: string
  ): void {
    this.logger.error(`Failed hostel-scoped ${operation} on ${this.entityName}: ${error}`, {
      operation,
      entityType: this.entityName,
      entityId,
      hostelId,
      userId,
      error,
      timestamp: new Date().toISOString()
    });
  }
}