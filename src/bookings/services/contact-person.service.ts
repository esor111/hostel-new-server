import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { getExternalApiConfig, logApiConfig } from '../../config/environment.config';

export interface KahaUserResponse {
  id: string;
  kahaId: string;
  status: string;
  fullName: string;
  email: string;
  contactNumber: string;
  avatar: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  role: string;
  createdAt: string;
  hasPassword: boolean;
}

@Injectable()
export class ContactPersonService {
  private readonly logger = new Logger(ContactPersonService.name);
  private readonly kahaApiBaseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    // Get URLs from centralized config
    const apiConfig = getExternalApiConfig(this.configService);
    this.kahaApiBaseUrl = apiConfig.kahaMainApiUrl;
    logApiConfig('ContactPersonService', apiConfig);
  }

  /**
   * Get or create contact person (parent/guardian) using Kaha API
   * @param contact - Phone number or email
   * @param email - Optional email (for user creation)
   * @param name - Optional name (for user creation)
   * @param businessId - Optional businessId for hostel context
   * @returns userId from Kaha system
   */
  async getOrCreateContactPerson(
    contact: string,
    email?: string,
    name?: string,
    businessId?: string
  ): Promise<string> {
    this.logger.log(`Finding or creating contact person: ${contact}`);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (email) params.append('email', email);
      if (name) params.append('name', name);
      if (businessId) params.append('businessId', businessId);
      
      const queryString = params.toString();
      const url = `${this.kahaApiBaseUrl}/users/find-or-create/${encodeURIComponent(contact)}${queryString ? '?' + queryString : ''}`;
      
      this.logger.log(`🌐 API URL: ${url}`);
      
      const response = await firstValueFrom(
        this.httpService.get<KahaUserResponse>(url)
      );

      if (response.data && response.data.id) {
        this.logger.log(`✅ Contact person found/created: userId=${response.data.id}`);
        return response.data.id;
      }

      throw new Error('Invalid response from user service');
    } catch (error) {
      this.logger.error(`❌ Failed to get/create contact person: ${error.message}`);
      
      if (error.response?.status === 404) {
        throw new BadRequestException(`Contact ${contact} not found and could not be created`);
      }
      
      throw new BadRequestException(`Failed to verify contact person: ${error.message}`);
    }
  }

  /**
   * Validate contact person details
   * Returns userId from Kaha system
   * @param contactPerson - Contact person details
   * @param businessId - Optional businessId for hostel context
   */
  async validateAndGetUserId(
    contactPerson: {
      name: string;
      phone: string;
      email: string;
    },
    businessId?: string
  ): Promise<string> {
    // Try with phone first (more reliable identifier)
    // Pass all parameters for user creation if not found
    try {
      return await this.getOrCreateContactPerson(
        contactPerson.phone,
        contactPerson.email,
        contactPerson.name,
        businessId
      );
    } catch (phoneError) {
      this.logger.warn(`Failed with phone, trying email: ${phoneError.message}`);
      
      // Fallback to email
      try {
        return await this.getOrCreateContactPerson(
          contactPerson.email,
          contactPerson.email,
          contactPerson.name,
          businessId
        );
      } catch (emailError) {
        this.logger.error(`Failed with both phone and email`);
        throw new BadRequestException(
          `Could not verify contact person. Please check phone number and email.`
        );
      }
    }
  }

}
