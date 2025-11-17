import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

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
    this.kahaApiBaseUrl = this.configService.get<string>(
      'KAHA_API_BASE_URL',
      'https://dev.kaha.com.np/main/api/v3'
    );
  }

  /**
   * Get or create contact person (parent/guardian) using Kaha API
   * @param contact - Phone number or email
   * @returns userId from Kaha system
   */
  async getOrCreateContactPerson(contact: string): Promise<string> {
    this.logger.log(`Checking contact person: ${contact}`);

    try {
      const url = `${this.kahaApiBaseUrl}/users/check-contact/${encodeURIComponent(contact)}`;
      
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
   */
  async validateAndGetUserId(contactPerson: {
    name: string;
    phone: string;
    email: string;
  }): Promise<string> {
    // Try with phone first (more reliable identifier)
    try {
      return await this.getOrCreateContactPerson(contactPerson.phone);
    } catch (phoneError) {
      this.logger.warn(`Failed with phone, trying email: ${phoneError.message}`);
      
      // Fallback to email
      try {
        return await this.getOrCreateContactPerson(contactPerson.email);
      } catch (emailError) {
        this.logger.error(`Failed with both phone and email`);
        throw new BadRequestException(
          `Could not verify contact person. Please check phone number and email.`
        );
      }
    }
  }
}
