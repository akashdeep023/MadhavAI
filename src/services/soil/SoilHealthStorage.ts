/**
 * Soil Health Storage Service
 * Local storage for soil health records with encryption
 * Requirements: 10.7
 */

import { logger } from '../../utils/logger';
import { SoilHealthData } from '../../types/soil.types';
import { encryptedStorage } from '../storage/EncryptedStorage';

class SoilHealthStorage {
  private readonly STORAGE_KEY_PREFIX = 'soil_health_';
  private readonly INDEX_KEY = 'soil_health_index';

  /**
   * Save soil health record
   */
  async saveSoilHealth(soilData: SoilHealthData): Promise<void> {
    try {
      logger.info(`Saving soil health record ${soilData.id}`);

      const key = this.getStorageKey(soilData.id);
      await encryptedStorage.setItem(key, JSON.stringify(soilData));

      // Update index
      await this.updateIndex(soilData.id, soilData.userId);

      logger.info('Soil health record saved successfully');
    } catch (error) {
      logger.error('Error saving soil health record', error);
      throw new Error('Failed to save soil health record');
    }
  }

  /**
   * Get soil health record by ID
   */
  async getSoilHealth(id: string): Promise<SoilHealthData | null> {
    try {
      logger.debug(`Retrieving soil health record ${id}`);

      const key = this.getStorageKey(id);
      const data = await encryptedStorage.getItem(key);

      if (!data) {
        logger.debug('Soil health record not found');
        return null;
      }

      const soilData = JSON.parse(data) as SoilHealthData;

      // Convert date strings back to Date objects
      soilData.testDate = new Date(soilData.testDate);
      soilData.createdAt = new Date(soilData.createdAt);
      soilData.updatedAt = new Date(soilData.updatedAt);

      return soilData;
    } catch (error) {
      logger.error('Error retrieving soil health record', error);
      return null;
    }
  }

  /**
   * Get all soil health records for a user
   */
  async getUserSoilHealthRecords(userId: string): Promise<SoilHealthData[]> {
    try {
      logger.debug(`Retrieving soil health records for user ${userId}`);

      const index = await this.getIndex();
      const userRecordIds = index[userId] || [];

      const records: SoilHealthData[] = [];

      for (const id of userRecordIds) {
        const record = await this.getSoilHealth(id);
        if (record) {
          records.push(record);
        }
      }

      // Sort by test date (most recent first)
      records.sort((a, b) => b.testDate.getTime() - a.testDate.getTime());

      logger.debug(`Found ${records.length} soil health records`);
      return records;
    } catch (error) {
      logger.error('Error retrieving user soil health records', error);
      return [];
    }
  }

  /**
   * Get most recent soil health record for a user
   */
  async getLatestSoilHealth(userId: string): Promise<SoilHealthData | null> {
    try {
      const records = await this.getUserSoilHealthRecords(userId);
      return records.length > 0 ? records[0] : null;
    } catch (error) {
      logger.error('Error retrieving latest soil health record', error);
      return null;
    }
  }

  /**
   * Update soil health record
   */
  async updateSoilHealth(soilData: SoilHealthData): Promise<void> {
    try {
      logger.info(`Updating soil health record ${soilData.id}`);

      soilData.updatedAt = new Date();
      await this.saveSoilHealth(soilData);

      logger.info('Soil health record updated successfully');
    } catch (error) {
      logger.error('Error updating soil health record', error);
      throw new Error('Failed to update soil health record');
    }
  }

  /**
   * Delete soil health record
   */
  async deleteSoilHealth(id: string, userId: string): Promise<void> {
    try {
      logger.info(`Deleting soil health record ${id}`);

      const key = this.getStorageKey(id);
      await encryptedStorage.removeItem(key);

      // Update index
      await this.removeFromIndex(id, userId);

      logger.info('Soil health record deleted successfully');
    } catch (error) {
      logger.error('Error deleting soil health record', error);
      throw new Error('Failed to delete soil health record');
    }
  }

  /**
   * Clear all soil health records for a user
   */
  async clearUserSoilHealthRecords(userId: string): Promise<void> {
    logger.info(`Clearing all soil health records for user ${userId}`);

    const records = await this.getUserSoilHealthRecords(userId);

    for (const record of records) {
      await this.deleteSoilHealth(record.id, userId);
    }

    logger.info('All soil health records cleared');
  }

  /**
   * Get storage key for soil health record
   */
  private getStorageKey(id: string): string {
    return `${this.STORAGE_KEY_PREFIX}${id}`;
  }

  /**
   * Get index of soil health records by user
   */
  private async getIndex(): Promise<Record<string, string[]>> {
    try {
      const data = await encryptedStorage.getItem(this.INDEX_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      logger.error('Error retrieving soil health index', error);
      return {};
    }
  }

  /**
   * Update index with new record
   */
  private async updateIndex(id: string, userId: string): Promise<void> {
    try {
      const index = await this.getIndex();

      if (!index[userId]) {
        index[userId] = [];
      }

      if (!index[userId].includes(id)) {
        index[userId].push(id);
      }

      await encryptedStorage.setItem(this.INDEX_KEY, JSON.stringify(index));
    } catch (error) {
      logger.error('Error updating soil health index', error);
      throw error;
    }
  }

  /**
   * Remove record from index
   */
  private async removeFromIndex(id: string, userId: string): Promise<void> {
    try {
      const index = await this.getIndex();

      if (index[userId]) {
        index[userId] = index[userId].filter((recordId) => recordId !== id);

        if (index[userId].length === 0) {
          delete index[userId];
        }

        await encryptedStorage.setItem(this.INDEX_KEY, JSON.stringify(index));
      }
    } catch (error) {
      logger.error('Error removing from soil health index', error);
      throw error;
    }
  }
}

export const soilHealthStorage = new SoilHealthStorage();
