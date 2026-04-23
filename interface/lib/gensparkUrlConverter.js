/**
 * Handles detection and conversion of Genspark conversation URLs.
 *
 * Recognized URL patterns on www.genspark.ai:
 *   /agents?id=<ID>
 *   /autopilotagent_viewer?id=<ID>
 *   /api/continue_conversation?id=<ID>
 *
 * The converter extracts the conversation ID and produces the
 * continue_conversation URL, which is the last reusable form
 * before a brand-new conversation ID is generated.
 */
export class GensparkUrlConverter {
  /**
   * Host that all recognized URLs must belong to.
   * @type {string}
   */
  static HOST = 'www.genspark.ai';

  /**
   * Path segments that carry a conversation ID.
   * @type {string[]}
   */
  static KNOWN_PATHS = [
    '/agents',
    '/autopilotagent_viewer',
    '/api/continue_conversation',
  ];

  /**
   * Checks whether a URL belongs to Genspark and contains
   * a conversation ID.
   * @param {string} url The URL to test.
   * @return {boolean} true when the URL is a recognized Genspark
   *     conversation URL.
   */
  static isGensparkConversationUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.hostname !== GensparkUrlConverter.HOST) {
        return false;
      }
      if (!GensparkUrlConverter.KNOWN_PATHS.includes(parsed.pathname)) {
        return false;
      }
      const id = parsed.searchParams.get('id');
      return typeof id === 'string' && id.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Extracts the conversation ID from a Genspark URL.
   * @param {string} url A Genspark conversation URL.
   * @return {string|null} The conversation ID, or null if the URL
   *     is not recognized.
   */
  static extractId(url) {
    if (!GensparkUrlConverter.isGensparkConversationUrl(url)) {
      return null;
    }
    return new URL(url).searchParams.get('id');
  }

  /**
   * Converts any recognized Genspark conversation URL into the
   * continue_conversation form.
   * @param {string} url A Genspark conversation URL in any known format.
   * @return {string|null} The continue_conversation URL, or null if the
   *     input is not a recognized Genspark URL.
   */
  static toContinueConversationUrl(url) {
    const id = GensparkUrlConverter.extractId(url);
    if (id === null) {
      return null;
    }
    return `https://${GensparkUrlConverter.HOST}/api/continue_conversation?id=${encodeURIComponent(id)}`;
  }

  /**
   * Builds a continue_conversation URL directly from a conversation ID.
   * @param {string} id The conversation ID.
   * @return {string} The continue_conversation URL.
   */
  static buildContinueUrl(id) {
    return `https://${GensparkUrlConverter.HOST}/api/continue_conversation?id=${encodeURIComponent(id)}`;
  }

  /**
   * Holds the last converted continue_conversation URL so it can be
   * carried across account switches happening in the same tab.
   * @type {string|null}
   * @private
   */
  static _storedUrl = null;

  /**
   * Converts the given URL (if recognized) and stores the result
   * for later retrieval.
   * @param {string} url The current tab URL.
   * @return {string|null} The stored continue_conversation URL,
   *     or null if the URL was not recognized.
   */
  static captureAndStore(url) {
    const continueUrl = GensparkUrlConverter.toContinueConversationUrl(url);
    if (continueUrl !== null) {
      GensparkUrlConverter._storedUrl = continueUrl;
    }
    return GensparkUrlConverter._storedUrl;
  }

  /**
   * Returns the previously stored continue_conversation URL.
   * @return {string|null} The stored URL, or null if nothing
   *     has been captured yet.
   */
  static getStoredUrl() {
    return GensparkUrlConverter._storedUrl;
  }

  /**
   * Clears the stored URL.
   */
  static clearStoredUrl() {
    GensparkUrlConverter._storedUrl = null;
  }
}
