import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface BusinessData {
  id: string;
  name: string;
  avatar?: string;
  address?: string;
  kahaId?: string;
}

export interface BulkBusinessResponse {
  businesses: BusinessData[];
  count: number;
}

@Injectable()
export class BusinessIntegrationService {
  private readonly logger = new Logger(BusinessIntegrationService.name);
  private readonly businessCache = new Map<string, BusinessData>();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private readonly kahaMainUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.kahaMainUrl = this.configService.get('KAHA_MAIN_URL', 'https://dev.kaha.com.np');
  }

  /**
   * Get business data for multiple businessIds from kaha-main-v3
   */
  async getBulkBusinessData(businessIds: string[]): Promise<Map<string, BusinessData>> {
    if (!businessIds || businessIds.length === 0) {
      return new Map();
    }

    // Check cache first
    const cachedResults = new Map<string, BusinessData>();
    const uncachedIds: string[] = [];

    for (const businessId of businessIds) {
      const cached = this.businessCache.get(businessId);
      if (cached && this.isCacheValid(cached)) {
        cachedResults.set(businessId, cached);
      } else {
        uncachedIds.push(businessId);
      }
    }

    // If all data is cached, return it
    if (uncachedIds.length === 0) {
      this.logger.debug(`All business data found in cache for ${businessIds.length} businesses`);
      return cachedResults;
    }

    try {
      this.logger.debug(`Fetching business data for ${uncachedIds.length} businesses from kaha-main-v3`);
      
      const response = await axios.post<BulkBusinessResponse>(
        `${this.kahaMainUrl}/main/api/v3/businesses/bulk`,
        { businessIds: uncachedIds },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        }
      );

      if (response.data && response.data.businesses) {
        // Cache the results
        for (const business of response.data.businesses) {
          const businessData: BusinessData = {
            ...business,
            _cacheTime: Date.now() // Add cache timestamp
          } as BusinessData & { _cacheTime: number };
          
          this.businessCache.set(business.id, businessData);
          cachedResults.set(business.id, businessData);
        }

        this.logger.log(`Successfully fetched and cached ${response.data.businesses.length} businesses`);
      }

      return cachedResults;
    } catch (error) {
      this.logger.error('Error fetching business data from kaha-main-v3:', error.message);
      
      // Return cached data even if API call fails
      return cachedResults;
    }
  }

  /**
   * Get single business data
   */
  async getBusinessData(businessId: string): Promise<BusinessData | null> {
    const results = await this.getBulkBusinessData([businessId]);
    return results.get(businessId) || null;
  }

  /**
   * Check if cached data is still valid
   */
  private isCacheValid(cachedData: any): boolean {
    return cachedData._cacheTime && (Date.now() - cachedData._cacheTime) < this.CACHE_TTL;
  }

  /**
   * Clear cache for specific business
   */
  clearBusinessCache(businessId: string): void {
    this.businessCache.delete(businessId);
    this.logger.debug(`Cleared cache for businessId: ${businessId}`);
  }

  /**
   * Clear all business cache
   */
  clearAllCache(): void {
    this.businessCache.clear();
    this.logger.log('Cleared all business cache');
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.businessCache.size,
      keys: Array.from(this.businessCache.keys())
    };
  }
}