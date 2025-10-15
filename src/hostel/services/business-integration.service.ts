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

    const results = new Map<string, BusinessData>();

    try {
      this.logger.debug(`Fetching business data for ${businessIds.length} businesses from kaha-main-v3`);
      
      const response = await axios.post<BulkBusinessResponse>(
        `${this.kahaMainUrl}/main/api/v3/businesses/bulk`,
        { businessIds },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 5000 // 5 second timeout
        }
      );
console.log("response", response.data)
      if (response.data && response.data.businesses) {
        for (const business of response.data.businesses) {
          results.set(business.id, business);
        }

        this.logger.log(`Successfully fetched ${response.data.businesses.length} businesses`);
      }

      return results;
    } catch (error) {
      this.logger.error('Error fetching business data from kaha-main-v3:', error.message);
      return results;
    }
  }

  /**
   * Get single business data
   */
  async getBusinessData(businessId: string): Promise<BusinessData | null> {
    const results = await this.getBulkBusinessData([businessId]);
    return results.get(businessId) || null;
  }
}