import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hostel } from './entities/hostel.entity';

export interface CreateHostelDto {
  businessId: string;
  name: string;
  isActive?: boolean;
}

export interface SyncHostelDataDto {
  businessId: string;
  name: string;
  isActive?: boolean;
}

@Injectable()
export class HostelService {
  private readonly logger = new Logger(HostelService.name);
  private readonly hostelCache = new Map<string, Hostel>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(Hostel)
    private hostelRepository: Repository<Hostel>,
  ) {}

  /**
   * Find hostel by businessId with caching
   */
  async findByBusinessId(businessId: string): Promise<Hostel | null> {
    this.logger.debug(`Finding hostel by businessId: ${businessId}`);

    // Check cache first
    const cacheKey = `hostel_${businessId}`;
    const cached = this.hostelCache.get(cacheKey);
    if (cached && (Date.now() - cached['_cacheTime']) < this.CACHE_TTL) {
      this.logger.debug(`Returning cached hostel for businessId: ${businessId}`);
      return cached;
    }

    try {
      const hostel = await this.hostelRepository.findOne({
        where: { businessId, isActive: true }
      });

      if (hostel) {
        // Cache the result
        hostel['_cacheTime'] = Date.now();
        this.hostelCache.set(cacheKey, hostel);
        this.logger.debug(`Hostel found and cached for businessId: ${businessId}`);
      } else {
        this.logger.debug(`No hostel found for businessId: ${businessId}`);
      }

      return hostel;
    } catch (error) {
      this.logger.error(`Error finding hostel by businessId ${businessId}:`, error);
      throw error;
    }
  }

  /**
   * Create a new hostel
   */
  async createHostel(createHostelDto: CreateHostelDto): Promise<Hostel> {
    this.logger.log(`Creating hostel for businessId: ${createHostelDto.businessId}`);

    try {
      // Check if hostel already exists
      const existingHostel = await this.hostelRepository.findOne({
        where: { businessId: createHostelDto.businessId }
      });

      if (existingHostel) {
        this.logger.warn(`Hostel already exists for businessId: ${createHostelDto.businessId}`);
        throw new ConflictException(`Hostel already exists for businessId: ${createHostelDto.businessId}`);
      }

      const hostel = this.hostelRepository.create({
        businessId: createHostelDto.businessId,
        name: createHostelDto.name,
        isActive: createHostelDto.isActive ?? true
      });

      const savedHostel = await this.hostelRepository.save(hostel);

      // Clear cache for this businessId
      this.clearHostelCache(createHostelDto.businessId);

      this.logger.log(`Hostel created successfully for businessId: ${createHostelDto.businessId}`);
      return savedHostel;
    } catch (error) {
      this.logger.error(`Error creating hostel for businessId ${createHostelDto.businessId}:`, error);
      throw error;
    }
  }

  /**
   * Sync hostel data (create or update)
   */
  async syncHostelData(syncData: SyncHostelDataDto): Promise<Hostel> {
    this.logger.log(`Syncing hostel data for businessId: ${syncData.businessId}`);

    try {
      const existingHostel = await this.hostelRepository.findOne({
        where: { businessId: syncData.businessId }
      });

      if (existingHostel) {
        // Update existing hostel
        await this.hostelRepository.update(existingHostel.id, {
          name: syncData.name,
          isActive: syncData.isActive ?? existingHostel.isActive
        });

        const updatedHostel = await this.hostelRepository.findOne({
          where: { id: existingHostel.id }
        });

        // Clear cache
        this.clearHostelCache(syncData.businessId);

        this.logger.log(`Hostel updated for businessId: ${syncData.businessId}`);
        return updatedHostel;
      } else {
        // Create new hostel
        return await this.createHostel(syncData);
      }
    } catch (error) {
      this.logger.error(`Error syncing hostel data for businessId ${syncData.businessId}:`, error);
      throw error;
    }
  }

  /**
   * Auto-create hostel fallback mechanism for unknown businessId from JWT tokens
   */
  async ensureHostelExists(businessId: string, defaultName?: string): Promise<Hostel> {
    this.logger.debug(`Ensuring hostel exists for businessId: ${businessId}`);

    try {
      let hostel = await this.findByBusinessId(businessId);

      if (!hostel) {
        this.logger.log(`Auto-creating hostel for unknown businessId: ${businessId}`);
        
        // Auto-create hostel with incremental test name pattern
        const hostelName = defaultName || await this.generateTestHostelName();
        
        hostel = await this.createHostel({
          businessId,
          name: hostelName,
          isActive: true
        });

        this.logger.log(`Auto-created hostel: ${hostel.name} for businessId: ${businessId}`);
      }

      return hostel;
    } catch (error) {
      if (error instanceof ConflictException) {
        // Race condition - hostel was created by another request
        return await this.findByBusinessId(businessId);
      }
      throw error;
    }
  }

  /**
   * Generate incremental test hostel names: test-1, test-2, test-3, etc.
   */
  private async generateTestHostelName(): Promise<string> {
    try {
      // Find all hostels with names starting with "test-"
      const testHostels = await this.hostelRepository
        .createQueryBuilder('hostel')
        .where('hostel.name LIKE :pattern', { pattern: 'test-%' })
        .getMany();

      // Extract numbers from existing test hostels
      const existingNumbers = testHostels
        .map(hostel => {
          const match = hostel.name.match(/^test-(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(num => num > 0);

      // Find the next available number
      let nextNumber = 1;
      while (existingNumbers.includes(nextNumber)) {
        nextNumber++;
      }

      return `test-${nextNumber}`;
    } catch (error) {
      this.logger.error('Error generating test hostel name:', error);
      // Fallback to timestamp-based name
      return `test-${Date.now()}`;
    }
  }

  /**
   * Validate hostel exists and is active
   */
  async validateHostel(businessId: string): Promise<boolean> {
    try {
      const hostel = await this.findByBusinessId(businessId);
      return hostel !== null && hostel.isActive;
    } catch (error) {
      this.logger.error(`Error validating hostel for businessId ${businessId}:`, error);
      return false;
    }
  }

  /**
   * Get all hostels (for admin purposes)
   */
  async findAll(): Promise<Hostel[]> {
    try {
      return await this.hostelRepository.find({
        where: { isActive: true },
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      this.logger.error('Error finding all hostels:', error);
      throw error;
    }
  }

  /**
   * Clear hostel cache
   */
  private clearHostelCache(businessId: string): void {
    const cacheKey = `hostel_${businessId}`;
    this.hostelCache.delete(cacheKey);
    this.logger.debug(`Cleared cache for businessId: ${businessId}`);
  }

  /**
   * Clear all hostel cache (for maintenance)
   */
  clearAllCache(): void {
    this.hostelCache.clear();
    this.logger.log('Cleared all hostel cache');
  }
}