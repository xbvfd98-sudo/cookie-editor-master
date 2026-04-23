import { EventEmitter } from './eventEmitter.js';
import { GUID } from './guid.js';

/**
 * Storage key used to persist all saved account profiles.
 */
const STORAGE_KEY = 'accountProfiles';

/**
 * Handles saving, loading and deleting account profiles. An account profile
 * is a named snapshot of all cookies for a given domain. Users can save the
 * current session under a name, delete the current cookies without logging
 * out on the server, and later restore the saved cookies to switch between
 * accounts on the same site.
 */
export class ProfileHandler extends EventEmitter {
  /**
   * Constructs a ProfileHandler.
   * @param {GenericStorageHandler} storageHandler Storage backend used to
   *     persist the profiles.
   */
  constructor(storageHandler) {
    super();
    this.storageHandler = storageHandler;
  }

  /**
   * Returns the full profiles map, keyed by domain.
   * @return {Promise<object>} A map of { domain: { profileId: profile } }.
   */
  async getAllProfiles() {
    const data = await this.storageHandler.getLocal(STORAGE_KEY);
    if (!data || typeof data !== 'object') {
      return {};
    }
    return data;
  }

  /**
   * Returns the profiles saved for a given domain as an ordered array,
   * sorted by creation date (oldest first).
   * @param {string} domain Domain to list profiles for.
   * @return {Promise<Array<object>>} List of profiles for that domain.
   */
  async getProfilesForDomain(domain) {
    if (!domain) {
      return [];
    }
    const all = await this.getAllProfiles();
    const forDomain = all[domain] || {};
    return Object.values(forDomain).sort(
      (a, b) => (a.createdAt || 0) - (b.createdAt || 0)
    );
  }

  /**
   * Saves a new profile for a domain.
   * @param {string} domain Domain the profile belongs to.
   * @param {string} name User-facing name for the profile.
   * @param {Array<object>} cookies Cookies to store in the profile.
   * @return {Promise<object>} The profile that was saved.
   */
  async saveProfile(domain, name, cookies) {
    if (!domain) {
      throw new Error('A domain is required to save a profile.');
    }
    const trimmedName = (name || '').trim();
    if (!trimmedName) {
      throw new Error('A name is required to save a profile.');
    }

    const all = await this.getAllProfiles();
    const forDomain = all[domain] || {};

    const id = GUID.get();
    const now = Date.now();
    const profile = {
      id: id,
      name: trimmedName,
      domain: domain,
      createdAt: now,
      updatedAt: now,
      cookies: Array.isArray(cookies) ? cookies : [],
    };

    forDomain[id] = profile;
    all[domain] = forDomain;
    await this.storageHandler.setLocal(STORAGE_KEY, all);
    this.emit('profilesChanged', { domain: domain });
    return profile;
  }

  /**
   * Removes a profile from storage.
   * @param {string} domain Domain the profile belongs to.
   * @param {string} profileId Id of the profile to delete.
   * @return {Promise<boolean>} True if the profile existed and was removed.
   */
  async deleteProfile(domain, profileId) {
    if (!domain || !profileId) {
      return false;
    }
    const all = await this.getAllProfiles();
    const forDomain = all[domain];
    if (!forDomain || !forDomain[profileId]) {
      return false;
    }
    delete forDomain[profileId];
    if (Object.keys(forDomain).length === 0) {
      delete all[domain];
    } else {
      all[domain] = forDomain;
    }
    await this.storageHandler.setLocal(STORAGE_KEY, all);
    this.emit('profilesChanged', { domain: domain });
    return true;
  }

  /**
   * Looks up a profile by id.
   * @param {string} domain Domain the profile belongs to.
   * @param {string} profileId Id of the profile to look up.
   * @return {Promise<object|null>} The profile or null if not found.
   */
  async getProfile(domain, profileId) {
    if (!domain || !profileId) {
      return null;
    }
    const all = await this.getAllProfiles();
    const forDomain = all[domain];
    if (!forDomain || !forDomain[profileId]) {
      return null;
    }
    return forDomain[profileId];
  }

  /**
   * Renames an existing profile.
   * @param {string} domain Domain the profile belongs to.
   * @param {string} profileId Id of the profile to rename.
   * @param {string} newName New user-facing name.
   * @return {Promise<object|null>} The updated profile or null if not found.
   */
  async renameProfile(domain, profileId, newName) {
    const trimmedName = (newName || '').trim();
    if (!trimmedName) {
      throw new Error('A name is required to rename a profile.');
    }
    const all = await this.getAllProfiles();
    const forDomain = all[domain];
    if (!forDomain || !forDomain[profileId]) {
      return null;
    }
    forDomain[profileId].name = trimmedName;
    forDomain[profileId].updatedAt = Date.now();
    all[domain] = forDomain;
    await this.storageHandler.setLocal(STORAGE_KEY, all);
    this.emit('profilesChanged', { domain: domain });
    return forDomain[profileId];
  }
}
