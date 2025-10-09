import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Hostel } from './entities/hostel.entity';
import { BusinessIntegrationService, BusinessData } from './services/business-integration.service';

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

  constructor(
    @InjectRepository(Hostel)
    private hostelRepository: Repository<Hostel>,
    private businessIntegrationService: BusinessIntegrationService,
  ) {}

  /**
   * Find hostel by businessId
   */
  async findByBusinessId(businessId: string): Promise<Hostel | null> {
    this.logger.debug(`Finding hostel by businessId: ${businessId}`);

    try {
      const hostel = await this.hostelRepository.findOne({
        where: { businessId, isActive: true }
      });

      if (hostel) {
        this.logger.debug(`Hostel found for businessId: ${businessId}`);
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
   * Find hostel by hostelId (internal ID) to get businessId
   */
  async findByHostelId(hostelId: string): Promise<Hostel | null> {
    this.logger.debug(`Finding hostel by hostelId: ${hostelId}`);

    try {
      const hostel = await this.hostelRepository.findOne({
        where: { id: hostelId, isActive: true }
      });

      if (hostel) {
        this.logger.debug(`Hostel found for hostelId: ${hostelId}, businessId: ${hostel.businessId}`);
      } else {
        this.logger.debug(`No hostel found for hostelId: ${hostelId}`);
      }

      return hostel;
    } catch (error) {
      this.logger.error(`Error finding hostel by hostelId ${hostelId}:`, error);
      throw error;
    }
  }

  /**
   * Get businessId from hostelId
   */
  async getBusinessIdFromHostelId(hostelId: string): Promise<string | null> {
    this.logger.debug(`Getting businessId for hostelId: ${hostelId}`);

    try {
      const hostel = await this.findByHostelId(hostelId);
      return hostel ? hostel.businessId : null;
    } catch (error) {
      this.logger.error(`Error getting businessId for hostelId ${hostelId}:`, error);
      return null;
    }
  }

  /**
   * Enhance single hostel with business data from kaha-main-v3
   */
  async enhanceHostelWithBusinessData(hostel: Hostel): Promise<any> {
    try {
      const businessData = await this.businessIntegrationService.getBusinessData(hostel.businessId);
      
      if (businessData) {
        return {
          id: hostel.id,
          businessId: hostel.businessId,
          name: businessData.name, // Use business name instead of hostel name
          avatar: businessData.avatar,
          address: businessData.address,
          kahaId: businessData.kahaId,
          isActive: hostel.isActive,
          createdAt: hostel.createdAt,
          updatedAt: hostel.updatedAt,
          // Keep original hostel name as fallback
          _originalHostelName: hostel.name
        };
      }

      // Fallback to original hostel data if business data not available
      return {
        id: hostel.id,
        businessId: hostel.businessId,
        name: hostel.name,
        isActive: hostel.isActive,
        createdAt: hostel.createdAt,
        updatedAt: hostel.updatedAt
      };
    } catch (error) {
      this.logger.error(`Error enhancing hostel ${hostel.id} with business data:`, error);
      
      // Return original hostel data on error
      return {
        id: hostel.id,
        businessId: hostel.businessId,
        name: hostel.name,
        isActive: hostel.isActive,
        createdAt: hostel.createdAt,
        updatedAt: hostel.updatedAt
      };
    }
  }

  /**
   * Enhance multiple hostels with business data from kaha-main-v3
   */
  async enhanceHostelsWithBusinessData(hostels: Hostel[]): Promise<any[]> {
    if (!hostels || hostels.length === 0) {
      return [];
    }

    try {
      // Get all business IDs
      const businessIds = hostels.map(hostel => hostel.businessId);
      
      // Fetch business data in bulk
      const businessDataMap = await this.businessIntegrationService.getBulkBusinessData(businessIds);
      
      // Enhance each hostel with business data
      return hostels.map(hostel => {
        const businessData = businessDataMap.get(hostel.businessId);
        
        if (businessData) {
          return {
            id: hostel.id,
            businessId: hostel.businessId,
            name: businessData.name, // Use business name instead of hostel name
            avatar: businessData.avatar,
            address: businessData.address,
            kahaId: businessData.kahaId,
            isActive: hostel.isActive,
            createdAt: hostel.createdAt,
            updatedAt: hostel.updatedAt,
            // Keep original hostel name as fallback
            _originalHostelName: hostel.name
          };
        }

        // Fallback to original hostel data if business data not available
        return {
          id: hostel.id,
          businessId: hostel.businessId,
          name: hostel.name,
          isActive: hostel.isActive,
          createdAt: hostel.createdAt,
          updatedAt: hostel.updatedAt
        };
      });
    } catch (error) {
      this.logger.error('Error enhancing hostels with business data:', error);
      
      // Return original hostel data on error
      return hostels.map(hostel => ({
        id: hostel.id,
        businessId: hostel.businessId,
        name: hostel.name,
        isActive: hostel.isActive,
        createdAt: hostel.createdAt,
        updatedAt: hostel.updatedAt
      }));
    }
  }

  /**
   * Get all hostels with enhanced business data
   */
  async findAllWithBusinessData(): Promise<any[]> {
    try {
      const hostels = await this.findAll();
      return await this.enhanceHostelsWithBusinessData(hostels);
    } catch (error) {
      this.logger.error('Error finding all hostels with business data:', error);
      throw error;
    }
  }

  /**
   * Find hostel by businessId with enhanced business data
   */
  async findByBusinessIdWithBusinessData(businessId: string): Promise<any | null> {
    try {
      const hostel = await this.findByBusinessId(businessId);
      if (!hostel) {
        return null;
      }
      return await this.enhanceHostelWithBusinessData(hostel);
    } catch (error) {
      this.logger.error(`Error finding hostel by businessId ${businessId} with business data:`, error);
      throw error;
    }
  }
}