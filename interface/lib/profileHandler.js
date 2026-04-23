import { GUID } from './guid.js';

/**
 * Handles saving, loading, and deleting cookie profiles (account sessions).
 * Profiles are stored per-domain in chrome.storage.local under
 * the key 'accountProfiles'.
 */
export class ProfileHandler {
  /**
   * Constructs a ProfileHandler.
   * @param {GenericStorageHandler} storageHandler
   */
  constructor(storageHandler) {
    this.storageHandler = storageHandler;
    this.storageKey = 'accountProfiles';
  }

  /**
   * Returns all stored profiles grouped by domain.
   * @return {Promise<object>}
   */
  async getAllProfiles() {
    const data = await this.storageHandler.getLocal(this.storageKey);
    return data || {};
  }

  /**
   * Returns profiles for a specific domain.
   * @param {string} domain
   * @return {Promise<object>}
   */
  async getProfilesForDomain(domain) {
    const all = await this.getAllProfiles();
    return all[domain] || {};
  }

  /**
   * Saves a new profile for the given domain.
   * @param {string} domain
   * @param {string} name Display name for the profile.
   * @param {Array} cookies Array of cookie objects to store.
   * @return {Promise<string>} The generated profile id.
   */
  async saveProfile(domain, name, cookies) {
    const all = await this.getAllProfiles();
    if (!all[domain]) {
      all[domain] = {};
    }

    const id = GUID.get();
    all[domain][id] = {
      name: name,
      domain: domain,
      createdAt: Date.now(),
      cookies: cookies,
    };

    await this.storageHandler.setLocal(this.storageKey, all);
    return id;
  }

  /**
   * Deletes a profile from storage.
   * @param {string} domain
   * @param {string} profileId
   * @return {Promise<void>}
   */
  async deleteProfile(domain, profileId) {
    const all = await this.getAllProfiles();
    if (all[domain]) {
      delete all[domain][profileId];
      if (Object.keys(all[domain]).length === 0) {
        delete all[domain];
      }
      await this.storageHandler.setLocal(this.storageKey, all);
    }
  }

  /**
   * Returns a single profile by domain and id.
   * @param {string} domain
   * @param {string} profileId
   * @return {Promise<object|null>}
   */
  async getProfile(domain, profileId) {
    const profiles = await this.getProfilesForDomain(domain);
    return profiles[profileId] || null;
  }
}
